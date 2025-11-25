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
    void setUp() {
        validationService = new RuleValidationService();
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
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
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
        // Should have 1-3 errors after filtering (enum error is root cause)
        assertTrue(result.getErrorCount() <= 3, 
            "Should have few errors after cascade filtering, got " + result.getErrorCount());
        assertTrue(result.getErrorCount() > 0, "Should have at least one error");

        // Verify enum error is preserved (root cause)
        boolean hasEnumError = result.getErrors().stream()
                .anyMatch(e -> "enum".equals(e.getType()));
        assertTrue(hasEnumError, "Should keep enum error");
    }    @Test
    @DisplayName("Missing required field for correct type should NOT be suppressed")
    void testKeepLegitimateRequiredError() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
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
              "uuId": "bad-uuid",
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
            .anyMatch(e -> e.getPath().contains("uuId"));
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
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
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
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
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
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
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
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
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
              "uuId": "a6ae5cf2-69f1-4877-9667-0e3b7391b40b",
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
        assertTrue(result.getErrorCount() <= 3, 
            "Should limit to 3 most actionable errors, got " + result.getErrorCount());

        // Should have a required error for returnType (not the generic oneOf error)
        boolean hasRequiredError = result.getErrors().stream()
            .anyMatch(e -> "required".equals(e.getType()));
        assertTrue(hasRequiredError, 
            "Should show required field error instead of generic oneOf error");

        // Should NOT have oneOf error (it should be suppressed)
        boolean hasOneOfError = result.getErrors().stream()
            .anyMatch(e -> "oneOf".equals(e.getType()));
        assertFalse(hasOneOfError, 
            "Should suppress generic oneOf error in favor of specific required errors");
    }

    @Test
    @DisplayName("Definition with invalid UUID should show both UUID and definition errors")
    void testDefinitionWithInvalidUUID() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Reporting",
              "uuId": "g6ae5cf2-69f1-4877-9667-0e3b7391b40b",
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

        // Should show both pattern error (UUID) and required error (definition)
        assertTrue(result.getErrorCount() >= 2, 
            "Should have at least 2 errors (UUID pattern + definition required)");
        assertTrue(result.getErrorCount() <= 4, 
            "Should limit errors to avoid overwhelming user");

        // Should have pattern error for UUID
        boolean hasPatternError = result.getErrors().stream()
            .anyMatch(e -> "pattern".equals(e.getType()) && 
                          e.getPath().contains("uuId"));
        assertTrue(hasPatternError, "Should show UUID pattern error");

        // Should have required error for definition
        boolean hasRequiredError = result.getErrors().stream()
            .anyMatch(e -> "required".equals(e.getType()) && 
                          e.getPath().contains("definition"));
        assertTrue(hasRequiredError, "Should show definition required error");

        // Should NOT have oneOf error
        boolean hasOneOfError = result.getErrors().stream()
            .anyMatch(e -> "oneOf".equals(e.getType()));
        assertFalse(hasOneOfError, 
            "Should suppress oneOf error when actionable errors exist");
    }
}
