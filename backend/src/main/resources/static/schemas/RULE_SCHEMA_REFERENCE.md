
# Rule Builder JSON Schema Documentation

Based on actual UI component implementation and JSON structures used by the Rule Builder application.

**Schema Version:** v2.1.1  
**Schema ID:** https://api.rulebuilder.com/schemas/rule-v2.1.1.json  
**JSON Schema Draft:** Draft 7 (http://json-schema.org/draft-07/schema#)

## Core Data Structures

### Rule (Top Level)
```jsonc
{
  "structure": "case" | "condition" | "expression",
  "returnType": "boolean" | "number" | "text" | "date",
  "ruleType": "Reporting" | "Transformation" | "Aggregation" | "Validation",
  "uuId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // UUID v4 format (mixed case supported)
  "version": number,
  "metadata": {
    "id": string, // Rule identifier/name
    "description": string
  },
  "definition": ConditionGroup | ExpressionGroup | CaseContent
}
```

### ExpressionGroup (Core Expression Container)
Used for all expression handling - wraps expressions for mathematical operations and complex nesting.
```jsonc
{
  "type": "expressionGroup",
  "returnType": "boolean" | "number" | "text" | "date",
  "expressions": [
    Expression | ExpressionGroup, // Recursive nesting supported, minimum 2 items required
    Expression | ExpressionGroup,
    // ...
  ],
  "operators": [
    "+" | "-" | "*" | "/" | "&" | "&&" | "||", // Operators between expressions
    // ... always one less than expressions array length
  ]
}
```

### Expression (Leaf Expressions)
Corresponds to `Expression.jsx` UI component and internal `BaseExpression` component.
```jsonc
// Value Expression
{
  "type": "value",
  "returnType": "boolean" | "number" | "text" | "date",
  "value": any // actual value based on returnType
}

// Field Expression  
{
  "type": "field", 
  "returnType": "boolean" | "number" | "text" | "date",
  "field": string // e.g., "TABLE1.NUMBER_FIELD_01"
}

// Function Expression
{
  "type": "function",
  "returnType": "boolean" | "number" | "text" | "date", 
  "function": {
    "name": string, // e.g., "MATH.ADD", "DATE.DIFF", "TEXT.CONCAT"
    "args": [
      {
        "name": string, // argument name from function definition
        "value": Expression | ExpressionGroup // any expression can be an argument
      }
    ]
  }
}

// Rule Reference Expression
{
  "type": "ruleRef",
  "returnType": "boolean" | "number" | "text" | "date",
  "ruleRef": {
    "id": string, // human-readable rule identifier
    "uuid": string, // UUID for version tracking
    "version": number, // minimum 1
    "returnType": "boolean" | "number" | "text" | "date",
    "ruleType": "Reporting" | "Transformation" | "Aggregation" | "Validation", // optional filter
    "name": string // optional display name
  }
}
```

### ConditionGroup (Logical Group Container) - chains conditions with conjunctions (AND/OR)
```jsonc
// Standard ConditionGroup
{
  "type": "conditionGroup",
  "returnType": "boolean",
  "name": string,
  "conjunction": "AND" | "OR",
  "not": boolean,
  "conditions": [
    Condition | ConditionGroup // Recursive nesting supported, can be empty array
  ]
}

// Rule Reference ConditionGroup
{
  "type": "conditionGroup",
  "returnType": "boolean",
  "name": string,
  "ruleRef": {
    "id": string,
    "uuid": string,
    "version": number,
    "returnType": "boolean", // must be boolean for condition groups
    "ruleType": string, // optional
    "name": string // optional
  }
}
```

### Condition (Single Comparison)
### CaseContent (Case/When/Then Structure)
```jsonc
{
  "whenClauses": [
    {
      "when": Condition | ConditionGroup, // can be single condition or group
      "then": Expression | ExpressionGroup,
      "resultName": string // optional display name
    }
  ],
  "elseClause": Expression | ExpressionGroup, // optional
  "elseResultName": string // optional display name
}
```/ - null for "is_empty"/"is_not_empty"
}

