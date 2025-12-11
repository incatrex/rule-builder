# Enhanced Rule Validation Service - Design Proposal

**Date:** November 24, 2025  
**Version:** 1.0  
**Status:** Proposal

---

## Executive Summary

This document proposes a comprehensive backend validation service that validates rule JSON against both structural constraints (JSON Schema) and business logic rules (x-ui extensions). The service will provide user-friendly error messages with hierarchical path information to help users quickly identify and fix issues.

---

## 1. Goals & Requirements

### Primary Goals
1. **Move all validation to backend** - Single source of truth for validation logic
2. **User-friendly error messages** - Clear, actionable feedback with context
3. **Schema-driven validation** - Minimize code changes when schema evolves
4. **Hierarchical error paths** - Show exact location in nested rule structures
5. **100% test coverage** - Comprehensive unit and integration tests

### Requirements
- ✅ Validate JSON structure against JSON Schema Draft 7
- ✅ Validate operator compatibility with return types (x-ui-types)
- ✅ Validate function definitions and arguments (x-ui-functions)
- ✅ Validate expression operators (x-ui-expression-operators)
- ✅ Validate operator cardinality (right-side expression count)
- ✅ Provide human-readable error paths (not just JSON paths)
- ✅ Return structured error objects for programmatic consumption
- ✅ Support incremental validation (stop on critical errors)

---

## 2. Architecture Overview

### 2.1 Service Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│         RuleValidationService (Orchestrator)                │
│  - Coordinates all validators                                │
│  - Manages validation flow                                   │
│  - Aggregates and deduplicates errors                        │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐           ┌─────────▼──────────┐
│ Layer 1:        │           │ Support Services   │
│ Schema          │           │ ─────────────────  │
│ Validation      │           │ • PathTracker      │
└────────┬────────┘           │ • SchemaMetadata   │
         │                    │   Extractor        │
┌────────▼─────────────────┐  │ • ErrorMessage     │
│ Layer 2:                 │  │   Builder          │
│ Business Logic           │  └────────────────────┘
│ ─────────────────────    │
│ • OperatorValidator      │
│ • FunctionValidator      │
│ • ExpressionOperator     │
│   Validator              │
│ • TypeCompatibility      │
│   Validator              │
└──────────────────────────┘
```

### 2.2 Validation Flow

```
1. Rule JSON Input
   ↓
2. JSON Schema Validation (structure, types, required fields)
   ↓ (if critical errors, stop)
3. Custom Business Logic Validation
   ├─→ Operator Validation
   ├─→ Function Validation
   ├─→ Expression Operator Validation
   └─→ Type Compatibility Validation
   ↓
4. Aggregate & Deduplicate Errors
   ↓
