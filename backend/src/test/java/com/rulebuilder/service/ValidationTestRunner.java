package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Quick test to see what raw errors look like
 */
public class ValidationTestRunner {
    
    public static void main(String[] args) throws IOException {
        RuleValidationService service = new RuleValidationService();
        ObjectMapper objectMapper = new ObjectMapper();
        
        // Test 1: Valid rule
        System.out.println("=== TEST 1: Valid Simple Expression ===");
        String validJson = """
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
        printResult(service.validate(objectMapper.readTree(validJson)));
        
        // Test 2: Missing required field
        System.out.println("\n=== TEST 2: Missing 'structure' field ===");
        String missingStructure = """
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
        printResult(service.validate(objectMapper.readTree(missingStructure)));
        
        // Test 3: Invalid enum value
        System.out.println("\n=== TEST 3: Invalid structure value ===");
        String invalidEnum = """
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
        printResult(service.validate(objectMapper.readTree(invalidEnum)));
        
        // Test 4: Invalid UUID pattern
        System.out.println("\n=== TEST 4: Invalid UUID pattern ===");
        String invalidUuid = """
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
        printResult(service.validate(objectMapper.readTree(invalidUuid)));
        
        // Test 5: oneOf error
        System.out.println("\n=== TEST 5: Invalid expression type (oneOf cascade) ===");
        String oneOfError = """
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
        printResult(service.validate(objectMapper.readTree(oneOfError)));
        
        // Test 6: Additional property
        System.out.println("\n=== TEST 6: Additional unknown property ===");
        String additionalProp = """
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
        printResult(service.validate(objectMapper.readTree(additionalProp)));
        
        // Test 7: Missing metadata.id
        System.out.println("\n=== TEST 7: Missing metadata.id ===");
        String missingMetadataId = """
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
        printResult(service.validate(objectMapper.readTree(missingMetadataId)));
    }
    
    private static void printResult(ValidationResult result) {
        System.out.println("Schema: " + result.getSchemaFilename() + " v" + result.getSchemaVersion());
        System.out.println("Error Count: " + result.getErrorCount());
        
        if (result.getErrorCount() > 0) {
            System.out.println("\nErrors:");
            for (int i = 0; i < result.getErrors().size(); i++) {
                ValidationError error = result.getErrors().get(i);
                System.out.println("\n  Error #" + (i + 1) + ":");
                System.out.println("    type: " + error.getType());
                System.out.println("    code: " + error.getCode());
                System.out.println("    path: " + error.getPath());
                System.out.println("    schemaPath: " + error.getSchemaPath());
                System.out.println("    message: " + error.getMessage());
                if (error.getArguments() != null && !error.getArguments().isEmpty()) {
                    System.out.println("    arguments: " + error.getArguments());
                }
                if (error.getDetails() != null) {
                    System.out.println("    details: " + error.getDetails());
                }
            }
        } else {
            System.out.println("✓ No errors - validation passed!");
        }
    }
}
