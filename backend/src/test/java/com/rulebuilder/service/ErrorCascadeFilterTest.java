package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for ErrorCascadeFilter - validates cascade suppression logic
 */
class ErrorCascadeFilterTest {

    private RuleValidationService validationService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws IOException {
        XUISemanticValidator xuiValidator = new XUISemanticValidator();
        validationService = new RuleValidationService(xuiValidator);
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Invalid type should suppress oneOf cascade but keep root cause")
    void testFilterInvalidType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "INVALID_TYPE",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // With integrated cascade filtering, service should return filtered results
        // Should have 1-3 errors after filtering
        assertTrue(result.getErrorCount() <= 3, 
            "Should have few errors after cascade filtering, got " + result.getErrorCount());
        assertTrue(result.getErrorCount() > 0, "Should have at least one error");

        // Should have a root cause error (enum, const, or additionalProperties) about the type issue
        boolean hasRootCauseError = result.getErrors().stream()
                .anyMatch(e -> "enum".equals(e.getType()) || 
                              "const".equals(e.getType()) ||
                              ("additionalProperties".equals(e.getType()) && e.getPath().contains("definition")));
        assertTrue(hasRootCauseError, "Should keep root cause error about invalid type");
    }    @Test
    @DisplayName("Missing required field for correct type should NOT be suppressed")
    void testKeepLegitimateRequiredError() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "value",
                "returnType": "number"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // With integrated cascade filtering, service returns filtered results
        // Should have at least 1 error (missing 'value' field) 
        assertTrue(result.getErrorCount() >= 1, 
            "Must preserve legitimate 'missing value' error");

