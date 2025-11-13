
# Rule Builder JSON Schema Documentation

Based on actual UI component implementation and JSON structures used by the Rule Builder application.

## Core Data Structures

### Rule (Top Level)
```jsonc
{
  "structure": "case" | "condition" | "expression",
  "returnType": "boolean" | "number" | "text" | "date",
  "ruleType": "Reporting" | "Transformation" | "Aggregation" | "Validation",
  "uuId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // UUID v4 format
  "version": number,
  "metadata": {
    "id": string, // Rule identifier/name
    "description": string
  },
  "content": ConditionGroup | ExpressionGroup | CaseContent
}
```

### ExpressionGroup (Core Expression Container)
Used for all expression handling - replaces simple Expression types.
```jsonc
{
  "source": "expressionGroup",
  "returnType": "boolean" | "number" | "text" | "date",
  "expressions": [
    BaseExpression | ExpressionGroup, // Recursive nesting supported
    BaseExpression | ExpressionGroup,
    // ...
  ],
  "operators": [
    "+" | "-" | "*" | "/", // Mathematical operators
    // ... always one less than expressions array length
  ]
}
```

### BaseExpression (Leaf Expressions)
```jsonc
// Value Expression
{
  "source": "value",
  "returnType": "boolean" | "number" | "text" | "date",
  "value": any // actual value based on returnType
}

// Field Expression  
{
  "source": "field", 
  "returnType": "boolean" | "number" | "text" | "date",
  "field": string // e.g., "TABLE1.NUMBER_FIELD_01"
}

// Function Expression
{
  "source": "function",
  "returnType": "boolean" | "number" | "text" | "date", 
  "function": {
    "name": string, // e.g., "MATH.ADD", "DATE.DIFF", "TEXT.CONCAT"
    "args": [
      {
        "name": string, // argument name from function definition
        "value": ExpressionGroup // recursive - any expression can be an argument
      }
    ]
  }
}
```

### ConditionGroup (Logical Group Container)
```jsonc
{
  "type": "conditionGroup",
  "returnType": "boolean",
  "name": string,
  "conjunction": "AND" | "OR",
  "not": boolean,
  "conditions": [
    Condition | ConditionGroup // Recursive nesting supported
  ]
}
```

### Condition (Single Comparison)
```jsonc
{
  "type": "condition",
  "returnType": "boolean", 
  "name": string,
  "id": string, // unique identifier for UI management
  "left": ExpressionGroup,
  "operator": string, // from config.operators (e.g., "equal", "greater_or_equal", "contains", "in", "not_in")
  "right": ExpressionGroup | [ExpressionGroup, ...] | null 
  // - Single ExpressionGroup for most operators
  // - Array of 2 ExpressionGroups for "between"/"not_between" 
  // - Array of 1-10 ExpressionGroups for "in"/"not_in" (dynamic cardinality)
  // - null for "is_empty"/"is_not_empty"
}
```

### CaseContent (Case/When/Then Structure)
```jsonc
{
  "whenClauses": [
    {
      "when": ConditionGroup,
      "then": ExpressionGroup,
      "resultName": string // optional display name
    }
  ],
  "elseClause": ExpressionGroup,
  "elseResultName": string // optional display name
}
```

## Valid Configuration Values

### Operators (from config.json)
- **Equality**: `"equal"`, `"not_equal"`
- **Comparison**: `"less"`, `"less_or_equal"`, `"greater"`, `"greater_or_equal"` 
- **Text**: `"contains"`, `"not_contains"`, `"starts_with"`, `"ends_with"`
- **Existence**: `"is_empty"`, `"is_not_empty"`
- **Range**: `"between"`, `"not_between"`
- **Membership**: `"in"`, `"not_in"` (supports 1-10 values with dynamic cardinality)

### Mathematical Operators
- `"+"` (addition)
- `"-"` (subtraction) 
- `"*"` (multiplication)
- `"/"` (division)

### Return Types
- `"boolean"` - true/false values
- `"number"` - numeric values
- `"text"` - string values
- `"date"` - date values (YYYY-MM-DD format)

### Function Categories (from config.json)
- **MATH**: `ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE`, `SUM`, `ROUND`, `ABS`
- **TEXT**: `CONCAT`, `MID`, `LEN`
- **DATE**: `DIFF`

