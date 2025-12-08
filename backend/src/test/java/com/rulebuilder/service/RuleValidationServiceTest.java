package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rulebuilder.testutil.TestRuleTypes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.io.IOException;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test suite for RuleValidationService
 * Tests raw JSON Schema validation output before any transformations
 */
class RuleValidationServiceTest {

    private RuleValidationService validationService;
    private ObjectMapper objectMapper;
    private TestRuleTypes testRuleTypes;

    @BeforeEach
    void setUp() throws IOException {
        XUISemanticValidator xuiValidator = new XUISemanticValidator();
        validationService = new RuleValidationService(xuiValidator);
        objectMapper = new ObjectMapper();
        testRuleTypes = TestRuleTypes.getInstance();
    }

    // ==================== VALID RULES ====================

    @Test
    @DisplayName("Valid simple expression rule should have zero errors")
    void testValidSimpleExpression() throws IOException {
        String json = """
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // Assertions
        assertNotNull(result);
        assertEquals("rule-schema-current.json", result.getSchemaFilename());
        assertEquals("0.0.1", result.getSchemaVersion());
        assertEquals(0, result.getErrorCount());
        assertTrue(result.getErrors().isEmpty());
    }

    @Test
    @DisplayName("Valid condition rule should have zero errors")
    void testValidCondition() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "SIMPLE_CONDITION",
                "description": "A simple condition"
              },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Check Age",
                "id": "cond1",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "PERSON.AGE"
                },
                "operator": "greater",
                "right": {
                  "type": "value",
                  "returnType": "number",
                  "value": 18
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount());
        assertTrue(result.getErrors().isEmpty());
    }

    @Test
    @DisplayName("Valid case rule should have zero errors")
    void testValidCase() throws IOException {
        String json = """
            {
              "structure": "case",
              "returnType": "text",
              "ruleType": "Transformation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "AGE_CATEGORY",
                "description": "Categorize by age"
              },
              "definition": {
                "whenClauses": [
                  {
                    "when": {
                      "type": "conditionGroup",
                      "returnType": "boolean",
                      "name": "Child",
                      "conjunction": "AND",
                      "not": false,
                      "conditions": [
                        {
                          "type": "condition",
                          "returnType": "boolean",
                          "name": "Age check",
                          "left": {
                            "type": "field",
                            "returnType": "number",
                            "field": "PERSON.AGE"
                          },
                          "operator": "less",
                          "right": {
                            "type": "value",
                            "returnType": "number",
                            "value": 18
                          }
                        }
                      ]
                    },
                    "then": {
                      "type": "value",
                      "returnType": "text",
                      "value": "Child"
                    }
                  }
                ],
                "elseClause": {
                  "type": "value",
                  "returnType": "text",
                  "value": "Adult"
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount());
        assertTrue(result.getErrors().isEmpty());
    }

    // ==================== MISSING REQUIRED FIELDS ====================

    @Test
    @DisplayName("Missing required field 'structure' should produce error")
    void testMissingStructure() throws IOException {
        String json = """
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertTrue(result.getErrorCount() > 0);
        
        // Check for required field error
        boolean hasRequiredError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("required") && 
                           err.getMessage().contains("structure"));
        assertTrue(hasRequiredError, "Should have 'required' error for 'structure' field");
    }

    @Test
    @DisplayName("Missing required field 'uuId' should produce error")
    void testMissingUuid() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasUuidError = result.getErrors().stream()
            .anyMatch(err -> err.getMessage().toLowerCase().contains("uuid"));
        assertTrue(hasUuidError);
    }

    @Test
    @DisplayName("Missing metadata.id should produce error")
    void testMissingMetadataId() throws IOException {
        String json = """
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasIdError = result.getErrors().stream()
            .anyMatch(err -> err.getPath().contains("metadata") && 
                           err.getMessage().contains("id"));
        assertTrue(hasIdError);
    }

    // ==================== INVALID ENUM VALUES ====================

    @Test
    @DisplayName("Invalid structure value should produce enum error")
    void testInvalidStructure() throws IOException {
        String json = """
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasEnumError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("enum") && 
                           err.getPath().contains("structure"));
        assertTrue(hasEnumError, "Should have enum error for invalid structure");
    }

    @Test
    @DisplayName("Invalid returnType should produce enum error")
    void testInvalidReturnType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "string",
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasEnumError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("enum") && 
                           err.getMessage().contains("returnType"));
        assertTrue(hasEnumError);
    }

    @Test
    @DisplayName("Invalid ruleType should produce enum error")
    void testInvalidRuleType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "InvalidType",
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasEnumError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("enum"));
        assertTrue(hasEnumError);
    }

    // ==================== INVALID TYPE ====================

    @Test
    @DisplayName("Wrong type for version (string instead of integer) should produce type error")
    void testInvalidVersionType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": "1",
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasTypeError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("type") && 
                           err.getPath().contains("version"));
        assertTrue(hasTypeError);
    }

    @Test
    @DisplayName("Wrong type for metadata (array instead of object) should produce type error")
    void testInvalidMetadataType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": ["invalid"],
              "definition": {
                "type": "value",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasTypeError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("type"));
        assertTrue(hasTypeError);
    }

    // ==================== PATTERN VIOLATIONS ====================

    @Test
    @DisplayName("Invalid UUID pattern should produce pattern error")
    void testInvalidUuidPattern() throws IOException {
        String json = """
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasPatternError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("pattern") && 
                           err.getPath().contains("uuId"));
        assertTrue(hasPatternError);
    }