// Rule Reference Condition
{
  "type": "condition",
  "returnType": "boolean",
  "name": string,
  "ruleRef": {
    "id": string,
    "uuid": string,
    "version": number,
    "returnType": "boolean", // must be boolean for conditions
    "ruleType": string, // optional
    "name": string // optional
  }
}
```

### CaseContent (Case/When/Then Structure)
```jsonc
{
  "whenClauses": [
    {
      "when": ConditionGroup,
      "then": Expression | ExpressionGroup,
      "resultName": string // optional display name
    }
  ],
  "elseClause": Expression | ExpressionGroup,
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
- `"+"` (addition / add)
- `"-"` (subtraction / subtract)
- `"*"` (multiplication / multiply)
- `"/"` (division / divide)
- `"&"` (concatenate / concat)
- `"&&"` (logical AND / and)
- `"||"` (logical OR / or)

### Return Types
- `"boolean"` - true/false values
- `"number"` - numeric values
- `"text"` - string values
- `"date"` - date values (YYYY-MM-DD format)

### Function Categories (from schema x-ui-functions)
- **MATH**: `ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE`, `SUM`, `ROUND`, `ABS`
- **TEXT**: `CONCAT`, `MID`, `LEN`, `CASE` (supports caseType dropdown)
- **DATE**: `DIFF` (supports units dropdown: DAY, MONTH, YEAR)

### Field References (from fields.json)
- Format: `"TABLE_NAME.FIELD_NAME"`
- Examples: `"TABLE1.NUMBER_FIELD_01"`, `"TABLE1.TEXT_FIELD_01"`, `"TABLE1.DATE_FIELD_01"`

### Function Argument Configuration Patterns

#### Standard Arguments (from schema x-ui-functions)
Arguments are defined as an array in the schema:
```json
"args": [
  {
    "name": "argName",
    "label": "Display Label",
    "type": "text" | "number" | "date" | "boolean",
    "required": true | false,
    "defaultValue": any, // optional default value
    "valueSources": ["value", "field", "function", "ruleRef"] // what input types are allowed
  }
]
```

#### Custom Dropdown Arguments
```json
"args": [
  {
    "name": "argName",
    "label": "Display Label", 
    "type": "text",
    "widget": "select",
    "required": true,
    "defaultValue": "OPTION_VALUE",
    "options": [
      { "value": "OPTION_VALUE", "label": "Display Label" },
      { "value": "ANOTHER_VALUE", "label": "Another Label" }
    ],
    "valueSources": ["value"] // typically only "value" for predefined options
  }
]
```

#### Custom Multiselect Arguments  
```json
"args": [
  {
    "name": "argName",
    "label": "Display Label",
    "type": "text", 
    "widget": "multiselect",
    "required": true,
    "defaultValue": "OPTION_VALUE",
    "options": [
      { "value": "OPTION1", "label": "Option 1" },
      { "value": "OPTION2", "label": "Option 2" },
      { "value": "OPTION3", "label": "Option 3" }
    ],
    "valueSources": ["value"]
  }
]
```

#### Dynamic Arguments
Functions with variable-length arguments use this pattern:
```json
"dynamicArgs": true,
"argSpec": {
  "type": "number", // type for all dynamic arguments
  "minArgs": 2,
  "maxArgs": 10,
  "defaultValue": 0,
  "valueSources": ["value", "field", "function"]
}
```

## Structure Examples

### Simple Condition Rule
```json
{
  "structure": "condition",
  "returnType": "boolean",
  "definition": {
    "type": "conditionGroup",
    "name": "Main Condition",
    "conjunction": "AND",
    "conditions": [
      {
        "type": "condition",
        "name": "Age Check",
        "left": {
          "type": "expressionGroup",
          "returnType": "number",
          "expressions": [{"type": "field", "returnType": "number", "field": "TABLE1.NUMBER_FIELD_01"}],
          "operators": []
        },
        "operator": "greater_or_equal",
        "right": {
          "type": "expressionGroup", 
          "returnType": "number",
          "expressions": [{"type": "value", "returnType": "number", "value": "18"}],
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
  "type": "expressionGroup",
  "returnType": "number",
  "expressions": [
    {"type": "field", "returnType": "number", "field": "TABLE1.NUMBER_FIELD_01"},
    {"type": "value", "returnType": "number", "value": "10"}
  ],
  "operators": ["+"]
}
```

### Function with Arguments  
Functions accept Expression or ExpressionGroup as argument values:
```json
{
  "type": "function",
  "returnType": "number",
  "function": {
    "name": "MATH.ADD",
    "args": [
      {
        "name": "num1", 
        "value": {
          "type": "expressionGroup",
          "returnType": "number", 
          "expressions": [{"type": "field", "returnType": "number", "field": "TABLE1.NUMBER_FIELD_01"}],
          "operators": []
        }
      },
      {
        "name": "num2",
        "value": {
          "type": "expressionGroup",
          "returnType": "number",
          "expressions": [{"type": "value", "returnType": "number", "value": "5"}], 
          "operators": []
        }
      }
    ]
  }
}
```

### Function with Custom Dropdown Argument
```json
{
  "type": "function",
  "returnType": "number",
  "function": {
    "name": "DATE.DIFF",
    "args": [
      {
        "name": "units",
        "value": {
          "type": "expressionGroup", 
          "returnType": "text",
          "expressions": [{"type": "value", "returnType": "text", "value": "MONTH"}],
          "operators": []
        }
      },
      {
        "name": "date1",
        "value": {
          "type": "expressionGroup",
          "returnType": "date",
          "expressions": [{"type": "field", "returnType": "date", "field": "TABLE1.DATE_FIELD_01"}],
          "operators": []
        }
      },
      {
        "name": "date2", 
        "value": {
          "type": "expressionGroup",
          "returnType": "date",
          "expressions": [{"type": "value", "returnType": "date", "value": "2023-12-31"}],
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
    "type": "expressionGroup",
    "returnType": "text",
    "expressions": [{"type": "field", "returnType": "text", "field": "TABLE1.TEXT_FIELD_01"}],
    "operators": []
  },
  "operator": "in",
  "right": [
    {
      "type": "expressionGroup",
      "returnType": "text",
      "expressions": [{"type": "value", "returnType": "text", "value": "Active"}],
      "operators": []
    },
    {
      "type": "expressionGroup",
      "returnType": "text",
      "expressions": [{"type": "value", "returnType": "text", "value": "Pending"}],
      "operators": []
    },
    {
      "type": "expressionGroup",
      "returnType": "text",
      "expressions": [{"type": "value", "returnType": "text", "value": "In Progress"}],
      "operators": []
    }
  ]
}
```

## Key Implementation Notes

1. **Expression Flexibility**: The schema allows both `Expression` and `ExpressionGroup` in most contexts (condition left/right, function arguments, case then/else clauses) for maximum flexibility
2. **ExpressionGroup Requirements**: ExpressionGroup requires minimum 2 expressions with operators array having exactly one less element than expressions
3. **Recursive Structure**: Both ExpressionGroups and ConditionGroups support recursive nesting, enabling complex rule structures
4. **Mathematical Operations**: Handled via the `operators` array in ExpressionGroup, supporting 7 operators: +, -, *, /, &, &&, ||
5. **Function Arguments**: Accept Expression or ExpressionGroup as values, providing flexibility in how arguments are constructed
6. **UI State Management**: Condition `id` field is optional and used for React key management in the UI
7. **Type Safety**: `returnType` fields ensure type compatibility across the system
8. **Schema Version**: v2.1.1 - Uses JSON Schema Draft 7 (`http://json-schema.org/draft-07/schema#`) with x-ui-* extensions for UI configuration
9. **Validation Approach**: Schema uses `if/then/else` conditional pattern based on the `structure` field to determine which content type to validate against (CaseContent, ConditionGroup, or ExpressionGroup)
10. **Null Right Side**: Condition `right` property can be `null` for operators like `is_empty` and `is_not_empty` that don't require a comparison value
11. **Dynamic Cardinality**: The `in` and `not_in` operators support variable-length arrays (1-10 values) with configurable separators and +/- buttons in the UI
12. **Empty Condition Groups**: ConditionGroup `conditions` array can be empty (minItems: 0), allowing initialization of groups before adding conditions
13. **Rule References**: Conditions, ConditionGroups, and Expressions can all be backed by rule references via the `ruleRef` property. This enables rule reusability and composition.
14. **RuleReference Type Constraints**: When used in conditions/conditionGroups, `ruleRef.returnType` must be "boolean". When used in expressions, it can be any return type.
15. **Dual Modes**: Conditions and ConditionGroups support two modes: (1) Standard mode with left/operator/right or conjunction/conditions, (2) RuleRef mode with just the ruleRef property
16. **Schema URI**: The schema has a canonical URI identifier: `https://api.rulebuilder.com/schemas/rule-v2.1.1.json`