package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Tests whether suppressing oneOf cascade errors could hide legitimate validation issues
 */
public class CascadeSuppressionRiskTest {
    
    public static void main(String[] args) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        XUISemanticValidator xuiValidator = new XUISemanticValidator();
        RuleValidationService service = new RuleValidationService(xuiValidator);
        
        System.out.println("=== Scenario 1: Single root cause (wrong type) ===");
        System.out.println("Expected: User just needs to fix 'type' field");
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
        
        System.out.println("\n=== Scenario 2: Multiple independent errors ===");
        System.out.println("Expected: User needs to fix BOTH wrong type AND missing value");
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
                "returnType": "number"
              }
            }
            """, mapper, service);
        
        System.out.println("\n=== Scenario 3: Correct type, wrong structure ===");
        System.out.println("Expected: User has 'value' type but missing 'value' field");
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
        
        System.out.println("\n=== Scenario 4: Multiple unrelated errors at different paths ===");
        System.out.println("Expected: Invalid UUID AND wrong definition type");
        testJson("""
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
            """, mapper, service);
        
        System.out.println("\n=== Scenario 5: Field type correct but field name invalid pattern ===");
        System.out.println("Expected: Field pattern error (lowercase)");
        testJson("""
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
            """, mapper, service);
        
        System.out.println("\n=== Scenario 6: expressionGroup with correct type but constraint violation ===");
        System.out.println("Expected: minItems error for expressions array");
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
        
        // Categorize errors
        var rootCauseErrors = result.getErrors().stream()
            .filter(err -> !err.getType().equals("oneOf") && 
                          !err.getType().equals("const") &&
                          !(err.getType().equals("required") && err.getPath().equals("$.definition")) &&
                          !(err.getType().equals("additionalProperties") && err.getPath().equals("$.definition")))
            .toList();
        
        var cascadeErrors = result.getErrors().stream()
            .filter(err -> err.getType().equals("oneOf") || 
                          err.getType().equals("const") ||
                          (err.getType().equals("required") && err.getPath().equals("$.definition")) ||
                          (err.getType().equals("additionalProperties") && err.getPath().equals("$.definition")))
            .toList();
        
        System.out.println("\nROOT CAUSE errors (" + rootCauseErrors.size() + "):");
        for (ValidationError error : rootCauseErrors) {
            System.out.printf("  [%s] %s: %s\n", 
                error.getType(), 
                error.getPath(),
                truncate(error.getMessage(), 80)
            );
        }
        
        System.out.println("\nCASCADE errors (" + cascadeErrors.size() + "):");
        for (ValidationError error : cascadeErrors) {
            System.out.printf("  [%s] %s: %s\n", 
                error.getType(), 
                error.getPath(),
                truncate(error.getMessage(), 80)
            );
        }
        
        System.out.println("\n>>> IF WE SUPPRESS CASCADE: " + rootCauseErrors.size() + " errors remain <<<");
    }
    
    private static String truncate(String str, int maxLen) {
        return str.length() <= maxLen ? str : str.substring(0, maxLen) + "...";
    }
}