5. Return ValidationResult
```

---

## 3. Error Message Format

### 3.1 ValidationResult Structure

```json
{
  "valid": false,
  "errors": [
    {
      "severity": "error",
      "code": "INVALID_CONDITION_OPERATOR",
      "message": "Operator 'contains' is not valid for return type 'number'. Valid operators: equal, not_equal, less, less_or_equal, greater, greater_or_equal, between, not_between, is_empty, is_not_empty, in, not_in",
      "path": "definition.conditions[0].conditions[1].operator",
      "humanPath": "Condition Group 'Sales Rules' → Condition Group 'Age Validation' → Condition 'Check Customer Age' → Operator",
      "field": "operator",
      "location": {
        "line": 45,
        "column": 18
      },
      "expectedValues": ["equal", "not_equal", "less", "less_or_equal", "greater", "greater_or_equal", "between", "not_between", "is_empty", "is_not_empty", "in", "not_in"],
      "actualValue": "contains",
      "suggestion": "Change operator to 'equal' or use a text field instead",
      "context": {
        "conditionName": "Check Customer Age",
        "returnType": "number",
        "leftExpression": {
          "type": "field",
          "field": "CUSTOMER.AGE"
        }
      }
    }
  ],
  "warnings": [
    {
      "severity": "warning",
      "code": "NESTED_TOO_DEEP",
      "message": "Rule nesting depth (8 levels) exceeds recommended maximum (6 levels). Consider simplifying the rule structure.",
      "path": "definition.conditions[0].conditions[2].conditions[1].conditions[0]",
      "humanPath": "Condition Group 'Main' → Condition Group 'Level 2' → Condition Group 'Level 3' → ..."
    }
  ],
  "metadata": {
    "validationTime": "2025-11-24T14:45:00Z",
    "schemaVersion": "v2.0.2",
    "validatedFields": 47,
    "validationDurationMs": 12
  }
}
```

### 3.2 Error Severity Levels

- **`error`**: Rule is invalid and cannot be executed
- **`warning`**: Rule is valid but may have issues (performance, maintainability)

---

## 4. Complete Error Catalog

### 4.1 Schema-Level Errors (JSON Schema)

| Code | Message Template | Example |
|------|------------------|---------|
| `MISSING_REQUIRED_FIELD` | Required field '{field}' is missing | Field 'returnType' is required but missing |
| `INVALID_TYPE` | Field '{field}' must be type {expectedType}, found {actualType} | Field 'version' must be integer, found string |
| `INVALID_ENUM_VALUE` | Field '{field}' must be one of [{validValues}], found '{actualValue}' | Field 'structure' must be one of [case, condition, expression], found 'rule' |
| `PATTERN_MISMATCH` | Field '{field}' must match pattern {pattern} | Field 'uuid' must match UUID pattern |
| `ARRAY_TOO_SHORT` | Array '{field}' must have at least {minItems} items, found {actualCount} | Array 'expressions' must have at least 2 items, found 1 |
| `ARRAY_TOO_LONG` | Array '{field}' must have at most {maxItems} items, found {actualCount} | Array 'right' must have at most 10 items, found 12 |
| `NUMBER_TOO_SMALL` | Field '{field}' must be >= {minimum}, found {actualValue} | Field 'version' must be >= 1, found 0 |
| `ADDITIONAL_PROPERTY` | Unexpected property '{property}' found | Property 'customField' is not allowed |

### 4.2 Operator Validation Errors

| Code | Message Template | When It Occurs |
|------|------------------|----------------|
| `INVALID_CONDITION_OPERATOR` | Operator '{operator}' is not valid for return type '{returnType}'. Valid operators: [{validOps}] | 'contains' used with number type |
| `INVALID_OPERATOR_CARDINALITY` | Operator '{operator}' requires {expected} expression(s) on the right side, found {actual} | 'between' with 1 expression instead of 2 |
| `MISSING_RIGHT_EXPRESSION` | Operator '{operator}' requires a right side expression, but it is null or missing | 'equal' operator with null right side |
| `UNEXPECTED_RIGHT_EXPRESSION` | Operator '{operator}' should not have a right side expression | 'is_empty' with a right side expression |
| `RIGHT_SIDE_NOT_ARRAY` | Operator '{operator}' requires an array of expressions on the right side | 'in' operator with single expression |
| `RIGHT_SIDE_ARRAY_WRONG_SIZE` | Operator '{operator}' requires {min}-{max} expressions on the right side, found {actual} | 'between' with 3 expressions |

### 4.3 Expression Operator Validation Errors

| Code | Message Template | When It Occurs |
|------|------------------|----------------|
| `INVALID_EXPRESSION_OPERATOR` | Operator '{operator}' is not valid for return type '{returnType}'. Valid operators: [{validOps}] | Using '+' with date type |
| `OPERATOR_COUNT_MISMATCH` | Expression group must have exactly {expected} operators (expressions.length - 1), found {actual} | 3 expressions with 1 operator |
| `OPERATOR_SYMBOL_MISMATCH` | Operator symbol '{symbol}' does not match any valid expression operator | Using '?' as operator |
| `INCOMPATIBLE_EXPRESSION_TYPES` | Expressions in group have incompatible return types: [{types}] | Mixing number and text expressions with '+' |

### 4.4 Function Validation Errors

| Code | Message Template | When It Occurs |
|------|------------------|----------------|
| `UNKNOWN_FUNCTION` | Function '{functionName}' is not defined in schema | Using 'MATH.POWER' which doesn't exist |
| `MISSING_REQUIRED_ARG` | Required argument '{argName}' is missing for function '{functionName}' | MATH.SUBTRACT missing 'num2' |
| `INVALID_ARG_COUNT` | Function '{functionName}' requires {min}-{max} arguments, found {actual} | MATH.ADD with 1 argument (needs 2-10) |
| `INVALID_ARG_NAME` | Argument name '{argName}' is not valid for function '{functionName}'. Expected: [{validNames}] | Using 'number' instead of 'num1' |
| `INVALID_ARG_ORDER` | Arguments are in wrong order. Expected order: [{expectedOrder}], found: [{actualOrder}] | 'num2' before 'num1' |
| `INVALID_ARG_TYPE` | Argument '{argName}' must return type '{expectedType}', found '{actualType}' | TEXT.CONCAT arg1 with number type |
| `INVALID_ARG_VALUE_SOURCE` | Argument '{argName}' cannot be type '{expressionType}'. Allowed: [{validSources}] | Using 'ruleRef' when only 'value' allowed |
| `UNEXPECTED_FUNCTION_ARG` | Unexpected argument '{argName}' for function '{functionName}' | Extra 'num3' for MATH.SUBTRACT |
| `FUNCTION_RETURN_TYPE_MISMATCH` | Function '{functionName}' returns '{functionReturnType}' but context expects '{expectedType}' | TEXT.CONCAT in numeric expression |

### 4.5 Type Consistency Errors

| Code | Message Template | When It Occurs |
|------|------------------|----------------|
| `TYPE_MISMATCH` | Expression return type '{actualType}' does not match expected type '{expectedType}' | Boolean expression in number context |
| `CONDITION_LEFT_RIGHT_INCOMPATIBLE` | Left side type '{leftType}' and right side type '{rightType}' are not comparable with operator '{operator}' | Comparing text to date |
| `CASE_TYPE_MISMATCH` | All THEN clauses must return the same type. Found: [{types}] | THEN clauses returning number and text |
| `EXPRESSION_GROUP_TYPE_MISMATCH` | All expressions in group must have compatible types for operator '{operator}'. Found: [{types}] | Adding number and text |
| `RULE_RETURN_TYPE_MISMATCH` | Rule top-level returnType '{declaredType}' does not match definition return type '{actualType}' | Rule says 'number' but definition returns text |

### 4.6 Structural Errors

| Code | Message Template | When It Occurs |
|------|------------------|----------------|
| `EMPTY_EXPRESSION_GROUP` | Expression group must have at least 2 expressions, found {count} | ExpressionGroup with 0 or 1 expression |
| `EMPTY_WHEN_CLAUSES` | Case structure must have at least one WHEN clause | whenClauses array is empty |
| `EMPTY_CONDITION_GROUP` | Condition group '{name}' has no conditions (warning) | Empty conditions array |
| `NESTED_TOO_DEEP` | Rule nesting depth ({depth} levels) exceeds recommended maximum ({maxDepth} levels) | 8 levels of nested condition groups |

### 4.7 Reference Errors (Optional - if metadata available)

| Code | Message Template | When It Occurs |
|------|------------------|----------------|
| `INVALID_FIELD_REFERENCE` | Field '{fieldName}' does not exist in schema | TABLE1.UNKNOWN_FIELD |
| `INVALID_RULE_REFERENCE` | Referenced rule '{ruleId}' (UUID: {uuid}, version: {version}) does not exist | RuleRef to non-existent rule |
| `CIRCULAR_RULE_REFERENCE` | Rule references itself directly or indirectly: {chain} | Rule A → Rule B → Rule A |

---

## 5. Path Tracking Strategy

### 5.1 JSON Path Format
Standard JSONPath notation for programmatic access:
```
definition.conditions[0].conditions[1].left.function.args[0].value
```

### 5.2 Human-Readable Path Format
Uses names from rule structure for user understanding:
```
Condition Group 'Sales Rules' → Condition Group 'Age Checks' → 
Condition 'Verify Customer Age' → Left Side → Function 'MATH.ADD' → 
Argument 'num1' (1 of 2)
```

### 5.3 Path Building Rules

1. **Condition Groups**: Use `name` field
   ```
   "Condition Group 'Main Rules'"
   ```

2. **Conditions**: Use `name` field
   ```
   "Condition 'Check Age'"
   ```

3. **Arrays**: Include index with context
   ```
   "WHEN Clause 2 of 3"
   "Expression 1 of 4"
   "Argument 'num1' (1 of 2)"
   ```

4. **Functions**: Include function name
   ```
   "Function 'MATH.ADD'"
   ```

5. **Sides**: Be explicit
   ```
   "Left Side"
   "Right Side"
   ```

6. **Nested Expressions**: Show hierarchy
   ```
   "Expression Group (2 expressions) → Expression 1"
   ```

---

## 6. Implementation Components

### 6.1 Core Java Classes

#### Data Models
```java
// ValidationError.java
public class ValidationError {
    private String severity;        // "error" | "warning"
    private String code;            // Error code from catalog
    private String message;         // User-friendly message
    private String path;            // JSON path
    private String humanPath;       // Human-readable path
    private String field;           // Field name
    private Object expectedValues;  // Expected value(s)
    private Object actualValue;     // Actual value
    private String suggestion;      // Fix suggestion
    private Map<String, Object> context; // Additional context
    private Location location;      // Line/column (if available)
}

