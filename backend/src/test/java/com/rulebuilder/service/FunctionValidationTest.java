package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
public class FunctionValidationTest {

    private RuleBuilderService ruleBuilderService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        ruleBuilderService = new RuleBuilderService();
        objectMapper = new ObjectMapper();
    }

    // Helper method to create a basic rule structure with a function
    private JsonNode createRuleWithFunction(String functionName, String argsJson) throws Exception {
        String ruleTemplate = """
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
                  "name": "%s",
                  "args": %s
                }
              }
            ],
            "operators": []
          }
        }
        """;
        
        String ruleJson = String.format(ruleTemplate, functionName, argsJson);
        return objectMapper.readTree(ruleJson);
    }

    // Helper to create expression group with specific type and value
    private String createExpressionGroup(String returnType, String type, Object value) {
        if ("value".equals(type)) {
            return String.format("""
            {
              "type": "expressionGroup",
              "returnType": "%s",
              "expressions": [
                {
                  "type": "value",
                  "returnType": "%s",
                  "value": %s
                }
              ],
              "operators": []
            }
            """, returnType, returnType, 
            value instanceof String ? "\"" + value + "\"" : value);
        } else {
            return String.format("""
            {
              "type": "expressionGroup",
              "returnType": "%s",
              "expressions": [
                {
                  "type": "%s",
                  "returnType": "%s"
                }
              ],
              "operators": []
            }
            """, returnType, type, returnType);
        }
    }

    @Test
    @DisplayName("Valid MATH.ADD should pass validation")
    void testValidMathAdd() throws Exception {
        String args = String.format("""
        [
          {
            "name": "arg1",
            "value": %s
          },
          {
            "name": "arg2", 
            "value": %s
          }
        ]
        """, createExpressionGroup("number", "value", 5),
             createExpressionGroup("number", "value", 10));

        JsonNode rule = createRuleWithFunction("MATH.ADD", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertTrue(result.get("valid").asBoolean(), 
            "Valid MATH.ADD should pass validation");
    }

    @Test
    @DisplayName("MATH.ADD with wrong argument names should fail")
    void testMathAddWrongArgumentNames() throws Exception {
        String args = String.format("""
        [
          {
            "name": "wrongName1",
            "value": %s
          },
          {
            "name": "wrongName2",
            "value": %s
          }
        ]
        """, createExpressionGroup("number", "value", 5),
             createExpressionGroup("number", "value", 10));

        JsonNode rule = createRuleWithFunction("MATH.ADD", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "MATH.ADD with wrong argument names should fail validation");
        assertTrue(result.has("errors"), "Should have validation errors");
    }

    @Test
    @DisplayName("MATH.ADD with too few arguments should fail")
    void testMathAddTooFewArguments() throws Exception {
        String args = String.format("""
        [
          {
            "name": "arg1",
            "value": %s
          }
        ]
        """, createExpressionGroup("number", "value", 5));

        JsonNode rule = createRuleWithFunction("MATH.ADD", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "MATH.ADD with too few arguments should fail validation");
    }

    @Test
    @DisplayName("MATH.ADD with too many arguments should fail")
    void testMathAddTooManyArguments() throws Exception {
        StringBuilder args = new StringBuilder("[\n");
        for (int i = 1; i <= 11; i++) {
            if (i > 1) args.append(",\n");
            args.append(String.format("""
              {
                "name": "arg%d",
                "value": %s
              }
              """, i, createExpressionGroup("number", "value", i)));
        }
        args.append("\n]");

        JsonNode rule = createRuleWithFunction("MATH.ADD", args.toString());
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "MATH.ADD with too many arguments should fail validation");
    }

    @Test
    @DisplayName("Valid MATH.SUBTRACT should pass validation")
    void testValidMathSubtract() throws Exception {
        String args = String.format("""
        [
          {
            "name": "num1",
            "value": %s
          },
          {
            "name": "num2",
            "value": %s
          }
        ]
        """, createExpressionGroup("number", "value", 15),
             createExpressionGroup("number", "value", 5));

        JsonNode rule = createRuleWithFunction("MATH.SUBTRACT", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertTrue(result.get("valid").asBoolean(),
            "Valid MATH.SUBTRACT should pass validation");
    }

    @Test
    @DisplayName("MATH.SUBTRACT with wrong argument names should fail")
    void testMathSubtractWrongArgumentNames() throws Exception {
        String args = String.format("""
        [
          {
            "name": "number1",
            "value": %s
          },
          {
            "name": "number2",
            "value": %s
          }
        ]
        """, createExpressionGroup("number", "value", 15),
             createExpressionGroup("number", "value", 5));

        JsonNode rule = createRuleWithFunction("MATH.SUBTRACT", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "MATH.SUBTRACT with wrong argument names should fail validation");
    }

    @Test
    @DisplayName("MATH.SUBTRACT with arguments in wrong order should fail")
    void testMathSubtractWrongOrder() throws Exception {
        String args = String.format("""
        [
          {
            "name": "num2",
            "value": %s
          },
          {
            "name": "num1",
            "value": %s
          }
        ]
        """, createExpressionGroup("number", "value", 5),
             createExpressionGroup("number", "value", 15));

        JsonNode rule = createRuleWithFunction("MATH.SUBTRACT", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "MATH.SUBTRACT with arguments in wrong order should fail validation");
    }

    @Test
    @DisplayName("MATH.DIVIDE with wrong argument types should fail")
    void testMathDivideWrongArgumentTypes() throws Exception {
        String args = String.format("""
        [
          {
            "name": "dividend",
            "value": %s
          },
          {
            "name": "divisor",
            "value": %s
          }
        ]
        """, createExpressionGroup("text", "value", "hello"),
             createExpressionGroup("number", "value", 2));

        JsonNode rule = createRuleWithFunction("MATH.DIVIDE", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "MATH.DIVIDE with wrong argument types should fail validation");
    }

    @Test
    @DisplayName("Valid DATE.DIFF should pass validation")
    void testValidDateDiff() throws Exception {
        String args = String.format("""
        [
          {
            "name": "units",
            "value": %s
          },
          {
            "name": "date1",
            "value": %s
          },
          {
            "name": "date2",
            "value": %s
          }
        ]
        """, createExpressionGroup("text", "value", "DAY"),
             createExpressionGroup("date", "field", null),
             createExpressionGroup("date", "field", null));

        // Update rule template for date return type
        String ruleTemplate = """
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
                  "args": %s
                }
              }
            ],
            "operators": []
          }
        }
        """;
        
        String ruleJson = String.format(ruleTemplate, args);
        JsonNode rule = objectMapper.readTree(ruleJson);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertTrue(result.get("valid").asBoolean(),
            "Valid DATE.DIFF should pass validation");
    }

    @Test
    @DisplayName("DATE.DIFF with wrong argument names should fail")
    void testDateDiffWrongArgumentNames() throws Exception {
        String args = String.format("""
        [
          {
            "name": "units1",
            "value": %s
          },
          {
            "name": "date1",
            "value": %s
          },
          {
            "name": "date2",
            "value": %s
          }
        ]
        """, createExpressionGroup("text", "value", "DAY"),
             createExpressionGroup("date", "field", null),
             createExpressionGroup("date", "field", null));

        String ruleTemplate = """
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
                  "args": %s
                }
              }
            ],
            "operators": []
          }
        }
        """;
        
        String ruleJson = String.format(ruleTemplate, args);
        JsonNode rule = objectMapper.readTree(ruleJson);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "DATE.DIFF with wrong argument names should fail validation");
    }

    @Test
    @DisplayName("TEXT.CASE with wrong argument types should fail")
    void testTextCaseWrongArgumentTypes() throws Exception {
        String args = String.format("""
        [
          {
            "name": "text",
            "value": %s
          },
          {
            "name": "caseType",
            "value": %s
          }
        ]
        """, createExpressionGroup("number", "value", 123),
             createExpressionGroup("text", "value", "UPPER"));

        String ruleTemplate = """
        {
          "structure": "expression",
          "returnType": "text",
          "ruleType": "Transformation",
          "uuId": "12345678-1234-1234-1234-123456789abc",
          "version": 1,
          "metadata": {
            "id": "test-rule",
            "description": "Test rule"
          },
          "content": {
            "type": "expressionGroup",
            "returnType": "text",
            "expressions": [
              {
                "type": "function",
                "returnType": "text",
                "function": {
                  "name": "TEXT.CASE",
                  "args": %s
                }
              }
            ],
            "operators": []
          }
        }
        """;
        
        String ruleJson = String.format(ruleTemplate, args);
        JsonNode rule = objectMapper.readTree(ruleJson);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "TEXT.CASE with wrong argument types should fail validation");
    }

    @Test
    @DisplayName("Function with extra properties should fail")
    void testFunctionWithExtraProperties() throws Exception {
        String args = """
        [
          {
            "name": "num1",
            "value": {
              "type": "expressionGroup",
              "returnType": "number",
              "expressions": [
                {
                  "type": "value",
                  "returnType": "number",
                  "value": 5
                }
              ],
              "operators": []
            },
            "extraProperty": "should not be here"
          },
          {
            "name": "num2",
            "value": {
              "type": "expressionGroup",
              "returnType": "number",
              "expressions": [
                {
                  "type": "value",
                  "returnType": "number",
                  "value": 10
                }
              ],
              "operators": []
            }
          }
        ]
        """;

        JsonNode rule = createRuleWithFunction("MATH.SUBTRACT", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "Function with extra properties should fail validation");
    }

    @Test
    @DisplayName("Function with missing required properties should fail")
    void testFunctionWithMissingProperties() throws Exception {
        String args = """
        [
          {
            "name": "num1"
          },
          {
            "name": "num2",
            "value": {
              "type": "expressionGroup",
              "returnType": "number",
              "expressions": [
                {
                  "type": "value",
                  "returnType": "number",
                  "value": 10
                }
              ],
              "operators": []
            }
          }
        ]
        """;

        JsonNode rule = createRuleWithFunction("MATH.SUBTRACT", args);
        JsonNode result = ruleBuilderService.validateRule(rule);
        
        assertFalse(result.get("valid").asBoolean(),
            "Function with missing required properties should fail validation");
    }
}