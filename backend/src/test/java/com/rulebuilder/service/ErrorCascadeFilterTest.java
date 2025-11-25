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
}