// ValidationResult.java
public class ValidationResult {
    private boolean valid;
    private List<ValidationError> errors;
    private List<ValidationError> warnings;
    private ValidationMetadata metadata;
    
    public boolean hasErrors() { return !errors.isEmpty(); }
    public boolean hasCriticalErrors() { /* schema errors */ }
    public void addError(ValidationError error) { /* ... */ }
    public void addWarning(ValidationError warning) { /* ... */ }
}

// PathContext.java
public class PathContext {
    private List<String> jsonPathSegments;
    private List<String> humanPathSegments;
    
    public void push(String jsonSegment, String humanSegment) { /* ... */ }
    public void pop() { /* ... */ }
    public String getJsonPath() { return String.join(".", jsonPathSegments); }
    public String getHumanPath() { return String.join(" → ", humanPathSegments); }
    public PathContext clone() { /* ... */ }
}

// ValidationConfig.java
public class ValidationConfig {
    private boolean stopOnFirstError;
    private boolean includeWarnings;
    private int maxNestingDepth;
    private boolean validateFieldReferences;
    
    public static ValidationConfig defaultConfig() { /* ... */ }
}
```

#### Validator Classes
```java
// SchemaValidator.java (enhanced existing)
@Component
public class SchemaValidator {
    private final JsonSchema schema;
    
