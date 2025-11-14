package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class ValidationDiagnosticTest {

    private RuleBuilderService ruleBuilderService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        ruleBuilderService = new RuleBuilderService();
        objectMapper = new ObjectMapper();
    }

    @Test
    void testDiagnosticValidation() throws Exception {
        // Test with wrong argument name for DATE.DIFF
        String invalidRule = """
        {
          "structure": "expression",
          "returnType": "number",
          "ruleType": "Transformation",
          "uuId": "12345678-1234-1234-1234-123456789abc",
          "version": 1,
          "metadata": {
            "id": "test-rule",
            "description": "Test rule"
          },
          "content": {
            "type": "expressionGroup",
            "returnType": "number",
            "expressions": [
              {
                "type": "function",
                "returnType": "number",
                "function": {
                  "name": "DATE.DIFF",
                  "args": [
                    {
                      "name": "units1",
                      "value": {
                        "type": "expressionGroup",
                        "returnType": "text",
                        "expressions": [
                          {
                            "type": "value",
                            "returnType": "text",
                            "value": "DAY"
                          }
                        ],
                        "operators": []
                      }
                    },
                    {
                      "name": "date1",
                      "value": {
                        "type": "expressionGroup",
                        "returnType": "date",
                        "expressions": [
                          {
                            "type": "field",
                            "returnType": "date"
                          }
                        ],
                        "operators": []
                      }
                    },
                    {
                      "name": "date2",
                      "value": {
                        "type": "expressionGroup",
                        "returnType": "date",
                        "expressions": [
                          {
                            "type": "field",
                            "returnType": "date"
                          }
                        ],
                        "operators": []
                      }
                    }
                  ]
                }
              }
            ],
            "operators": []
          }
        }
        """;

        JsonNode rule = objectMapper.readTree(invalidRule);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        System.out.println("=== DIAGNOSTIC VALIDATION RESULT ===");
        System.out.println("Valid: " + result.get("valid").asBoolean());
        System.out.println("Schema Version: " + result.get("schema").get("version").asText());
        
        if (result.has("errors")) {
            System.out.println("Errors found: " + result.get("errors").size());
            for (JsonNode error : result.get("errors")) {
                System.out.println("  Path: " + error.get("path").asText());
                System.out.println("  Message: " + error.get("message").asText());
                System.out.println("  Type: " + error.get("type").asText());
                System.out.println("  ---");
            }
        } else {
            System.out.println("No validation errors found!");
        }
        System.out.println("=====================================");
    }
}