# Component Hierarchy - JSON Schema Perspective

This document visualizes the component hierarchy as defined in the JSON schema (`rule-schema-current.json`).

## Overview

The schema defines a hierarchical structure where rules can contain nested conditions, expressions, and groups with specific composition rules.

---

## Root Structure

```
Rule
├── structure: "case" | "condition" | "expression"
├── returnType: "boolean" | "number" | "text" | "date"
├── ruleType: RuleType
├── uuId: string (UUID)
├── version: integer
├── metadata: { id, description }
└── definition: <varies by structure>
```

---

## Structure Type: CASE

**Case expressions** represent decision trees with multiple WHEN/THEN branches and an optional ELSE clause.

```
CaseContent
├── whenClauses: Array<WhenClause> (minItems: 1)
│   └── WhenClause
│       ├── when: Condition | ConditionGroup
│       │   └── [See Condition Hierarchy below]
│       ├── then: Expression | ExpressionGroup
│       │   └── [See Expression Hierarchy below]
│       └── resultName?: string (optional display name)
│
├── elseClause?: Expression | ExpressionGroup (optional)
│   └── [See Expression Hierarchy below]
│
└── elseResultName?: string (optional display name)
```

**Visual Representation:**
```
CASE
├─ WHEN #1
│  ├─ when: <Condition/ConditionGroup>
│  └─ then: <Expression/ExpressionGroup>
├─ WHEN #2
│  ├─ when: <Condition/ConditionGroup>
│  └─ then: <Expression/ExpressionGroup>
├─ ...
└─ ELSE (optional)
   └─ <Expression/ExpressionGroup>
```

---

## Structure Type: CONDITION

**Condition structures** evaluate to boolean and can be single conditions or groups.

### Condition Hierarchy

```
Condition (type: "condition", returnType: "boolean")
├── Standard Condition (requires: left, operator, right)
│   ├── name: string
│   ├── left: Expression | ExpressionGroup
│   │   └── [See Expression Hierarchy below]
│   ├── operator: string (enum)
│   │   ├── Comparison: "equal", "not_equal", "less", "less_or_equal", "greater", "greater_or_equal"
│   │   ├── String: "contains", "not_contains", "starts_with", "ends_with"
│   │   ├── Null: "is_empty", "is_not_empty"
│   │   ├── Range: "between", "not_between"
│   │   └── Set: "in", "not_in"
│   └── right: Expression | ExpressionGroup | Array<Expression|ExpressionGroup> | null
│       ├── Single value (cardinality: 1): Expression | ExpressionGroup
│       ├── Array (cardinality: 2): [Expression, Expression] (for between/not_between)
│       ├── Array (cardinality: 1-10): Array<Expression> (for in/not_in)
│       └── null (cardinality: 0): (for is_empty/is_not_empty)
│
└── Rule Reference Condition (requires: ruleRef)
    ├── name: string
    └── ruleRef: RuleReference
        └── [See RuleReference below]

ConditionGroup (type: "conditionGroup", returnType: "boolean")
├── Standard ConditionGroup (requires: conjunction, not, conditions)
│   ├── name: string
│   ├── conjunction: "AND" | "OR"
│   ├── not: boolean (negates entire group)
│   └── conditions: Array<Condition | ConditionGroup> (minItems: 0, recursive)
│       └── [Recursive: Each can be Condition or ConditionGroup]
│
└── Rule Reference ConditionGroup (requires: ruleRef)
    ├── name: string
    └── ruleRef: RuleReference (returnType must be "boolean")
        └── [See RuleReference below]
```

**Visual Tree:**
```
ConditionGroup "Main Condition"
├─ conjunction: "AND"
├─ not: false
└─ conditions:
   ├─ Condition "Condition 1" (standard)
   │  ├─ left: <Expression>
   │  ├─ operator: "equal"
   │  └─ right: <Expression>
   │
   ├─ ConditionGroup "Nested Group" (recursive)
   │  ├─ conjunction: "OR"
   │  ├─ not: true
   │  └─ conditions:
   │     ├─ Condition "Condition 2.1"
   │     └─ Condition "Condition 2.2"
   │
   └─ Condition "Rule Reference" (ruleRef)
      └─ ruleRef: { id, uuid, version, returnType: "boolean" }
```

---

## Structure Type: EXPRESSION

**Expression structures** evaluate to any return type (boolean, number, text, date).

### Expression Hierarchy

```
Expression (Direct Expression - Leaf Node)
├── Value Expression (type: "value")
│   ├── returnType: "boolean" | "number" | "text" | "date"
│   └── value: string | number | boolean | null
│
├── Field Expression (type: "field")
│   ├── returnType: "boolean" | "number" | "text" | "date"
│   └── field: string (pattern: "^[A-Z0-9_]+\\.[A-Z0-9_]+$")
│
├── Function Expression (type: "function")
│   ├── returnType: "boolean" | "number" | "text" | "date"
│   └── function:
│       ├── name: string (enum)
│       │   ├── MATH: "MATH.ADD", "MATH.SUBTRACT", "MATH.MULTIPLY", "MATH.DIVIDE",
│       │   │        "MATH.SUM", "MATH.ROUND", "MATH.ABS"
│       │   ├── TEXT: "TEXT.CONCAT", "TEXT.MID", "TEXT.LEN", "TEXT.CASE"
│       │   └── DATE: "DATE.DIFF"
│       └── args: Array<FunctionArg>
│           └── FunctionArg
│               ├── name: string
│               └── value: Expression | ExpressionGroup (recursive)
│
└── Rule Reference Expression (type: "ruleRef")
    ├── returnType: "boolean" | "number" | "text" | "date"
    └── ruleRef: RuleReference
        └── [See RuleReference below]

ExpressionGroup (Composite - Branch Node)
├── type: "expressionGroup"
├── returnType: "boolean" | "number" | "text" | "date"
├── expressions: Array<Expression | ExpressionGroup> (minItems: 2, recursive)
│   ├── Expression #1 (can be Expression or ExpressionGroup)
│   ├── Expression #2 (can be Expression or ExpressionGroup)
│   └── ...
└── operators: Array<string> (length = expressions.length - 1)
    ├── Math: "+", "-", "*", "/"
    ├── Text: "&" (concatenate)
    └── Boolean: "&&" (AND), "||" (OR)
```