    public List<ValidationError> validate(JsonNode rule) {
        // Perform JSON Schema validation
        // Convert library errors to our ValidationError format
    }
}

// OperatorValidator.java
@Component
public class OperatorValidator {
    private final SchemaMetadataExtractor metadataExtractor;
    
    public List<ValidationError> validateCondition(
        JsonNode condition, 
        PathContext context
    ) {
        // Validate operator compatibility with left side return type
        // Validate cardinality (right side count)
    }
}

// FunctionValidator.java
@Component
public class FunctionValidator {
    private final SchemaMetadataExtractor metadataExtractor;
    
    public List<ValidationError> validateFunction(
        JsonNode function,
        String expectedReturnType,
        PathContext context
    ) {
        // Validate function exists in schema
        // Validate argument count, names, order, types
        // Validate value sources
    }
}

// ExpressionOperatorValidator.java
@Component
public class ExpressionOperatorValidator {
    private final SchemaMetadataExtractor metadataExtractor;
    
    public List<ValidationError> validateExpressionGroup(
        JsonNode expressionGroup,
        PathContext context
    ) {
        // Validate operator count matches expression count
        // Validate operators are valid for return type
        // Validate expression type compatibility
    }
}

// TypeCompatibilityValidator.java
@Component
public class TypeCompatibilityValidator {
    public List<ValidationError> validateTypeConsistency(
        JsonNode rule,
        PathContext context
    ) {
        // Validate return types match across structure
        // Validate CASE THEN clauses have same type
        // Validate expression groups have compatible types
    }
}
```

#### Utility Classes
```java
// SchemaMetadataExtractor.java
@Component
public class SchemaMetadataExtractor {
    private final JsonNode schema;
    
    public Map<String, List<String>> getValidOperatorsForType(String returnType) {
        // Extract from x-ui-types
    }
    