### Field References (from fields.json)
- Format: `"TABLE_NAME.FIELD_NAME"`
- Examples: `"TABLE1.NUMBER_FIELD_01"`, `"TABLE1.TEXT_FIELD_01"`, `"TABLE1.DATE_FIELD_01"`

## Structure Examples

### Simple Condition Rule
```json
{
  "structure": "condition",
  "returnType": "boolean",
  "content": {
    "type": "conditionGroup",
    "name": "Main Condition",
    "conjunction": "AND",
    "conditions": [
      {
        "type": "condition",
        "name": "Age Check",
        "left": {
          "source": "expressionGroup",
          "returnType": "number",
          "expressions": [{"source": "field", "returnType": "number", "field": "TABLE1.NUMBER_FIELD_01"}],
          "operators": []
        },
        "operator": "greater_or_equal",
        "right": {
          "source": "expressionGroup", 
          "returnType": "number",
          "expressions": [{"source": "value", "returnType": "number", "value": "18"}],
          "operators": []
        }
      }
    ]
  }
}
```

### Mathematical Expression
```json
{
  "source": "expressionGroup",
  "returnType": "number",
  "expressions": [
    {"source": "field", "returnType": "number", "field": "TABLE1.NUMBER_FIELD_01"},
    {"source": "value", "returnType": "number", "value": "10"}
  ],
  "operators": ["+"]
}
```

### Function with Arguments  
```json
{
  "source": "function",
  "returnType": "number",
  "function": {
    "name": "MATH.ADD",
    "args": [
      {
        "name": "num1", 
        "value": {
          "source": "expressionGroup",
          "returnType": "number", 
          "expressions": [{"source": "field", "returnType": "number", "field": "TABLE1.NUMBER_FIELD_01"}],
          "operators": []
        }
      },
      {
        "name": "num2",
        "value": {
          "source": "expressionGroup",
          "returnType": "number",
          "expressions": [{"source": "value", "returnType": "number", "value": "5"}], 
          "operators": []
        }
      }
    ]
  }
}
```

### IN Operator with Multiple Values
```json
{
  "type": "condition",
  "returnType": "boolean",
  "name": "Status Check",
  "left": {
    "source": "expressionGroup",
    "returnType": "text",
    "expressions": [{"source": "field", "returnType": "text", "field": "TABLE1.TEXT_FIELD_01"}],
    "operators": []
  },
  "operator": "in",
  "right": [
    {
      "source": "expressionGroup",
      "returnType": "text",
      "expressions": [{"source": "value", "returnType": "text", "value": "Active"}],
      "operators": []
    },
    {
      "source": "expressionGroup",
      "returnType": "text",
      "expressions": [{"source": "value", "returnType": "text", "value": "Pending"}],
      "operators": []
    },
    {
      "source": "expressionGroup",
      "returnType": "text",
      "expressions": [{"source": "value", "returnType": "text", "value": "In Progress"}],
      "operators": []
    }
  ]
}
```

## Key Implementation Notes

1. **ExpressionGroup is Universal**: All expressions are wrapped in ExpressionGroup containers, even simple ones
2. **Recursive Structure**: ExpressionGroups can contain other ExpressionGroups, enabling complex nesting
3. **Mathematical Operations**: Handled via the `operators` array in ExpressionGroup
4. **Function Arguments**: Always wrapped in ExpressionGroup containers for consistency
5. **UI State Management**: Each condition has an `id` field for React key management
6. **Type Safety**: `returnType` fields ensure type compatibility across the system
7. **Schema Version**: v1.0.4 - Uses JSON Schema Draft 7 (`http://json-schema.org/draft-07/schema#`) for compatibility with networknt validator
8. **Content Validation**: Schema uses `if/then/else` conditional pattern based on the `structure` field to determine which content type to validate against (CaseContent, ConditionGroup, or ExpressionGroup)
9. **Null Right Side**: Condition `right` property can be `null` for operators like `is_empty` and `is_not_empty` that don't require a comparison value
10. **Dynamic Cardinality**: The `in` and `not_in` operators support variable-length arrays (1-10 values) with configurable separators and +/- buttons in the UI