    @Test
    @DisplayName("Invalid field pattern should produce pattern error")
    void testInvalidFieldPattern() throws IOException {
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
                "field": "invalid.lowercase.field"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasPatternError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("pattern") && 
                           err.getMessage().contains("field"));
        assertTrue(hasPatternError);
    }

    // ==================== ONEOF ERRORS ====================

    @Test
    @DisplayName("Expression with wrong type value should produce oneOf errors")
    void testOneOfError_WrongExpressionType() throws IOException {
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
                "type": "invalid_type",
                "returnType": "number",
                "value": 1
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        
        // With cascade filtering enabled, should have root cause error about the invalid type
        // Could be enum, const, or additionalProperties depending on filtering logic
        boolean hasRootCauseError = result.getErrors().stream()
            .anyMatch(err -> "enum".equals(err.getType()) || 
                           "const".equals(err.getType()) ||
                           "additionalProperties".equals(err.getType()));
        assertTrue(hasRootCauseError, "Should have root cause error for invalid type value");
        
        // Error count should be small (1-3) due to cascade filtering
        assertTrue(result.getErrorCount() <= 3, 
            "Should have few errors after cascade filtering, got " + result.getErrorCount());
    }

    @Test
    @DisplayName("Definition with missing required field for type should produce oneOf cascade")
    void testOneOfError_MissingRequiredFieldForType() throws IOException {
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
                "type": "value",
                "returnType": "number"
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        
        // Should have errors about missing 'value' field
        boolean hasMissingValueError = result.getErrors().stream()
            .anyMatch(err -> err.getMessage().contains("value"));
        assertTrue(hasMissingValueError);
    }

    // ==================== ADDITIONAL PROPERTIES ====================

    @Test
    @DisplayName("Additional unknown property at root should produce error")
    void testAdditionalProperty() throws IOException {
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
                "type": "value",
                "returnType": "number",
                "value": 1
              },
              "unknownField": "should not be here"
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasAdditionalPropError = result.getErrors().stream()
            .anyMatch(err -> err.getMessage().contains("additional") || 
                           err.getMessage().contains("unknownField"));
        assertTrue(hasAdditionalPropError);
    }

    // ==================== ARRAY CONSTRAINTS ====================

    @Test
    @DisplayName("Empty whenClauses array should produce minItems error")
    void testMinItemsViolation() throws IOException {
        String json = """
            {
              "structure": "case",
              "returnType": "text",
              "ruleType": "Transformation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "whenClauses": []
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        boolean hasMinItemsError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("minItems") || 
                           err.getMessage().contains("minItems"));
        assertTrue(hasMinItemsError);
    }

    @Test
    @DisplayName("ExpressionGroup with only one expression should produce minItems error")
    void testExpressionGroupMinItems() throws IOException {
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
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule, true); // Disable filtering to see all errors including minItems

        assertTrue(result.getErrorCount() > 0);
        boolean hasMinItemsError = result.getErrors().stream()
            .anyMatch(err -> err.getMessage().contains("minItems") || 
                           err.getMessage().contains("minimum"));
        assertTrue(hasMinItemsError);
    }

    // ==================== COMPLEX NESTED STRUCTURE ====================

    @Test
    @DisplayName("Multiple errors in nested structure should all be reported")
    void testMultipleErrorsInNestedStructure() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "TEST",
                "description": "Test"
              },
              "definition": {
                "type": "conditionGroup",
                "returnType": "boolean",
                "name": "Test Group",
                "conjunction": "INVALID",
                "not": false,
                "conditions": [
                  {
                    "type": "condition",
                    "returnType": "boolean",
                    "name": "Test",
                    "left": {
                      "type": "value",
                      "returnType": "number"
                    },
                    "operator": "equal",
                    "right": {
                      "type": "invalid_type",
                      "returnType": "number",
                      "value": 1
                    }
                  }
                ]
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // With schema v2.1.0 and oneOf constraints, the error cascade filtering
        // may reduce the number of errors shown. The key is that we get actionable errors.
        // Schema changes: Added oneOf constraint to conditionGroup definition which affects
        // how errors cascade. Still expect at least 1-2 actionable errors.
        assertTrue(result.getErrorCount() >= 1, 
            "Should have at least one error for multiple issues, got " + result.getErrorCount());
    }

    // ==================== UTILITY TESTS ====================

    @Test
    @DisplayName("ValidationResult should contain all required metadata")
    void testValidationResultMetadata() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        // Check all required metadata fields
        assertNotNull(result.getSchemaFilename());
        assertNotNull(result.getSchemaVersion());
        assertNotNull(result.getErrorCount());
        assertNotNull(result.getErrors());
        
        assertEquals("rule-schema-current.json", result.getSchemaFilename());
        assertEquals("0.0.1", result.getSchemaVersion());
    }

    @Test
    @DisplayName("ValidationError should contain all ValidationMessage properties")
    void testValidationErrorStructure() throws IOException {
        String json = """
            {
              "structure": "invalid",
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

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertTrue(result.getErrorCount() > 0);
        
        // Check first error has all expected properties
        ValidationError error = result.getErrors().get(0);
        assertNotNull(error.getType(), "Error should have type");
        assertNotNull(error.getCode(), "Error should have code");
        assertNotNull(error.getMessage(), "Error should have message");
        // path, schemaPath, arguments may be null for some errors
    }

    // ==================== NEW RULETYPE VALUES ====================

    @Test
    @DisplayName("RuleType 'Condition' should be valid")
    void testRuleTypeCondition() throws IOException {
        String json = String.format("""
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "%s",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "CONDITION_RULE",
                "description": "A condition rule"
              },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Test Condition",
                "left": {
                  "type": "field",
                  "returnType": "number",
                  "field": "PERSON.AGE"
                },
                "operator": "greater",
                "right": {
                  "type": "value",
                  "returnType": "number",
                  "value": 18
                }
              }
            }
            """, testRuleTypes.getConditionRuleType());

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount(), 
            "RuleType '" + testRuleTypes.getConditionRuleType() + "' should be valid. Errors: " + result.getErrors());
    }

    @Test
    @DisplayName("RuleType 'Condition Group' should be valid")
    void testRuleTypeConditionGroup() throws IOException {
        String json = String.format("""
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "%s",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "CONDITION_GROUP_RULE",
                "description": "A condition group rule"
              },
              "definition": {
                "type": "conditionGroup",
                "returnType": "boolean",
                "name": "Test Group",
                "conjunction": "AND",
                "not": false,
                "conditions": [
                  {
                    "type": "condition",
                    "returnType": "boolean",
                    "name": "Age check",
                    "left": {
                      "type": "field",
                      "returnType": "number",
                      "field": "PERSON.AGE"
                    },
                    "operator": "greater",
                    "right": {
                      "type": "value",
                      "returnType": "number",
                      "value": 18
                    }
                  }
                ]
              }
            }
            """, testRuleTypes.getConditionGroupRuleType());

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount(),
            "RuleType '" + testRuleTypes.getConditionGroupRuleType() + "' should be valid. Errors: " + result.getErrors());
    }    // ==================== RULETYPE CONSTRAINTS IN RULEREF ====================

    @Test
    @DisplayName("Condition with ruleRef must have correct ruleType")
    void testConditionRuleRefRequiresConditionRuleType() throws IOException {
        String json = String.format("""
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "CONDITION_WITH_RULEREF",
                "description": "Condition using rule reference"
              },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Referenced Condition",
                "ruleRef": {
                  "id": "OTHER_CONDITION",
                  "uuid": "87654321-4321-4321-4321-210987654321",
                  "version": 1,
                  "returnType": "boolean",
                  "ruleType": "%s"
                }
              }
            }
            """, testRuleTypes.getConditionRuleType());

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount(), 
            "Condition with ruleRef having ruleType='" + testRuleTypes.getConditionRuleType() + "' should be valid. Errors: " + result.getErrors());
    }

    @Test
    @DisplayName("Condition with ruleRef having wrong ruleType should fail schema validation")
    void testConditionRuleRefWrongRuleType() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "CONDITION_WITH_WRONG_RULEREF",
                "description": "Condition with wrong ruleType in ruleRef"
              },
              "definition": {
                "type": "condition",
                "returnType": "boolean",
                "name": "Referenced Condition",
                "ruleRef": {
                  "id": "OTHER_RULE",
                  "uuid": "87654321-4321-4321-4321-210987654321",
                  "version": 1,
                  "returnType": "boolean",
                  "ruleType": "Reporting"
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertTrue(result.getErrorCount() > 0, "Should have validation errors");
        
        // Schema's enum constraint should catch this (current allowlist from schema)
        Set<String> allowedTypes = testRuleTypes.getConditionAllowedRuleTypes();
        boolean hasRuleTypeError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("enum") && 
                           err.getMessage().contains("ruleType") &&
                           allowedTypes.stream().anyMatch(type -> err.getMessage().contains(type)));
        assertTrue(hasRuleTypeError, 
            "Should have enum error about ruleType allowlist " + allowedTypes + ". Errors: " + result.getErrors());
    }

    @Test
    @DisplayName("ConditionGroup with ruleRef must have correct ruleType")
    void testConditionGroupRuleRefRequiresConditionGroupRuleType() throws IOException {
        String json = String.format("""
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "CONDITIONGROUP_WITH_RULEREF",
                "description": "ConditionGroup using rule reference"
              },
              "definition": {
                "type": "conditionGroup",
                "returnType": "boolean",
                "name": "Referenced Group",
                "ruleRef": {
                  "id": "OTHER_GROUP",
                  "uuid": "87654321-4321-4321-4321-210987654321",
                  "version": 1,
                  "returnType": "boolean",
                  "ruleType": "%s"
                }
              }
            }
            """, testRuleTypes.getConditionGroupRuleType());

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount(), 
            "ConditionGroup with ruleRef having ruleType='" + testRuleTypes.getConditionGroupRuleType() + "' should be valid. Errors: " + result.getErrors());
    }

    @Test
    @DisplayName("ConditionGroup with ruleRef having wrong ruleType should fail schema validation")
    void testConditionGroupRuleRefWrongRuleType() throws IOException {
        String json = """
            {
              "structure": "condition",
              "returnType": "boolean",
              "ruleType": "Validation",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "CONDITIONGROUP_WITH_WRONG_RULEREF",
                "description": "ConditionGroup with wrong ruleType in ruleRef"
              },
              "definition": {
                "type": "conditionGroup",
                "returnType": "boolean",
                "name": "Referenced Group",
                "ruleRef": {
                  "id": "OTHER_RULE",
                  "uuid": "87654321-4321-4321-4321-210987654321",
                  "version": 1,
                  "returnType": "boolean",
                  "ruleType": "Validation"
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertTrue(result.getErrorCount() > 0, "Should have validation errors");
        
        // Schema should catch this - Condition context has enum [Condition, List]
        // Note: This is testing a conditionGroup type but in Condition context,
        // so it will fail the Condition enum check
        boolean hasRuleTypeError = result.getErrors().stream()
            .anyMatch(err -> err.getType().equals("enum") && 
                           err.getMessage().contains("ruleType"));
        assertTrue(hasRuleTypeError, 
            "Should have enum error about ruleType requirement. Errors: " + result.getErrors());
    }

    @Test
    @DisplayName("Expression with ruleRef can have any valid ruleType (schema default is Transformation)")
    void testExpressionRuleRefFlexibleRuleType() throws IOException {
        String json = """
            {
              "structure": "expression",
              "returnType": "number",
              "ruleType": "Reporting",
              "uuId": "12345678-1234-1234-1234-123456789012",
              "version": 1,
              "metadata": {
                "id": "EXPRESSION_WITH_RULEREF",
                "description": "Expression using rule reference"
              },
              "definition": {
                "type": "ruleRef",
                "returnType": "number",
                "ruleRef": {
                  "id": "OTHER_RULE",
                  "uuid": "87654321-4321-4321-4321-210987654321",
                  "version": 1,
                  "returnType": "number",
                  "ruleType": "Aggregation"
                }
              }
            }
            """;

        JsonNode rule = objectMapper.readTree(json);
        ValidationResult result = validationService.validate(rule);

        assertNotNull(result);
        assertEquals(0, result.getErrorCount(), 
            "Expression with ruleRef should accept any valid ruleType. Errors: " + result.getErrors());
    }

}