    public Map<String, Object> getFunctionMetadata(String functionName) {
        // Extract from x-ui-functions
    }
    
    public Map<String, String> getExpressionOperatorSymbols() {
        // Extract from x-ui-expression-operators
    }
    
    public int getOperatorCardinality(String operator) {
        // Extract from x-ui-operators
    }
}

// ErrorMessageBuilder.java
@Component
public class ErrorMessageBuilder {
    public String buildMessage(String template, Map<String, Object> params) {
        // Template substitution with formatting
    }
    
    public String buildSuggestion(String errorCode, Map<String, Object> context) {
        // Generate helpful suggestion based on error
    }
}

// ValidationUtils.java
public class ValidationUtils {
    public static String getReturnType(JsonNode expression) { /* ... */ }
    public static boolean isConditionGroup(JsonNode node) { /* ... */ }
    public static boolean isExpression(JsonNode node) { /* ... */ }
    public static int calculateNestingDepth(JsonNode node) { /* ... */ }
}
```

### 6.2 Enhanced RuleValidationService

```java
@Service
public class RuleValidationService {
    
    private final SchemaValidator schemaValidator;
    private final OperatorValidator operatorValidator;
    private final FunctionValidator functionValidator;
    private final ExpressionOperatorValidator expressionOperatorValidator;
    private final TypeCompatibilityValidator typeCompatibilityValidator;
    private final SchemaMetadataExtractor metadataExtractor;
    private final ObjectMapper objectMapper;
    
    /**
     * Main validation entry point
     */
    public ValidationResult validateRule(JsonNode rule) {
        return validateRule(rule, ValidationConfig.defaultConfig());
    }
    
    public ValidationResult validateRule(JsonNode rule, ValidationConfig config) {
        ValidationResult result = new ValidationResult();
        PathContext context = new PathContext();
        
        // Layer 1: JSON Schema validation
        List<ValidationError> schemaErrors = schemaValidator.validate(rule);
        result.addErrors(schemaErrors);
        
        if (config.isStopOnFirstError() && result.hasCriticalErrors()) {
            return result;
        }
        
        // Layer 2: Business logic validation
        try {
            String structure = rule.get("structure").asText();
            JsonNode definition = rule.get("definition");
            
            context.push("definition", "Rule Definition");
            
            switch (structure) {
                case "condition":
                    validateConditionStructure(definition, context, result, config);
                    break;
                case "expression":
                    validateExpressionStructure(definition, context, result, config);
                    break;
                case "case":
                    validateCaseStructure(definition, context, result, config);
                    break;
            }
            
            context.pop();
            
            // Layer 3: Type consistency validation
            result.addErrors(typeCompatibilityValidator.validateTypeConsistency(rule, context));
            
        } catch (Exception e) {
            // Handle unexpected validation errors
            result.addError(createInternalError(e, context));
        }
        
        return result;
    }
    
    private void validateConditionStructure(
        JsonNode definition, 
        PathContext context, 
        ValidationResult result,
        ValidationConfig config
    ) {
        if (isConditionGroup(definition)) {
            validateConditionGroup(definition, context, result, config);
        } else {
            validateCondition(definition, context, result, config);
        }
    }
    
    private void validateConditionGroup(
        JsonNode group,
        PathContext context,
        ValidationResult result,
        ValidationConfig config
    ) {
        String name = group.get("name").asText();
        context.push("", String.format("Condition Group '%s'", name));
        
        // Validate conditions array
        JsonNode conditions = group.get("conditions");
        if (conditions.size() == 0 && config.isIncludeWarnings()) {
            result.addWarning(createEmptyGroupWarning(name, context));
        }
        
        for (int i = 0; i < conditions.size(); i++) {
            JsonNode condition = conditions.get(i);
            context.push(
                String.format("conditions[%d]", i),
                String.format("Item %d of %d", i + 1, conditions.size())
            );
            
            if (isConditionGroup(condition)) {
                validateConditionGroup(condition, context, result, config);
            } else {
                validateCondition(condition, context, result, config);
            }
            
            context.pop();
        }
        
        context.pop();
    }
    
