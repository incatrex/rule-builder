package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Demonstrates what the API response looks like in JSON format
 */
public class JsonResponseDemo {
    
    public static void main(String[] args) throws IOException {
        RuleValidationService service = new RuleValidationService();
        ObjectMapper objectMapper = new ObjectMapper();
        
        System.out.println("=".repeat(80));
        System.out.println("API RESPONSE EXAMPLES - JSON FORMAT");
        System.out.println("=".repeat(80));
        
        // Example 1: Valid rule
        System.out.println("\n\n=== EXAMPLE 1: Valid Rule ===");
        System.out.println("Request: POST /api/v1/rules/validate");
        String validRule = """
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
        printJsonResponse(objectMapper, service.validate(objectMapper.readTree(validRule)));
        
        // Example 2: Missing required field
        System.out.println("\n\n=== EXAMPLE 2: Missing Required Field ===");
        System.out.println("Request: POST /api/v1/rules/validate");
        String missingField = """
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
        printJsonResponse(objectMapper, service.validate(objectMapper.readTree(missingField)));
        
        // Example 3: Invalid enum
        System.out.println("\n\n=== EXAMPLE 3: Invalid Enum Value ===");
        System.out.println("Request: POST /api/v1/rules/validate");
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
        printJsonResponse(objectMapper, service.validate(objectMapper.readTree(invalidEnum)));
        
        // Example 4: Pattern violation
        System.out.println("\n\n=== EXAMPLE 4: Pattern Violation ===");
        System.out.println("Request: POST /api/v1/rules/validate");
        String patternError = """
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
        printJsonResponse(objectMapper, service.validate(objectMapper.readTree(patternError)));
        
        // Example 5: Multiple errors
        System.out.println("\n\n=== EXAMPLE 5: Multiple Errors ===");
        System.out.println("Request: POST /api/v1/rules/validate");
        String multipleErrors = """
            {
              "structure": "invalid",
              "returnType": "invalid",
              "ruleType": "Invalid",
              "uuId": "not-valid",
              "version": "not-a-number",
              "metadata": {
                "description": "Missing id field"
              },
              "definition": {},
              "extraField": "not allowed"
            }
            """;
        printJsonResponse(objectMapper, service.validate(objectMapper.readTree(multipleErrors)));
    }
    
    private static void printJsonResponse(ObjectMapper objectMapper, ValidationResult result) throws IOException {
        String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);
        System.out.println("\nResponse: 200 OK");
        System.out.println("Content-Type: application/json");
        System.out.println("\n" + json);
    }
}
