package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test suite for line number calculation in RuleValidationService
 * Tests the optional line number feature with various JSON formats
 */
class RuleValidationLineNumberTest {

    private RuleValidationService validationService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws IOException {
        XUISemanticValidator xuiValidator = new XUISemanticValidator();
        validationService = new RuleValidationService(xuiValidator);
        objectMapper = new ObjectMapper();
    }

    // ==================== LINE NUMBER CALCULATION TESTS ====================

    @Test
    @DisplayName("Line numbers should be null when not requested")
    void testLineNumbers_NotRequested() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "string",
              "ruleType": "Reporting",
              "uuid": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // Without line number calculation, lineNumber should be null
        assertTrue(result.getErrorCount() > 0);
        for (ValidationError error : result.getErrors()) {
            assertNull(error.getLineNumber(), "Line number should be null when not calculated");
        }
    }

    @Test
    @DisplayName("Line number for root-level field error (structure)")
    void testLineNumber_RootField() throws IOException {
        String json = """
            {
              "structure": "invalid",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {}
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // "structure" is on line 2
        assertTrue(result.getErrorCount() > 0);
        ValidationError structureError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.structure"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(structureError, "Should find structure error");
        assertEquals(2, structureError.getLineNumber(), "structure field is on line 2");
    }

    @Test
    @DisplayName("Line number for nested field error (metadata.id)")
    void testLineNumber_NestedField() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "description": "Test"
              },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // Error is for missing "id" inside "metadata" object which starts on line 7
        assertTrue(result.getErrorCount() > 0);
        ValidationError metadataError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.metadata"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(metadataError, "Should find metadata.id error");
        assertEquals(7, metadataError.getLineNumber(), "metadata object starts on line 7");
    }

    @Test
    @DisplayName("Line number for deeply nested field error (definition.field)")
    void testLineNumber_DeeplyNested() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "field",
                "returnType": "number",
                "field": "invalid.lowercase"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // "field" with invalid pattern is on line 14
        assertTrue(result.getErrorCount() > 0);
        ValidationError fieldError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.definition.field"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(fieldError, "Should find field pattern error");
        assertEquals(14, fieldError.getLineNumber(), "field is on line 14");
    }

    @Test
    @DisplayName("Line number for array element error")
    void testLineNumber_ArrayElement() throws IOException {
        String json = """
            {
              "structure": "case",
              "returnType": "text",
              "ruleType": "Transformation",
              "uuid": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "whenClauses": [
                  {
                    "when": {
                      "type": "conditionGroup",
                      "returnType": "boolean",
                      "name": "Test",
                      "conjunction": "INVALID",
                      "not": false,
                      "conditions": []
                    },
                    "then": {
                      "type": "value",
                      "returnType": "text",
                      "value": "Result"
                    }
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // Invalid "conjunction" value is on line 18
        assertTrue(result.getErrorCount() > 0);
        
        ValidationError conjunctionError = result.getErrors().stream()
            .filter(err -> (err.getPath() != null && err.getPath().contains("conjunction")) ||
                          (err.getMessage() != null && err.getMessage().contains("conjunction")))
            .findFirst()
            .orElse(null);
        
        assertNotNull(conjunctionError, "Should find conjunction error");
        assertEquals(18, conjunctionError.getLineNumber(), "conjunction is on line 18");
    }

    @Test
    @DisplayName("Multiple errors should each have correct line numbers")
    void testLineNumber_MultipleErrors() throws IOException {
        String json = """
            {
              "structure": "invalid",
              "returnType": "string",
              "ruleType": "InvalidType",
              "uuid": "not-a-uuid",
              "version": "not-a-number",
              "metadata": {
                "description": "Missing id"
              },
              "definition": {}
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // Should have multiple errors on different lines
        assertTrue(result.getErrorCount() >= 4);
        
        // structure error on line 2
        ValidationError structureError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.structure"))
            .findFirst()
            .orElse(null);
        if (structureError != null) {
            assertEquals(2, structureError.getLineNumber(), "structure on line 2");
        }
        
        // returnType error on line 3
        ValidationError returnTypeError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.returnType"))
            .findFirst()
            .orElse(null);
        if (returnTypeError != null) {
            assertEquals(3, returnTypeError.getLineNumber(), "returnType on line 3");
        }
        
        // uuid error on line 5
        ValidationError uuidError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.uuid"))
            .findFirst()
            .orElse(null);
        if (uuidError != null) {
            assertEquals(5, uuidError.getLineNumber(), "uuid on line 5");
        }
        
        // version error on line 6
        ValidationError versionError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.version"))
            .findFirst()
            .orElse(null);
        if (versionError != null) {
            assertEquals(6, versionError.getLineNumber(), "version on line 6");
        }
    }

    @Test
    @DisplayName("Compact JSON should still calculate line numbers")
    void testLineNumber_CompactJson() throws IOException {
        String json = "{\"structure\":\"invalid\",\"returnType\":\"number\",\"ruleType\":\"Reporting\",\"uuid\":\"12345678-1234-1234-1234-123456789012\",\"version\":1,\"metadata\":{\"id\":\"TEST\",\"description\":\"Test\"},\"definition\":{}}";

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // In compact JSON, everything is on line 1
        assertTrue(result.getErrorCount() > 0);
        for (ValidationError error : result.getErrors()) {
            assertEquals(1, error.getLineNumber(), "All errors in compact JSON are on line 1");
        }
    }

    @Test
    @DisplayName("Irregular JSON with mixed spacing should calculate line numbers correctly")
    void testLineNumber_IrregularSpacing() throws IOException {
        String json = """
            {
              "structure": "expression",
                "returnType": "string",
            "ruleType": "Reporting",
              "uuid": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // returnType is on line 3
        assertTrue(result.getErrorCount() > 0);
        ValidationError returnTypeError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.returnType"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(returnTypeError, "Should find returnType error");
        assertEquals(3, returnTypeError.getLineNumber(), "returnType is on line 3");
    }

    @Test
    @DisplayName("Partial compact JSON should calculate line numbers correctly")
    void testLineNumber_PartialCompact() throws IOException {
        String json = """
            { "structure": "expression",
              "returnType": "string", "ruleType": "Reporting",
              "uuid": "12345678-1234-1234-1234-123456789012", "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": { "type": "value", "returnType": "number", "value": 1 }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // returnType is on line 2 (same line as structure, but algorithm should find it)
        assertTrue(result.getErrorCount() > 0);
        ValidationError returnTypeError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.returnType"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(returnTypeError, "Should find returnType error");
        assertEquals(2, returnTypeError.getLineNumber(), "returnType is on line 2");
    }

    @Test
    @DisplayName("JSON with extra whitespace and blank lines should calculate line numbers correctly")
    void testLineNumber_ExtraWhitespace() throws IOException {
        String json = """
            {
              "structure"    :    "expression"   ,
              
              "returnType"   :   "string"  ,
              "ruleType": "Reporting",
              "uuid": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // returnType is on line 4 (skipping blank line 3)
        assertTrue(result.getErrorCount() > 0);
        ValidationError returnTypeError = result.getErrors().stream()
            .filter(err -> err.getPath().equals("$.returnType"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(returnTypeError, "Should find returnType error");
        assertEquals(4, returnTypeError.getLineNumber(), "returnType is on line 4");
    }

    @Test
    @DisplayName("Line numbers should be accurate for errors in deeply nested arrays")
    void testLineNumber_DeeplyNestedArray() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuid": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "conditionGroup",
                "returnType": "boolean",
                "name": "Group",
                "conjunction": "AND",
                "not": false,
                "conditions": [
                  {
                    "type": "condition",
                    "returnType": "boolean",
                    "name": "Test",
                    "left": {
                      "type": "field",
                      "returnType": "number",
                      "field": "invalid.lowercase"
                    },
                    "operator": "equal",
                    "right": {
                      "type": "value",
                      "returnType": "number",
                      "value": 1
                    }
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // field is on line 25
        assertTrue(result.getErrorCount() > 0);
        ValidationError fieldError = result.getErrors().stream()
            .filter(err -> err.getPath().contains("field") && err.getType().equals("pattern"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(fieldError, "Should find field pattern error");
        assertEquals(25, fieldError.getLineNumber(), "field is on line 25");
    }

    @Test
    @DisplayName("Line number for root-level additionalProperties error")
    void testLineNumber_RootLevelAdditionalProperty() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "uuid": "5375b666-a80b-434b-b754-8e8abbcd8c5d",
              "version": 1,
              "rul3eType": "Reporting",
              "metadata": {
                "id": "TEST",
                "description": "Test"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // rul3eType (typo) is on line 6
        assertTrue(result.getErrorCount() > 0);
        ValidationError error = result.getErrors().stream()
            .filter(err -> err.getMessage().contains("rul3eType"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(error, "Should find rul3eType additionalProperties error");
        assertEquals("additionalProperties", error.getType(), "Should be additionalProperties error");
        assertEquals(6, error.getLineNumber(), "rul3eType is on line 6");
    }
}