    private void validateCondition(
        JsonNode condition,
        PathContext context,
        ValidationResult result,
        ValidationConfig config
    ) {
        String name = condition.get("name").asText();
        context.push("", String.format("Condition '%s'", name));
        
        // Validate operator compatibility
        result.addErrors(operatorValidator.validateCondition(condition, context));
        
        // Validate left side
        JsonNode left = condition.get("left");
        context.push("left", "Left Side");
        validateExpression(left, null, context, result, config);
        context.pop();
        
        // Validate right side
        JsonNode right = condition.get("right");
        if (right != null && !right.isNull()) {
            context.push("right", "Right Side");
            if (right.isArray()) {
                for (int i = 0; i < right.size(); i++) {
                    context.push(
                        String.format("[%d]", i),
                        String.format("Expression %d of %d", i + 1, right.size())
                    );
                    validateExpression(right.get(i), null, context, result, config);
                    context.pop();
                }
            } else {
                validateExpression(right, null, context, result, config);
            }
            context.pop();
        }
        
        context.pop();
    }
    
    private void validateExpression(
        JsonNode expression,
        String expectedReturnType,
        PathContext context,
        ValidationResult result,
        ValidationConfig config
    ) {
        if (isExpressionGroup(expression)) {
            validateExpressionGroup(expression, context, result, config);
        } else {
            String type = expression.get("type").asText();
            
            if ("function".equals(type)) {
                JsonNode function = expression.get("function");
                String returnType = expression.get("returnType").asText();
                
                context.push("function", String.format("Function '%s'", function.get("name").asText()));
                result.addErrors(functionValidator.validateFunction(
                    function, returnType, context
                ));
                context.pop();
            }
            
            // Validate type matches expected if provided
            if (expectedReturnType != null) {
                String actualType = expression.get("returnType").asText();
                if (!actualType.equals(expectedReturnType)) {
                    result.addError(createTypeMismatchError(
                        expectedReturnType, actualType, context
                    ));
                }
            }
        }
    }
    
    private void validateExpressionGroup(
        JsonNode group,
        PathContext context,
        ValidationResult result,
        ValidationConfig config
    ) {
        context.push("", "Expression Group");
        
        result.addErrors(expressionOperatorValidator.validateExpressionGroup(group, context));
        
        JsonNode expressions = group.get("expressions");
        for (int i = 0; i < expressions.size(); i++) {
            context.push(
                String.format("expressions[%d]", i),
                String.format("Expression %d of %d", i + 1, expressions.size())
            );
            validateExpression(expressions.get(i), null, context, result, config);
            context.pop();
        }
        
        context.pop();
    }
    
    private void validateCaseStructure(
        JsonNode caseContent,
        PathContext context,
        ValidationResult result,
        ValidationConfig config
    ) {
        JsonNode whenClauses = caseContent.get("whenClauses");
        
        for (int i = 0; i < whenClauses.size(); i++) {
            JsonNode whenClause = whenClauses.get(i);
            context.push(
                String.format("whenClauses[%d]", i),
                String.format("WHEN Clause %d of %d", i + 1, whenClauses.size())
            );
            
            // Validate WHEN condition
            context.push("when", "WHEN Condition");
            validateConditionGroup(whenClause.get("when"), context, result, config);
            context.pop();
            
            // Validate THEN expression
            context.push("then", "THEN Result");
            validateExpression(whenClause.get("then"), null, context, result, config);
            context.pop();
            
            context.pop();
        }
        
        // Validate ELSE if present
        if (caseContent.has("elseClause")) {
            context.push("elseClause", "ELSE Result");
            validateExpression(caseContent.get("elseClause"), null, context, result, config);
            context.pop();
        }
    }
    
    // Helper methods
    private boolean isConditionGroup(JsonNode node) {
        return node.has("type") && "conditionGroup".equals(node.get("type").asText());
    }
    