**Visual Tree Example:**
```
ExpressionGroup (returnType: "number")
├─ expressions[0]: Expression (field)
│  ├─ type: "field"
│  ├─ returnType: "number"
│  └─ field: "TABLE1.NUMBER_FIELD_01"
├─ operators[0]: "+"
├─ expressions[1]: ExpressionGroup (nested, returnType: "number")
│  ├─ expressions[0]: Expression (value)
│  │  ├─ type: "value"
│  │  ├─ returnType: "number"
│  │  └─ value: 10
│  ├─ operators[0]: "*"
│  └─ expressions[1]: Expression (function)
│     ├─ type: "function"
│     ├─ returnType: "number"
│     └─ function:
│        ├─ name: "MATH.ROUND"
│        └─ args:
│           ├─ arg[0]: { name: "number", value: Expression (field) }
│           └─ arg[1]: { name: "decimals", value: Expression (value: 2) }
├─ operators[1]: "-"
└─ expressions[2]: Expression (ruleRef)
   ├─ type: "ruleRef"
   ├─ returnType: "number"
   └─ ruleRef: { id: "CALC_TAX", uuid: "...", version: 1 }
```

---

## Shared Components

### RuleReference

Rule references can appear in:
- Condition (single condition backed by rule)
- ConditionGroup (group backed by rule)
- Expression (expression backed by rule)

```
RuleReference
├── id: string (human-readable rule ID)
├── uuid: string (UUID pattern)
├── version: integer (minimum: 1)
├── returnType: "boolean" | "number" | "text" | "date"
├── ruleType?: RuleType (optional filter for UI)
└── name?: string (optional display name)
```

---

## Complete Composition Rules

### 1. Case Structure Composition
```
Rule (structure: "case")
└── definition: CaseContent
    ├── whenClauses: Array<WhenClause>
    │   ├── when: Condition | ConditionGroup
    │   └── then: Expression | ExpressionGroup
    └── elseClause?: Expression | ExpressionGroup
```

### 2. Condition Structure Composition
```
Rule (structure: "condition")
└── definition: Condition | ConditionGroup
    ├── Condition (standard or ruleRef)
    └── ConditionGroup (standard or ruleRef)
        └── conditions: Array<Condition | ConditionGroup> (recursive)
```

### 3. Expression Structure Composition
```
Rule (structure: "expression")
└── definition: Expression | ExpressionGroup
    ├── Expression (value | field | function | ruleRef)
    │   └── function.args[].value: Expression | ExpressionGroup (recursive)
    └── ExpressionGroup
        └── expressions: Array<Expression | ExpressionGroup> (recursive)
```

---

## Recursion Points

The schema allows unlimited nesting at these points:

1. **ConditionGroup → conditions → ConditionGroup** (recursive nesting of condition groups)
2. **ExpressionGroup → expressions → ExpressionGroup** (recursive nesting of expression groups)
3. **Function → args → Expression/ExpressionGroup** (expressions within function arguments)

---

## Key Schema Features

### Type Constraints

- **Condition/ConditionGroup**: Always `returnType: "boolean"`
- **Expression/ExpressionGroup**: Can be any `returnType` based on context
- **RuleReference**: Must match expected `returnType` of context

### Cardinality Rules (Operators)

```
Operator Cardinality (right side):
├── 0 (null): is_empty, is_not_empty
├── 1 (single): equal, not_equal, less, greater, contains, etc.
├── 2 (array): between, not_between
└── 1-10 (array): in, not_in (minCardinality: 1, maxCardinality: 10, defaultCardinality: 3)
```

### UI Extensions (x-ui-*)

The schema includes UI configuration through `x-ui-*` properties:

- `x-ui-settings`: Global UI settings (defaultValueSources)
- `x-ui-conjunctions`: Conjunction display configuration
- `x-ui-operators`: Operator metadata (label, cardinality, separator)
- `x-ui-expression-operators`: Expression operator metadata
- `x-ui-types`: Type-specific UI configuration (valid operators, default operators)
- `x-ui-functions`: Function metadata (args, categories, returnTypes)

---

## Summary

The schema defines a recursive, type-safe hierarchy where:

- **Rules** contain **Definitions** based on structure type
- **Case** definitions contain **WhenClauses** with **Conditions** and **Expressions**
- **Condition** definitions can be single **Conditions** or **ConditionGroups** (recursive)
- **Expression** definitions can be single **Expressions** or **ExpressionGroups** (recursive)
- **RuleReferences** can replace standard implementations at any level
- **Functions** can contain nested **Expressions** in their arguments
- All components respect type constraints and validation rules
