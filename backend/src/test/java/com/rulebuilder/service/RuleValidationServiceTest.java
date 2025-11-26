package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test suite for RuleValidationService
 * Tests raw JSON Schema validation output before any transformations
 */
class RuleValidationServiceTest {

    private RuleValidationService validationService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws IOException {
        XUISemanticValidator xuiValidator = new XUISemanticValidator();
        validationService = new RuleValidationService(xuiValidator);
        objectMapper = new ObjectMapper();
    }

    // ==================== VALID RULES ====================

    @Test
    @DisplayName("Valid simple expression rule should have zero errors")
    void testValidSimpleExpression() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "SIMPLE_EXPR",
                "description": "A simple expression"
              },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 42
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // Assertions
        assertNotNull(result);
        assertEquals("rule-schema-current.json", result.getSchemaFilename());
        assertEquals("2.0.3", result.getSchemaVersion());
        assertEquals(0, result.getErrorCount());
        assertTrue(result.getErrors().isEmpty());
    }

    @Test
    @DisplayName("Valid condition rule should have zero errors")
    void testValidCondition() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "SIMPLE_CONDITION",
                "description": "A simple condition"
              },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Check Age",
                "id": "cond1",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "PERSON.AGE"
                },
                "operator": "greater",
                "right": {
                  "type": "value",
                  "returnType": "number",
                  "value": 18
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount());
        assertTrue(result.getErrors().isEmpty());
    }

    @Test
    @DisplayName("Valid case rule should have zero errors")
    void testValidCase() throws IOException {
        String json = """
            {
              "structure": "case",
              "returnType": "text",
              "ruleType": "Transformation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "AGE_CATEGORY",
                "description": "Categorize by age"
              },
              "definition": {
                "whenClauses": [
                  {
                    "when": {
                      "type": "conditionGroup",
                      "returnType": "boolean",
                      "name": "Child",
                      "conjunction": "AND",
                      "not": false,
                      "conditions": [
                        {
                          "type": "condition",
                          "returnType": "boolean",
                          "name": "Age check",
                          "left": {
                            "type": "field",
                            "returnType": "number",
                            "field": "PERSON.AGE"
                          },
                          "operator": "less",
                          "right": {
                            "type": "value",
                            "returnType": "number",
                            "value": 18
                          }
                        }
                      ]
                    },
                    "then": {
                      "type": "value",
                      "returnType": "text",
                      "value": "Child"
                    }
                  }
                ],
                "elseClause": {
                  "type": "value",
                  "returnType": "text",
                  "value": "Adult"
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount());
        assertTrue(result.getErrors().isEmpty());
    }

    // ==================== MISSING REQUIRED FIELDS ====================

    @Test
    @DisplayName("Missing required field 'structure' should produce error")
    void testMissingStructure() throws IOException {
        String json = """
            {
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {}
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertTrue(result.getErrorCount() > 0);
        
        // Check for required field error
        boolean hasRequiredError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("required") && 
                           err.getMessage().contains("structure"));
        assertTrue(hasRequiredError, "Should have 'required' error for 'structure' field");
    }

    @Test
    @DisplayName("Missing required field 'uuId' should produce error")
    void testMissingUuid() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
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

        assertTrue(result.getErrorCount() > 0);
        boolean hasUuidError = result.getErrors().stream()
            .anyMatch(err -> err.getMessage().toLowerCase().contains("uuid"));
        assertTrue(hasUuidError);
    }

    @Test
    @DisplayName("Missing metadata.id should produce error")
    void testMissingMetadataId() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
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
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasIdError = result.getErrors().stream()
            .anyMatch(err -> err.getPath().contains("metadata") && 
                           err.getMessage().contains("id"));
        assertTrue(hasIdError);
    }

    // ==================== INVALID ENUM VALUES ====================

    @Test
    @DisplayName("Invalid structure value should produce enum error")
    void testInvalidStructure() throws IOException {
        String json = """
            {
              "structure": "invalid_structure",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {}
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasEnumError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("enum") && 
                           err.getPath().contains("structure"));
        assertTrue(hasEnumError, "Should have enum error for invalid structure");
    }

    @Test
    @DisplayName("Invalid returnType should produce enum error")
    void testInvalidReturnType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "string",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
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

        assertTrue(result.getErrorCount() > 0);
        boolean hasEnumError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("enum") && 
                           err.getMessage().contains("returnType"));
        assertTrue(hasEnumError);
    }

    @Test
    @DisplayName("Invalid ruleType should produce enum error")
    void testInvalidRuleType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "InvalidType",
              "uuId": "12345678-1234-1234-1234-123456789012",
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

        assertTrue(result.getErrorCount() > 0);
        boolean hasEnumError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("enum"));
        assertTrue(hasEnumError);
    }

    // ==================== INVALID TYPE ====================

    @Test
    @DisplayName("Wrong type for version (string instead of integer) should produce type error")
    void testInvalidVersionType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": "1",
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

        assertTrue(result.getErrorCount() > 0);
        boolean hasTypeError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("type") && 
                           err.getPath().contains("version"));
        assertTrue(hasTypeError);
    }

    @Test
    @DisplayName("Wrong type for metadata (array instead of object) should produce type error")
    void testInvalidMetadataType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": ["invalid"],
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasTypeError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("type"));
        assertTrue(hasTypeError);
    }

    // ==================== PATTERN VIOLATIONS ====================

    @Test
    @DisplayName("Invalid UUID pattern should produce pattern error")
    void testInvalidUuidPattern() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "not-a-valid-uuid",
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

        assertTrue(result.getErrorCount() > 0);
        boolean hasPatternError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("pattern") && 
                           err.getPath().contains("uuId"));
        assertTrue(hasPatternError);
    }

    @Test
    @DisplayName("Invalid field pattern should produce pattern error")
    void testInvalidFieldPattern() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "field",
                "returnType": "number",
                "field": "invalid.lowercase.field"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasPatternError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("pattern") && 
                           err.getMessage().contains("field"));
        assertTrue(hasPatternError);
    }

    // ==================== ONEOF ERRORS ====================

    @Test
    @DisplayName("Expression with wrong type value should produce oneOf errors")
    void testOneOfError_WrongExpressionType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "invalid_type",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        
        // With cascade filtering enabled, should have root cause error about the invalid type
        // Could be enum, const, or additionalProperties depending on filtering logic
        boolean hasRootCauseError = result.getErrors().stream()
            .anyMatch(err -> "enum".equals(err.getType()) || 
                           "const".equals(err.getType()) ||
                           "additionalProperties".equals(err.getType()));
        assertTrue(hasRootCauseError, "Should have root cause error for invalid type value");
        
        // Error count should be small (1-3) due to cascade filtering
        assertTrue(result.getErrorCount() <= 3, 
            "Should have few errors after cascade filtering, got " + result.getErrorCount());
    }

    @Test
    @DisplayName("Definition with missing required field for type should produce oneOf cascade")
    void testOneOfError_MissingRequiredFieldForType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "value",
                "returnType": "number"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        
        // Should have errors about missing 'value' field
        boolean hasMissingValueError = result.getErrors().stream()
            .anyMatch(err -> err.getMessage().contains("value"));
        assertTrue(hasMissingValueError);
    }

    // ==================== ADDITIONAL PROPERTIES ====================

    @Test
    @DisplayName("Additional unknown property at root should produce error")
    void testAdditionalProperty() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              },
              "unknownField": "should not be here"
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasAdditionalPropError = result.getErrors().stream()
            .anyMatch(err -> err.getMessage().contains("additional") || 
                           err.getMessage().contains("unknownField"));
        assertTrue(hasAdditionalPropError);
    }

    // ==================== ARRAY CONSTRAINTS ====================

    @Test
    @DisplayName("Empty whenClauses array should produce minItems error")
    void testMinItemsViolation() throws IOException {
        String json = """
            {
              "structure": "case",
              "returnType": "text",
              "ruleType": "Transformation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "whenClauses": []
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasMinItemsError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("minItems") || 
                           err.getMessage().contains("minItems"));
        assertTrue(hasMinItemsError);
    }

    @Test
    @DisplayName("ExpressionGroup with only one expression should produce minItems error")
    void testExpressionGroupMinItems() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "expressionGroup",
                "returnType": "number",
                "expressions": [
                  {
                    "type": "value",
                    "returnType": "number",
                    "value": 1
                  }
                ],
                "operators": []
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, true); // Disable filtering to see all errors including minItems

        assertTrue(result.getErrorCount() > 0);
        boolean hasMinItemsError = result.getErrors().stream()
            .anyMatch(err -> err.getMessage().contains("minItems") || 
                           err.getMessage().contains("minimum"));
        assertTrue(hasMinItemsError);
    }

    // ==================== COMPLEX NESTED STRUCTURE ====================

    @Test
    @DisplayName("Multiple errors in nested structure should all be reported")
    void testMultipleErrorsInNestedStructure() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "conditionGroup",
                "returnType": "boolean",
                "name": "Test Group",
                "conjunction": "INVALID",
                "not": false,
                "conditions": [
                  {
                    "type": "condition",
                    "returnType": "boolean",
                    "name": "Test",
                    "left": {
                      "type": "value",
                      "returnType": "number"
                    },
                    "operator": "equal",
                    "right": {
                      "type": "invalid_type",
                      "returnType": "number",
                      "value": 1
                    }
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // Should have multiple errors:
        // 1. Invalid conjunction value
        // 2. Missing 'value' in left expression
        // 3. Invalid type in right expression
        assertTrue(result.getErrorCount() >= 3, 
            "Should have at least 3 errors for multiple issues");
    }

    // ==================== UTILITY TESTS ====================

    @Test
    @DisplayName("ValidationResult should contain all required metadata")
    void testValidationResultMetadata() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
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

        // Check all required metadata fields
        assertNotNull(result.getSchemaFilename());
        assertNotNull(result.getSchemaVersion());
        assertNotNull(result.getErrorCount());
        assertNotNull(result.getErrors());
        
        assertEquals("rule-schema-current.json", result.getSchemaFilename());
        assertEquals("2.0.3", result.getSchemaVersion());
    }

    @Test
    @DisplayName("ValidationError should contain all ValidationMessage properties")
    void testValidationErrorStructure() throws IOException {
        String json = """
            {
              "structure": "invalid",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {}
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        
        // Check first error has all expected properties
        ValidationError error = result.getErrors().get(0);
        assertNotNull(error.getType(), "Error should have type");
        assertNotNull(error.getCode(), "Error should have code");
        assertNotNull(error.getMessage(), "Error should have message");
        // path, schemaPath, arguments may be null for some errors
    }

}