    private boolean isExpressionGroup(JsonNode node) {
        return node.has("type") && "expressionGroup".equals(node.get("type").asText());
    }
}
```

---

## 7. Test Strategy

### 7.1 Test Coverage Goals

**Target: 100% code coverage across all validator components**

### 7.2 Unit Test Structure

```
src/test/java/com/rulebuilder/service/validation/
├── SchemaValidatorTest.java           (20+ tests)
├── OperatorValidatorTest.java         (35+ tests)
├── FunctionValidatorTest.java         (45+ tests)
├── ExpressionOperatorValidatorTest.java (20+ tests)
├── TypeCompatibilityValidatorTest.java (15+ tests)
├── PathTrackerTest.java               (10+ tests)
└── RuleValidationServiceIntegrationTest.java (60+ tests)
```

### 7.3 Test Data Organization

```
src/test/resources/validation/
├── valid-rules/
│   ├── simple-condition.json
│   ├── nested-condition-groups.json
│   ├── expression-with-functions.json
│   ├── case-multiple-when.json
│   ├── complex-nested-rule.json
│   └── ... (10+ valid rule examples)
├── invalid-rules/
│   ├── schema/
│   │   ├── missing-required-field.json
│   │   ├── invalid-enum-value.json
│   │   ├── wrong-data-type.json
│   │   └── ... (10+ schema errors)
│   ├── operators/
│   │   ├── invalid-operator-for-type.json
│   │   ├── wrong-cardinality.json
│   │   ├── missing-right-side.json
│   │   └── ... (15+ operator errors)
│   ├── functions/
│   │   ├── unknown-function.json
│   │   ├── missing-required-arg.json
│   │   ├── wrong-arg-count.json
│   │   ├── invalid-arg-type.json
│   │   └── ... (20+ function errors)
│   └── types/
│       ├── type-mismatch.json
│       ├── case-inconsistent-types.json
│       └── ... (10+ type errors)
└── expected-errors/
    ├── missing-required-field-errors.json
    ├── invalid-operator-for-type-errors.json
    └── ... (matching expected error outputs)