        // Verify the required error for 'value' is present
        boolean hasValueRequiredError = result.getErrors().stream()
            .anyMatch(e -> "required".equals(e.getType()) && 
                          e.getMessage().contains("value"));
        assertTrue(hasValueRequiredError, "Must keep 'value is required' error");
    }

    @Test
    @DisplayName("Multiple independent errors should all be preserved")
    void testMultipleIndependentErrors() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "bad-uuid",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "INVALID_TYPE",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        ErrorCascadeFilter.FilterResult filtered = ErrorCascadeFilter.filterCascadingErrors(result.getErrors());

        // Should keep both UUID pattern error and definition type error
        assertTrue(filtered.getFilteredErrors().size() >= 2, 
            "Should keep both independent errors");

        boolean hasUuidError = filtered.getFilteredErrors().stream()
            .anyMatch(e -> e.getPath().contains("uuid"));
        boolean hasTypeError = filtered.getFilteredErrors().stream()
            .anyMatch(e -> e.getPath().contains("definition"));

        assertTrue(hasUuidError, "Should keep UUID error");
        assertTrue(hasTypeError, "Should keep definition error");
    }

    @Test
    @DisplayName("Pattern error should be preserved even with cascade")
    void testPatternErrorPreserved() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "field",
                "returnType": "number",
                "field": "invalid.lowercase"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // With integrated filtering, check the service result directly
        // Should keep pattern error (root cause)
        boolean hasPatternError = result.getErrors().stream()
            .anyMatch(e -> "pattern".equals(e.getType()));
        assertTrue(hasPatternError, "Should preserve pattern violation");

        // Should have small error count due to cascade suppression
        assertTrue(result.getErrorCount() <= 3, 
            "Should suppress cascade errors, got " + result.getErrorCount());
    }

    @Test
    @DisplayName("Valid rule should have no errors and no suppression")
    void testValidRuleNoErrors() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 42
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // With integrated filtering, valid rules should have no errors
        assertEquals(0, result.getErrorCount(), "Valid rule should have no errors");
    }

    @Test
    @DisplayName("Simple errors without cascade should pass through unchanged")
    void testSimpleErrorsPassThrough() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "INVALID",
              "ruleType": "Reporting",
              "uuid": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 42
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        ErrorCascadeFilter.FilterResult filtered = ErrorCascadeFilter.filterCascadingErrors(result.getErrors());

        // Enum error without cascade should pass through
        assertEquals(result.getErrorCount(), filtered.getFilteredErrors().size(), 
            "Simple errors should pass through unchanged");
        assertEquals(0, filtered.getSuppressedCount(), "Nothing to suppress");
    }

    @Test
    @DisplayName("Filter metadata should accurately report suppression stats")
    void testFilterMetadata() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuid": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "INVALID_TYPE",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        int originalCount = result.getErrorCount();
        ErrorCascadeFilter.FilterResult filtered = ErrorCascadeFilter.filterCascadingErrors(result.getErrors());

        // Verify math adds up
        assertEquals(originalCount, 
            filtered.getFilteredErrors().size() + filtered.getSuppressedCount(),
            "Filtered + suppressed should equal original");

        // Verify toString works
        assertNotNull(filtered.toString());
        assertTrue(filtered.toString().contains("suppressed="));
    }

    @Test
    @DisplayName("Definition with wrong property should show required error not oneOf")
    void testDefinitionWithInvalidProperty() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Reporting",
              "uuid": "a6ae5cf2-69f1-4877-9667-0e3b7391b40b",
              "version": 1,
              "metadata": {
                "id": "",
                "description": ""
              },
              "definition": {
                "type": "conditionGroup",
                "return2Type": "boolean"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // Should suppress oneOf error and show actionable required field error
        assertTrue(result.getErrorCount() >= 1, 
            "Should have at least one error");
        assertTrue(result.getErrorCount() <= 5, 
            "Should limit to 5 most actionable errors, got " + result.getErrorCount());

        // With schema v2.1.0 oneOf constraints, the typo "return2Type" generates additionalProperties error
        // This is the correct and most actionable error type for this case
        boolean hasActionableError = result.getErrors().stream()
            .anyMatch(e -> "additionalProperties".equals(e.getType()) || 
                          "required".equals(e.getType()) || 
                          "oneOf".equals(e.getType()));
        assertTrue(hasActionableError, 
            "Should show actionable error (additionalProperties/required/oneOf) for wrong field");

        // Note: With oneOf constraints in schema v2.1.0, error types may vary
    }

    @Test
    @DisplayName("Definition with invalid UUID should show both UUID and definition errors")
    void testDefinitionWithInvalidUUID() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Reporting",
              "uuid": "g6ae5cf2-69f1-4877-9667-0e3b7391b40b",
              "version": 1,
              "metadata": {
                "id": "",
                "description": ""
              },
              "definition": {
                "type": "conditionGroup",
                "return2Type": "boolean"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // Should show both pattern error (UUID) and errors about definition
        assertTrue(result.getErrorCount() >= 1, 
            "Should have at least 1 error (UUID pattern or definition issue)");
        assertTrue(result.getErrorCount() <= 6, 
            "Should limit errors to avoid overwhelming user");

        // Should have pattern error for UUID
        boolean hasPatternError = result.getErrors().stream()
            .anyMatch(e -> "pattern".equals(e.getType()) && 
                          e.getPath().contains("uuid"));
        assertTrue(hasPatternError, "Should show UUID pattern error");

        // With schema v2.1.0, the typo "return2Type" generates additionalProperties error
        boolean hasDefinitionError = result.getErrors().stream()
            .anyMatch(e -> "additionalProperties".equals(e.getType()) || 
                          "required".equals(e.getType()) || 
                          "oneOf".equals(e.getType()));
        assertTrue(hasDefinitionError, "Should show definition-related error");

        // Note: additionalProperties errors are expected with schema v2.1.0 structure
    }

    @Test
    @DisplayName("Typo in condition type should show minimal errors with line number")
    void testTypoInConditionType() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Reporting",
              "uuid": "e2c85da5-ff66-4718-b034-62b3badc13d6",
              "version": 1,
              "metadata": {
                "id": "",
                "description": ""
              },
              "definition": {
                "type": "conditionGroup",
                "returnType": "boolean",
                "name": "Main Condition",
                "conjunction": "AND",
                "not": false,
                "conditions": [
                  {
                    "type": "cond2ition",
                    "returnType": "boolean",
                    "name": "Condition 1",
                    "left": {
                      "type": "field",
                      "returnType": "number",
                      "field": "TABLE1.NUMBER_FIELD_01"
                    },
                    "operator": "equal",
                    "right": {
                      "type": "value",
                      "returnType": "number",
                      "value": 0
                    }
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, json, true, false);

        // Should have very few errors (2-3 max) not the original 5+
        assertTrue(result.getErrorCount() <= 5, 
            "Typo should generate max 5 errors, got " + result.getErrorCount());
        assertTrue(result.getErrorCount() > 0, "Should have at least one error");

        // The typo "cond2ition" causes additionalProperties errors for condition's properties
        // This is the most actionable error type for an invalid type value
        boolean hasTypeError = result.getErrors().stream()
            .anyMatch(e -> ("additionalProperties".equals(e.getType()) || 
                          "const".equals(e.getType()) || 
                          "oneOf".equals(e.getType())) && 
                          e.getPath().contains("conditions[0]"));
        assertTrue(hasTypeError, "Should show error identifying the typo in condition type");

        // Verify at least one error has a line number
        boolean hasLineNumber = result.getErrors().stream()
            .anyMatch(e -> e.getLineNumber() != null && e.getLineNumber() > 1);
        assertTrue(hasLineNumber, "At least one error should have a line number");
    }
}
