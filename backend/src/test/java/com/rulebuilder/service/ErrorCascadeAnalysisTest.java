package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Analyzes which types of validation errors produce cascading/multiple error messages
 */
public class ErrorCascadeAnalysisTest {
    
    public static void main(String[] args) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        XUISemanticValidator xuiValidator = new XUISemanticValidator();
        RuleValidationService service = new RuleValidationService(xuiValidator);
        
        // Test 1: Missing required field (simple error)
        System.out.println("=== Test 1: Missing required field 'structure' ===");
        testJson("""
            {
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {}
            }
            """, mapper, service);
        
        // Test 2: Invalid enum value (simple error)
        System.out.println("\n=== Test 2: Invalid enum value ===");
        testJson("""
            {
              "structure": "condition",
              "returnType": "INVALID_TYPE",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {}
            }
            """, mapper, service);
        
        // Test 3: oneOf error - wrong expression type
        System.out.println("\n=== Test 3: oneOf error - wrong expression type ===");
        testJson("""
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
            """, mapper, service);
        
        // Test 4: Additional properties error
        System.out.println("\n=== Test 4: Additional properties ===");
        testJson("""
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
                "value": 1
              },
              "unknownField1": "test",
              "unknownField2": "test2"
            }
            """, mapper, service);
        
        // Test 5: Type mismatch (wrong type)
        System.out.println("\n=== Test 5: Type mismatch ===");
        testJson("""
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": "not-a-number",
              "metadata": ["array-instead-of-object"],
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              }
            }
            """, mapper, service);
        
        // Test 6: Pattern violation
        System.out.println("\n=== Test 6: Pattern violations ===");
        testJson("""
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "invalid-uuid",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "field",
                "returnType": "number",
                "field": "invalid.lowercase"
              }
            }
            """, mapper, service);
        
        // Test 7: Missing required field in nested oneOf
        System.out.println("\n=== Test 7: Missing required field for specific type (oneOf cascade) ===");
        testJson("""
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
            """, mapper, service);
        
        // Test 8: minItems violation
        System.out.println("\n=== Test 8: Array minItems violation ===");
        testJson("""
            {
              "structure": "case",
              "returnType": "text",
              "ruleType": "Transformation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "whenClauses": []
              }
            }
            """, mapper, service);
        
        // Test 9: Dependency violation (allOf/anyOf scenarios)
        System.out.println("\n=== Test 9: Multiple constraint violations ===");
        testJson("""
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
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
            """, mapper, service);
    }
    
    private static void testJson(String json, ObjectMapper mapper, RuleValidationService service) throws IOException {
        JsonNode ruleNode = mapper.readTree(json);
        ValidationResult result = service.validate(ruleNode);
        
        System.out.println("Total errors: " + result.getErrorCount());
        
        // Group by error type
        var errorsByType = result.getErrors().stream()
            .collect(java.util.stream.Collectors.groupingBy(
                ValidationError::getType,
                java.util.stream.Collectors.counting()
            ));
        
        System.out.println("Errors by type:");
        errorsByType.forEach((type, count) -> 
            System.out.println("  " + type + ": " + count)
        );
        
        System.out.println("\nDetailed errors:");
        for (ValidationError error : result.getErrors()) {
            System.out.printf("  [%s] %s: %s\n", 
                error.getType(), 
                error.getPath(),
                error.getMessage().substring(0, Math.min(80, error.getMessage().length()))
            );
        }
    }
}