```

### 7.4 Test Examples

#### Unit Test Example
```java
@Test
void testInvalidOperatorForNumberType() {
    // Given
    JsonNode condition = createCondition(
        "Check Age",
        createFieldExpression("CUSTOMER.AGE", "number"),
        "contains",  // Invalid for number
        createValueExpression(25, "number")
    );
    PathContext context = new PathContext();
    
    // When
    List<ValidationError> errors = operatorValidator.validateCondition(condition, context);
    
    // Then
    assertThat(errors).hasSize(1);
    ValidationError error = errors.get(0);
    assertThat(error.getCode()).isEqualTo("INVALID_CONDITION_OPERATOR");
    assertThat(error.getMessage()).contains("contains", "number");
    assertThat(error.getExpectedValues()).contains("equal", "less", "greater");
}
```

#### Parameterized Test Example
```java
@ParameterizedTest
@CsvSource({
    "number, contains, equal|not_equal|less|greater",
    "text, less, equal|not_equal|contains|starts_with",
    "date, concat, equal|not_equal|less|greater",
    "boolean, greater, equal|not_equal"
})
void testInvalidOperatorForReturnType(
    String returnType, 
    String invalidOperator, 
    String validOperators
) {
    // Test all invalid combinations systematically
}
```

#### Integration Test Example
```java
@Test
void testComplexNestedRuleWithMultipleErrors() throws IOException {
    // Given
    JsonNode rule = loadTestRule("invalid-rules/complex-multiple-errors.json");
    
    // When
    ValidationResult result = validationService.validateRule(rule);
    
    // Then
    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).hasSize(5);
    
    // Verify specific errors
    assertHasError(result, "INVALID_CONDITION_OPERATOR", 
        "definition.conditions[0].conditions[1].operator");
    assertHasError(result, "MISSING_REQUIRED_ARG",
        "definition.conditions[2].left.function.args");
    assertHasError(result, "OPERATOR_COUNT_MISMATCH",
        "definition.whenClauses[0].then.operators");
    
    // Verify human paths
    assertHasHumanPath(result, "INVALID_CONDITION_OPERATOR",
        "Condition Group 'Main' → Condition Group 'Sub' → Condition 'Check' → Operator");
}
```

---

## 8. Schema Issue: definition Field

### 8.1 Current Issue

The schema currently has:
```json
"definition": {
  "type": "object",
  "description": "The actual rule definition..."
}
```

And later uses conditional logic:
```json
"if": { "properties": { "structure": { "const": "condition" } } },
"then": { "properties": { "content": { "$ref": "#/definitions/ConditionGroup" } } }
```

**Problem**: Field is named `definition` but conditional references `content`!

### 8.2 Second Issue

When `structure: "condition"`, schema only allows `ConditionGroup`, but frontend allows either:
- Single `Condition`  
- `ConditionGroup` with nested conditions

### 8.3 Proposed Fix

```json
"if": {
  "properties": { "structure": { "const": "condition" } }
},
"then": {
  "properties": {
    "definition": {
      "oneOf": [
        { "$ref": "#/definitions/Condition" },
        { "$ref": "#/definitions/ConditionGroup" }
      ]
    }
  }
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Fix schema `definition` field issue
- ✅ Create ValidationError, ValidationResult, PathContext POJOs
- ✅ Implement PathTracker utility
- ✅ Implement SchemaMetadataExtractor
- ✅ Implement ErrorMessageBuilder
- ✅ Write unit tests for utilities (100% coverage)

### Phase 2: Core Validators (Week 2)
- ✅ Enhance SchemaValidator with better error messages
- ✅ Implement OperatorValidator
- ✅ Implement FunctionValidator
- ✅ Write comprehensive unit tests (100% coverage per validator)
- ✅ Create test data corpus (20+ test cases per validator)

### Phase 3: Advanced Validators (Week 3)
- ✅ Implement ExpressionOperatorValidator
- ✅ Implement TypeCompatibilityValidator
- ✅ Write unit tests (100% coverage)
- ✅ Create integration test data (40+ complex rules)

### Phase 4: Service Integration (Week 4)
- ✅ Enhance RuleValidationService to orchestrate all validators
- ✅ Implement recursive validation with path tracking
- ✅ Add error aggregation and deduplication
- ✅ Write integration tests (60+ scenarios)
- ✅ Achieve 100% overall coverage

### Phase 5: API & Frontend Integration (Week 5)
- ✅ Update REST controller to return new error format
- ✅ Update frontend to consume structured errors
- ✅ Implement UI components to display hierarchical errors
- ✅ Add inline validation feedback in rule builder
- ✅ End-to-end testing

---

## 10. Benefits & Impact

### Benefits
✅ **Single Source of Truth** - All validation logic in backend  
✅ **Maintainability** - Schema-driven approach minimizes code changes  
✅ **User Experience** - Clear, actionable error messages with context  
✅ **Debugging** - Human-readable paths help locate issues quickly  
✅ **Quality** - 100% test coverage ensures reliability  
✅ **Extensibility** - Easy to add new validation rules  
✅ **Performance** - Can short-circuit on critical errors  

### Impact
- **Reduced support requests** - Users can fix issues themselves
- **Faster development** - Clear validation feedback during rule creation
- **Higher quality rules** - Catch errors before execution
- **Easier testing** - Comprehensive validation makes testing easier
- **Better documentation** - Error catalog documents expected behavior

---

## 11. Success Metrics

- ✅ 100% code coverage across validation components
- ✅ < 50ms validation time for typical rules
- ✅ Zero false positives in validation errors
- ✅ 95%+ user satisfaction with error messages
- ✅ 50% reduction in invalid rules submitted

---

## Appendix A: Example Error Messages

### Good Error Message ✅
```
Operator 'contains' is not valid for return type 'number'. 

Valid operators for number: equal, not_equal, less, less_or_equal, 
greater, greater_or_equal, between, not_between, is_empty, is_not_empty, in, not_in

Location: Condition Group 'Sales Rules' → Condition 'Check Customer Age' → Operator

Suggestion: Change the operator to 'equal' or use a text field instead of CUSTOMER.AGE
```

### Poor Error Message ❌
```
Validation failed at $.definition.conditions[0].operator
```

---

## Appendix B: JSON Schema vs Business Logic

### JSON Schema Validation
- Structure (object, array, string, etc.)
- Required fields
- Data types
- Enums
- Patterns (regex)
- Min/max constraints
- Array length

### Business Logic Validation (Custom)
- Operator compatibility with types
- Function argument validation
- Expression operator compatibility
- Cardinality validation
- Type consistency across nested structures
- Semantic validation (field/rule references)

---

**End of Proposal**
