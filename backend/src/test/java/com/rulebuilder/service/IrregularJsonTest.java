package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

public class IrregularJsonTest {
    
    public static void main(String[] args) throws IOException {
        // Test various irregular but valid JSON formats
        
        // Test 1: Mixed spacing
        String json1 = """
            {
              "structure": "expression",
                "returnType": "string",
            "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              }
            }
            """;
        
        // Test 2: Partial compact
        String json2 = """
            { "structure": "expression",
              "returnType": "string", "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012", "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": { "type": "value", "returnType": "number", "value": 1 }
            }
            """;
        
        // Test 3: Extra whitespace and newlines
        String json3 = """
            {
              "structure"    :    "expression"   ,
              
              "returnType"   :   "string"  ,
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
        
        ObjectMapper mapper = new ObjectMapper();
        RuleValidationService service = new RuleValidationService();
        
        System.out.println("=== Test 1: Mixed spacing ===");
        testJson(json1, mapper, service);
        
        System.out.println("\n=== Test 2: Partial compact ===");
        testJson(json2, mapper, service);
        
        System.out.println("\n=== Test 3: Extra whitespace ===");
        testJson(json3, mapper, service);
    }
    
    private static void testJson(String json, ObjectMapper mapper, RuleValidationService service) throws IOException {
        System.out.println("JSON with line numbers:");
        String[] lines = json.split("\n");
        for (int i = 0; i < lines.length; i++) {
            System.out.printf("%2d: %s\n", i + 1, lines[i]);
        }
        
        JsonNode ruleNode = mapper.readTree(json);
        ValidationResult result = service.validate(ruleNode, json, true);
        
        System.out.println("\nValidation errors:");
        if (result.getErrorCount() == 0) {
            System.out.println("No errors!");
        } else {
            for (ValidationError error : result.getErrors()) {
                System.out.printf("Path: %s, Line: %d, Message: %s\n", 
                    error.getPath(), error.getLineNumber(), 
                    error.getMessage().substring(0, Math.min(60, error.getMessage().length())));
            }
        }
    }
}
