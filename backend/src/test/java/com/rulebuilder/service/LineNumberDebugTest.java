package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

public class LineNumberDebugTest {
    
    public static void main(String[] args) throws IOException {
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
                "field": "invalid.lowercase"
              }
            }
            """;
        
        // Print with line numbers
        String[] lines = json.split("\n");
        for (int i = 0; i < lines.length; i++) {
            System.out.printf("%2d: %s\n", i + 1, lines[i]);
        }
        
        System.out.println("\n\nSearching for 'field' key:");
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].contains("\"field\"")) {
                System.out.printf("Found 'field' on line %d: %s\n", i + 1, lines[i].trim());
            }
        }
        
        // Now validate
        ObjectMapper mapper = new ObjectMapper();
        JsonNode ruleNode = mapper.readTree(json);
        
        RuleValidationService service = new RuleValidationService();
        ValidationResult result = service.validate(ruleNode, json, true);
        
        System.out.println("\n\nValidation errors:");
        for (ValidationError error : result.getErrors()) {
            System.out.printf("Path: %s, Line: %d, Message: %s\n", 
                error.getPath(), error.getLineNumber(), error.getMessage());
        }
    }
}
