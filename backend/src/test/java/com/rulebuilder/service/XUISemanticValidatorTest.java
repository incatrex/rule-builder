package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test suite for XUISemanticValidator
 * Tests x-ui-* custom validation rules from the schema
 * 
 * Schema Version: 2.0.3
 */
class XUISemanticValidatorTest {

    private XUISemanticValidator validator;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws IOException {
        validator = new XUISemanticValidator();
        objectMapper = new ObjectMapper();
    }

    // ==================== VALID RULES (NO X-UI ERRORS) ====================

    @Test
    @DisplayName("Valid rule with text operators should pass x-ui validation")
    void testValidTextOperators() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "text",
                  "field": "TABLE1.TEXT_FIELD"
                },
                "operator": "contains",
                "right": {
                  "type": "value",
                  "returnType": "text",
                  "value": "test"
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertEquals(0, errors.size(), "Valid text operator should produce no errors");
    }

    @Test
    @DisplayName("Valid rule with number operators should pass x-ui validation")
    void testValidNumberOperators() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "TABLE1.NUMBER_FIELD"
                },
                "operator": "greater",
                "right": {
                  "type": "value",
                  "returnType": "number",
                  "value": 100
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertEquals(0, errors.size(), "Valid number operator should produce no errors");
    }

    @Test
    @DisplayName("Valid between operator with 2 expressions should pass")
    void testValidBetweenOperator() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "TABLE1.NUMBER_FIELD"
                },
                "operator": "between",
                "right": [
                  {
                    "type": "value",
                    "returnType": "number",
                    "value": 50
                  },
                  {
                    "type": "value",
                    "returnType": "number",
                    "value": 150
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertEquals(0, errors.size(), "Valid between operator with 2 expressions should pass");
    }

    @Test
    @DisplayName("Valid is_empty operator with null right should pass")
    void testValidIsEmptyOperator() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "text",
                  "field": "TABLE1.TEXT_FIELD"
                },
                "operator": "is_empty",
                "right": null
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertEquals(0, errors.size(), "Valid is_empty operator with null should pass");
    }

    // ==================== OPERATOR/TYPE COMPATIBILITY ====================

    @Test
    @DisplayName("Text operator on number field should produce error")
    void testInvalidOperatorForNumberType() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "TABLE1.NUMBER_FIELD"
                },
                "operator": "contains",
                "right": {
                  "type": "value",
                  "returnType": "text",
                  "value": "test"
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for invalid operator on number type");
        
        boolean hasOperatorError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("contains") && 
                          e.getMessage().contains("number"));
        assertTrue(hasOperatorError, "Should have operator compatibility error");
    }

    @Test
    @DisplayName("Number operator on text field should produce error")
    void testInvalidOperatorForTextType() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "text",
                  "field": "TABLE1.TEXT_FIELD"
                },
                "operator": "greater",
                "right": {
                  "type": "value",
                  "returnType": "number",
                  "value": 100
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for invalid operator on text type");
        
        boolean hasOperatorError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("greater") && 
                          e.getMessage().contains("text"));
        assertTrue(hasOperatorError, "Should have operator compatibility error");
    }

    @Test
    @DisplayName("Date type with expression operators should produce error")
    void testDateTypeCannotUseExpressionOperators() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "date",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "expressionGroup",
                "returnType": "date",
                "expressions": [
                  {
                    "type": "field",
                    "returnType": "date",
                    "field": "TABLE1.DATE_FIELD"
                  },
                  {
                    "type": "field",
                    "returnType": "date",
                    "field": "TABLE2.DATE_FIELD"
                  }
                ],
                "operators": ["+"]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for date with expression operators");
        
        boolean hasOperatorError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("date") && 
                          e.getMessage().contains("operator"));
        assertTrue(hasOperatorError, "Should have expression operator error for date type");
    }

    // ==================== OPERATOR CARDINALITY ====================

    @Test
    @DisplayName("Between operator with 1 expression should produce error")
    void testBetweenOperatorWrongCardinality() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "TABLE1.NUMBER_FIELD"
                },
                "operator": "between",
                "right": [
                  {
                    "type": "value",
                    "returnType": "number",
                    "value": 50
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for between with wrong cardinality");
        
        boolean hasCardinalityError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("between") && 
                          (e.getMessage().contains("2") || e.getMessage().contains("cardinality")));
        assertTrue(hasCardinalityError, "Should have cardinality error for between operator");
    }

    @Test
    @DisplayName("Is_empty operator with non-null right should produce error")
    void testIsEmptyOperatorWithValue() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "text",
                  "field": "TABLE1.TEXT_FIELD"
                },
                "operator": "is_empty",
                "right": {
                  "type": "value",
                  "returnType": "text",
                  "value": "test"
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for is_empty with value");
        
        boolean hasCardinalityError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("is_empty") && 
                          e.getMessage().contains("null"));
        assertTrue(hasCardinalityError, "Should have cardinality error for is_empty operator");
    }

    @Test
    @DisplayName("Equal operator with array should produce error")
    void testEqualOperatorWithArray() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "TABLE1.NUMBER_FIELD"
                },
                "operator": "equal",
                "right": [
                  {
                    "type": "value",
                    "returnType": "number",
                    "value": 1
                  },
                  {
                    "type": "value",
                    "returnType": "number",
                    "value": 2
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for equal operator with array");
        
        boolean hasCardinalityError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("equal") && 
                          (e.getMessage().contains("1") || e.getMessage().contains("single")));
        assertTrue(hasCardinalityError, "Should have cardinality error for equal operator");
    }

    @Test
    @DisplayName("IN operator with too many values should produce error")
    void testInOperatorTooManyValues() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "TABLE1.NUMBER_FIELD"
                },
                "operator": "in",
                "right": [
                  {"type": "value", "returnType": "number", "value": 1},
                  {"type": "value", "returnType": "number", "value": 2},
                  {"type": "value", "returnType": "number", "value": 3},
                  {"type": "value", "returnType": "number", "value": 4},
                  {"type": "value", "returnType": "number", "value": 5},
                  {"type": "value", "returnType": "number", "value": 6},
                  {"type": "value", "returnType": "number", "value": 7},
                  {"type": "value", "returnType": "number", "value": 8},
                  {"type": "value", "returnType": "number", "value": 9},
                  {"type": "value", "returnType": "number", "value": 10},
                  {"type": "value", "returnType": "number", "value": 11}
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for IN operator with too many values");
        
        boolean hasCardinalityError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("in") && 
                          e.getMessage().contains("10"));
        assertTrue(hasCardinalityError, "Should have max cardinality error for IN operator");
    }

    // ==================== EXPRESSION GROUP OPERATORS ====================

    @Test
    @DisplayName("Text expression group with math operator should produce error")
    void testTextExpressionGroupWithMathOperator() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "text",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "expressionGroup",
                "returnType": "text",
                "expressions": [
                  {
                    "type": "value",
                    "returnType": "text",
                    "value": "Hello"
                  },
                  {
                    "type": "value",
                    "returnType": "text",
                    "value": "World"
                  }
                ],
                "operators": ["+"]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for text with math operator");
        
        boolean hasOperatorError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("text") && 
                          e.getMessage().contains("+"));
        assertTrue(hasOperatorError, "Should have expression operator error");
    }

    @Test
    @DisplayName("Number expression group with concat operator should produce error")
    void testNumberExpressionGroupWithConcatOperator() throws IOException {
        String json = """
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
                    "value": 10
                  },
                  {
                    "type": "value",
                    "returnType": "number",
                    "value": 20
                  }
                ],
                "operators": ["&"]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for number with concat operator");
        
        boolean hasOperatorError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("number") && 
                          e.getMessage().contains("&"));
        assertTrue(hasOperatorError, "Should have expression operator error");
    }

    // ==================== FUNCTION VALIDATION ====================

    @Test
    @DisplayName("Function with correct return type should pass")
    void testValidFunctionReturnType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "function",
                "returnType": "number",
                "function": {
                  "name": "MATH.ADD",
                  "args": [
                    {
                      "name": "arg1",
                      "value": {
                        "type": "value",
                        "returnType": "number",
                        "value": 10
                      }
                    },
                    {
                      "name": "arg2",
                      "value": {
                        "type": "value",
                        "returnType": "number",
                        "value": 20
                      }
                    }
                  ]
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertEquals(0, errors.size(), "Valid function should produce no errors");
    }

    @Test
    @DisplayName("Function with wrong return type should produce error")
    void testFunctionWrongReturnType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "text",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "function",
                "returnType": "text",
                "function": {
                  "name": "MATH.ADD",
                  "args": [
                    {
                      "name": "arg1",
                      "value": {
                        "type": "value",
                        "returnType": "number",
                        "value": 10
                      }
                    },
                    {
                      "name": "arg2",
                      "value": {
                        "type": "value",
                        "returnType": "number",
                        "value": 20
                      }
                    }
                  ]
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for wrong function return type");
        
        boolean hasReturnTypeError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("MATH.ADD") && 
                          e.getMessage().contains("number") &&
                          e.getMessage().contains("text"));
        assertTrue(hasReturnTypeError, "Should have return type mismatch error");
    }

    // ==================== NESTED VALIDATION ====================

    @Test
    @DisplayName("Nested conditions should be validated recursively")
    void testNestedConditionValidation() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "conditionGroup",
                "returnType": "boolean",
                "name": "Group",
                "conjunction": "AND",
                "not": false,
                "conditions": [
                  {
                    "type": "condition",
                    "returnType": "boolean",
                    "name": "Test",
                    "left": {
                      "type": "field",
                      "returnType": "number",
                      "field": "TABLE1.NUMBER_FIELD"
                    },
                    "operator": "contains",
                    "right": {
                      "type": "value",
                      "returnType": "text",
                      "value": "test"
                    }
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should find errors in nested conditions");
        
        boolean hasNestedError = errors.stream()
            .anyMatch(e -> e.getPath().contains("conditions"));
        assertTrue(hasNestedError, "Should have error with nested path");
    }

    // ==================== UTILITY TESTS ====================

    @Test
    @DisplayName("Validator should handle null input gracefully")
    void testNullInput() {
        List<ValidationError> errors = validator.validate(null);
        assertNotNull(errors, "Should return empty list for null input");
        assertEquals(0, errors.size(), "Should have no errors for null input");
    }

    @Test
    @DisplayName("Validator should handle rule without definition")
    void testRuleWithoutDefinition() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        // Should handle gracefully (JSON schema validation would catch this)
        assertNotNull(errors, "Should return errors list");
    }

    // ==================== VALUE SOURCE VALIDATION ====================

    @Test
    @DisplayName("Invalid value source should produce error")
    void testInvalidValueSource() throws IOException {
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
                "value": 42,
                "valueSource": "database"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for invalid value source");
        
        boolean hasValueSourceError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("value source") && 
                          e.getMessage().contains("database"));
        assertTrue(hasValueSourceError, "Should have value source validation error");
    }

    @Test
    @DisplayName("Valid value source should pass")
    void testValidValueSource() throws IOException {
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
                "value": 42,
                "valueSource": "value"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertEquals(0, errors.size(), "Valid value source should produce no errors");
    }

    // ==================== DYNAMIC FUNCTION ARGUMENTS ====================

    @Test
    @DisplayName("Dynamic function with too few args should produce error")
    void testDynamicFunctionTooFewArgs() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "function",
                "returnType": "number",
                "function": {
                  "name": "MATH.ADD",
                  "args": [
                    {
                      "name": "arg1",
                      "value": {
                        "type": "value",
                        "returnType": "number",
                        "value": 10
                      }
                    }
                  ]
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for too few arguments");
        
        boolean hasArgError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("MATH.ADD") && 
                          e.getMessage().contains("2"));
        assertTrue(hasArgError, "Should have argument count error mentioning minArgs");
    }

    @Test
    @DisplayName("Dynamic function with too many args should produce error")
    void testDynamicFunctionTooManyArgs() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "function",
                "returnType": "number",
                "function": {
                  "name": "MATH.ADD",
                  "args": [
                    {"name": "arg1", "value": {"type": "value", "returnType": "number", "value": 1}},
                    {"name": "arg2", "value": {"type": "value", "returnType": "number", "value": 2}},
                    {"name": "arg3", "value": {"type": "value", "returnType": "number", "value": 3}},
                    {"name": "arg4", "value": {"type": "value", "returnType": "number", "value": 4}},
                    {"name": "arg5", "value": {"type": "value", "returnType": "number", "value": 5}},
                    {"name": "arg6", "value": {"type": "value", "returnType": "number", "value": 6}},
                    {"name": "arg7", "value": {"type": "value", "returnType": "number", "value": 7}},
                    {"name": "arg8", "value": {"type": "value", "returnType": "number", "value": 8}},
                    {"name": "arg9", "value": {"type": "value", "returnType": "number", "value": 9}},
                    {"name": "arg10", "value": {"type": "value", "returnType": "number", "value": 10}},
                    {"name": "arg11", "value": {"type": "value", "returnType": "number", "value": 11}}
                  ]
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertTrue(errors.size() > 0, "Should have errors for too many arguments");
        
        boolean hasArgError = errors.stream()
            .anyMatch(e -> e.getMessage().contains("MATH.ADD") && 
                          e.getMessage().contains("10"));
        assertTrue(hasArgError, "Should have argument count error mentioning maxArgs");
    }

    @Test
    @DisplayName("Dynamic function with valid arg count should pass")
    void testDynamicFunctionValidArgCount() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "aaaaaaaa-1111-2222-3333-000000000001",
              "version": 1,
              "metadata": { "id": "TEST", "description": "Test" },
              "definition": {
                "type": "function",
                "returnType": "number",
                "function": {
                  "name": "MATH.ADD",
                  "args": [
                    {"name": "arg1", "value": {"type": "value", "returnType": "number", "value": 10}},
                    {"name": "arg2", "value": {"type": "value", "returnType": "number", "value": 20}},
                    {"name": "arg3", "value": {"type": "value", "returnType": "number", "value": 30}}
                  ]
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        List<ValidationError> errors = validator.validate(rule);

        assertEquals(0, errors.size(), "Valid dynamic function should produce no errors");
    }
}
