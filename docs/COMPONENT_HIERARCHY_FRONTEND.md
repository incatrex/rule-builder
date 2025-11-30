# Component Hierarchy - Frontend Implementation

This document visualizes the React component hierarchy in the RuleBuilder frontend application.

## Overview

The frontend implements a modular component architecture with clear separation between:
- **Container Components**: Logic and state management
- **Presentation Components**: Pure UI rendering
- **Smart Components**: Routing between specialized renderers

---

## Top-Level Application Structure

```
App.jsx (Main Application)
├── ResizablePanels (3-panel layout)
│   ├── Panel 1: RuleSearch
│   ├── Panel 2: RuleBuilder
│   └── Panel 3: Split View
│       ├── Top: RuleHistory
│       └── Bottom: Tabbed View
│           ├── Tab: JsonEditor
│           ├── Tab: SqlViewer
│           └── Tab: RuleCanvas
```

---

## RuleBuilder Component Hierarchy

The RuleBuilder is the core component responsible for building and editing rules.

### Container Layer

```
RuleBuilder (Container - RuleBuilder.jsx)
├── Hooks & Services
│   ├── useRuleBuilder (headless logic hook)
│   │   ├── ruleService (RuleService)
│   │   ├── configService (RuleConfigService)
│   │   └── State Management
│   │       ├── ruleData
│   │       ├── availableVersions
│   │       ├── ruleTypes
│   │       └── isLoadedRule
│   │
│   └── useExpansionState (expansion state management)
│       ├── isExpanded(path)
│       ├── toggleExpansion(path)
│       ├── setExpansion(path, state)
│       ├── expandAll()
│       └── collapseAll()
│
├── Context Providers
│   └── NamingProvider (contexts/NamingContext.jsx)
│       └── Provides naming context for auto-generated names
│
└── Presentation Layer
    └── RuleBuilderUI (Pure Presentation)
```

---

### Presentation Layer (RuleBuilderUI)

```
RuleBuilderUI (RuleBuilderUI.jsx)
│
├── Header Section
│   ├── Structure Selector (Select)
│   │   ├── "condition" - Simple Condition
│   │   ├── "case" - Case Expression
│   │   └── "expression" - Expression
│   │
│   ├── Return Type Selector (Select)
│   │   ├── "boolean"
│   │   ├── "number"
│   │   ├── "text"
│   │   └── "date"
│   │
│   └── Type Mismatch Warning (conditional)
│
├── Metadata Section (Collapsible)
│   ├── Rule ID Input
│   ├── Rule Type Select
│   ├── Version Input/Select
│   └── Description TextArea
│
└── Definition Section (varies by structure)
    ├── structure === "case" → Case
    ├── structure === "condition" → Condition (simple mode)
    └── structure === "expression" → Expression
```

---

## Case Component Hierarchy

**File**: `Case.jsx`

```
Case (Case.jsx)
│
├── WHEN Clauses (Collapse items)
│   └── Array.map(whenClauses, (clause, index) => WhenClause)
│       ├── Header
│       │   ├── "WHEN" label
│       │   ├── ConditionSourceSelector
│       │   │   └── [condition | conditionGroup | ruleRef]
│       │   ├── Condition Name (editable)
│       │   ├── "THEN" label (collapsed view)
│       │   ├── Result Name (editable)
│       │   └── Delete Button
│       │
│       └── Content (expanded)
│           ├── WHEN Section
│           │   └── Condition (smart router)
│           │       └── [Routes to Condition or ConditionGroup]
│           │
│           └── THEN Section
│               ├── Result Name (editable, displayed)
│               └── Expression
│                   └── [Routes to Expression or ExpressionGroup]
│
├── Add WHEN Button
│   └── Creates new WhenClause
│
└── ELSE Clause (Collapse item)
    ├── Header
    │   ├── "ELSE" label
    │   ├── Result Name (editable)
    │   └── Edit Icon
    │
    └── Content
        └── Expression
            └── [Routes to Expression or ExpressionGroup]
```

**Component Interactions**:
- Uses `useNaming()` hook for auto-generated names
- Auto-expands new clauses via `onSetExpansion(path, true)`
- Tracks `userModifiedNames` state for name customization
- Auto-populates result names from rule IDs when rules selected

---

## Condition Component Hierarchy

**File**: `Condition.jsx` (Smart Router)

The Condition component acts as a smart router between single conditions and condition groups.

```
Condition (Smart Router - Condition.jsx)
│
├── Type Detection
│   ├── type === "condition" → SingleCondition (inline)
│   ├── type === "conditionGroup" → ConditionGroup (delegate)
│   └── ruleRef present → RuleReference rendering
│
├── Single Condition Rendering (inline)
│   ├── Collapse Header
│   │   ├── ConditionSourceSelector
│   │   │   └── [condition | conditionGroup | ruleRef]
│   │   ├── Condition Name (editable)
│   │   └── Remove Button (conditional)
│   │
│   └── Collapse Content
│       ├── Rule Reference Mode (if sourceType === 'ruleRef')
│       │   └── RuleReference
│       │       └── [See RuleReference below]
│       │
│       ├── Condition Group Mode (if sourceType === 'conditionGroup')
│       │   └── ConditionGroup (delegate, hideHeader: true)
│       │       └── [See ConditionGroup below]
│       │
│       └── Standard Condition Mode (default)
│           ├── Left Expression
│           │   └── Expression (smart router)
│           │
│           ├── Operator Select
│           │   ├── Comparison operators
│           │   ├── String operators
│           │   ├── Null operators
│           │   ├── Range operators
│           │   └── Set operators
│           │
│           └── Right Expression(s)
│               ├── Cardinality 0: null (is_empty, is_not_empty)
│               ├── Cardinality 1: Expression (single value)
│               ├── Cardinality 2: [Expression, Expression] (between)
│               └── Cardinality 1-10: Array<Expression> (in, not_in)
│                   ├── Expression items (with remove buttons)
│                   └── Add Value Button
│
└── Add Condition Button (depth === 0)
    └── Converts to ConditionGroup with 2 conditions
```

---

## ConditionGroup Component Hierarchy

**File**: `ConditionGroup.jsx`

```
ConditionGroup (ConditionGroup.jsx)
│
├── Header (if not hideHeader)
│   ├── ConditionSourceSelector
│   │   └── [condition | conditionGroup | ruleRef]
│   ├── Group Name (editable)
│   └── Remove Button (if depth > 0)
│
├── Source Type Rendering
│   ├── sourceType === 'ruleRef' → RuleReference
│   │   └── [See RuleReference below]
│   │
│   ├── sourceType === 'condition' → Condition (delegate)
│   │   └── [Delegates back to Condition component]
│   │
│   └── sourceType === 'conditionGroup' → Group Content
│       ├── Group Controls
│       │   ├── NOT Switch
│       │   └── Conjunction Select ("AND" | "OR")
│       │
│       ├── Conditions List (Drag & Drop)
│       │   └── DndContext (@dnd-kit/core)
│       │       └── SortableContext
│       │           └── Array.map(conditions, (child, index) =>
│       │               DraggableItem
│       │               ├── Drag Handle (MenuOutlined)
│       │               └── Condition (smart router, recursive)
│       │                   └── [Can be Condition or ConditionGroup]
│       │
│       └── Add Buttons
│           ├── Add Condition (BranchesOutlined)
│           └── Add Group (GroupOutlined)
```

**Key Features**:
- **Recursive**: Conditions array can contain both Condition and ConditionGroup
- **Drag & Drop**: Reorder conditions using @dnd-kit
- **Conjunction Display**: Shows "AND" or "OR" between conditions
- **NOT Toggle**: Negates entire group

---

## Expression Component Hierarchy

**File**: `Expression.jsx` (Smart Router)

The Expression component routes between direct expressions and expression groups.

```
Expression (Smart Router - Expression.jsx)
│
├── Type Detection & Routing
│   ├── type === "expressionGroup" (single item) → Unwrap and render child
│   ├── type === "expressionGroup" (multiple items) → ExpressionGroup (delegate)
│   └── type === "value|field|function|ruleRef" → DirectExpression (inline)
│
├── Direct Expression Rendering (inline)
│   ├── Source Type Selector (Select)
│   │   ├── "value" - Literal Value
│   │   ├── "field" - Field Reference
│   │   ├── "function" - Function Call
│   │   └── "ruleRef" - Rule Reference
│   │
│   ├── Value Mode (type === "value")
│   │   └── Input Widget (based on returnType)
│   │       ├── boolean → Switch
│   │       ├── number → InputNumber
│   │       ├── text → Input
│   │       └── date → DatePicker
│   │
│   ├── Field Mode (type === "field")
│   │   └── TreeSelect (field selector)
│   │       └── Hierarchical field structure from config
│   │
│   ├── Function Mode (type === "function")
│   │   ├── Function Selector (Select)
│   │   │   └── Grouped by category (MATH, TEXT, DATE, etc.)
│   │   │
│   │   └── Function Arguments (expandable)
│   │       └── Array.map(args, arg =>
│   │           ├── Arg Label
│   │           └── Expression (recursive)
│   │               └── [Can be Expression or ExpressionGroup]
│   │
│   ├── Rule Reference Mode (type === "ruleRef")
│   │   └── RuleReference
│   │       └── [See RuleReference below]
│   │
│   └── Add Expression Button (if canAddOperators)
│       └── Converts to ExpressionGroup with 2 expressions
│
└── Type Validation Warnings
    ├── Internal Type Mismatch (rule declares X but evaluates to Y)
    └── Context Type Mismatch (expected X but got Y)
```

---

## ExpressionGroup Component Hierarchy

**File**: `ExpressionGroup.jsx`

```
ExpressionGroup (ExpressionGroup.jsx)
│
├── Collapse Header (if expanded)
│   ├── Expression Type Icon
│   ├── Group Label
│   └── Collapse Toggle
│
├── Expressions & Operators
│   └── Array.map(expressions, (expr, index) =>
│       ├── Expression #{index + 1}
│       │   └── Expression (smart router, recursive)
│       │       └── [Can be Expression or ExpressionGroup]
│       │
│       ├── Operator Select (if not last)
│       │   ├── Math: "+", "-", "*", "/"
│       │   ├── Text: "&" (concatenate)
│       │   └── Boolean: "&&" (AND), "||" (OR)
│       │
│       └── Remove Button (if > 2 expressions)
│
├── Add Expression Button
│   └── Adds new expression with operator
│
└── Add Expression After Group Button (if onAddExpressionAfterGroup)
    └── Wraps entire group in outer ExpressionGroup
```

**Key Features**:
- **Recursive**: Expressions array can contain both Expression and ExpressionGroup
- **Operators**: Array of operators between expressions (length = expressions.length - 1)
- **Type Consistency**: All expressions and operators must match returnType
- **Minimum 2 Expressions**: Always maintains at least 2 expressions

---

## RuleReference Component

**File**: `RuleReference.jsx`

```
RuleReference (RuleReference.jsx)
│
├── Rule Search Section
│   ├── Rule Type Filter (Select, optional)
│   │   └── Filters available rules by type
│   │
│   └── Rule Selector (Select with search)
│       ├── Search functionality
│       ├── Grouped by rule type
│       └── onSelect → Loads rule details
│
├── Rule Details (when selected)
│   ├── Rule ID Display
│   ├── UUID Display
│   ├── Version Selector (Select)
│   │   └── Lists available versions
│   │
│   ├── Return Type Badge
│   │   └── Color-coded by type
│   │
│   └── Type Mismatch Warnings
│       ├── Internal mismatch (rule declares X but evaluates Y)
│       └── Context mismatch (expected X but rule returns Y)
│
└── Actions
    ├── Clear Selection Button
    └── Refresh Versions Button
```

**Integration Points**:
- Uses `config.onSearchRules(ruleType)` to fetch rule list
- Uses `config.onLoadRule(uuid, version)` to load rule details
- Validates returnType against expectedType
- Tracks internal type consistency of referenced rules

---

## Supporting Components

### ConditionSourceSelector

**File**: `ConditionSourceSelector.jsx`

```
ConditionSourceSelector
├── Button Group (Radio-style)
│   ├── Button: Single Condition (BranchesOutlined)
│   ├── Button: Condition Group (GroupOutlined)
│   └── Button: Rule Reference (LinkOutlined)
│
└── onChange(sourceType)
    └── Triggers parent to convert structure
```

---

## Utility Components

### Contexts

```
NamingContext (contexts/NamingContext.jsx)
├── NamingProvider
│   └── Provides naming utilities
│       ├── getNameForNew(type, path, siblings)
│       ├── updateName(currentName, oldType, newType, path, ruleId)
│       └── Name generation logic
│
└── useNaming() hook
    └── Consumes naming context
```

### Hooks

```
useRuleBuilder (useRuleBuilder.js)
├── State Management
│   ├── ruleData
│   ├── availableVersions
│   ├── ruleTypes
│   └── isLoadedRule
│
├── Handlers
│   ├── handleChange(updates)
│   ├── handleStructureChange(structure)
│   ├── handleVersionChange(version)
│   └── handleSaveRule()
│
└── Methods
    ├── getRuleOutput()
    ├── loadRuleData(data)
    └── newRule(data)

useExpansionState (hooks/useExpansionState.js)
├── Expansion State Map
│   └── Map<path, boolean>
│
└── Methods
    ├── isExpanded(path)
    ├── toggleExpansion(path)
    ├── setExpansion(path, state)
    ├── expandAll()
    ├── collapseAll()
    └── reset(structure, isNew)
```

---

## Services

```
RuleService (services/RuleService.js)
├── getRuleIds(ruleType?)
├── getRuleVersion(uuid, version)
├── saveRule(ruleData)
└── updateRule(uuid, ruleData)

RuleConfigService (services/RuleConfigService.js)
├── getConfig()
└── Returns UI configuration
    ├── fields (hierarchical structure)
    ├── conditionOperators
    ├── expressionOperators
    ├── functions
    └── types (type-specific config)
```

---

## Component Communication Patterns

### 1. Smart Router Pattern
```
Condition (Router)
├── Detects: type === "condition" → Renders inline
├── Detects: type === "conditionGroup" → Delegates to ConditionGroup
└── Detects: ruleRef present → Renders RuleReference

Expression (Router)
├── Detects: single-item ExpressionGroup → Unwraps and recurses
├── Detects: multi-item ExpressionGroup → Delegates to ExpressionGroup
└── Detects: direct type → Renders inline
```

### 2. Recursive Composition Pattern
```
ConditionGroup
└── conditions: Array<Condition>
    └── Condition (router)
        ├── Can render as single Condition
        └── Can delegate to ConditionGroup (recursive)

ExpressionGroup
└── expressions: Array<Expression>
    └── Expression (router)
        ├── Can render as direct Expression
        └── Can delegate to ExpressionGroup (recursive)
```

### 3. Expansion State Pattern
```
Parent Component
├── expansionPath prop: "case-when-0-then"
├── isExpanded(path): boolean
├── onToggleExpansion(path): void
└── Child receives sub-path: "case-when-0-then-expression-0"
```

### 4. Naming Context Pattern
```
NamingProvider (top-level)
└── Provides naming utilities to all descendants
    └── Child components call:
        ├── naming.getNameForNew('condition', path, siblings)
        └── naming.updateName(name, oldType, newType, path, ruleId)
```

---

## Data Flow

### Top-Down (Props)
```
RuleBuilder
└── ruleData → RuleBuilderUI
    └── definition → Case/Condition/Expression
        └── value → Child components (recursive)
```

### Bottom-Up (Callbacks)
```
Child component
└── onChange(newValue)
    └── Parent updates state
        └── Propagates up to RuleBuilder
            └── RuleBuilder.handleChange(updates)
```

### Expansion State (Centralized)
```
RuleBuilder
└── useExpansionState hook
    ├── Maintains Map<path, boolean>
    └── Provides: isExpanded, onToggleExpansion to all children
        └── Children use expansionPath to check/toggle their state
```

---

## Summary

The frontend architecture implements:

1. **Smart Routing**: Components detect structure and delegate to specialized renderers
2. **Recursive Composition**: Unlimited nesting through recursive component calls
3. **Centralized State**: Expansion state managed at top level, accessed by path
4. **Context-Based Utilities**: Naming logic shared via React Context
5. **Type Safety**: Components validate and display type mismatches
6. **Drag & Drop**: ConditionGroup uses @dnd-kit for reordering
7. **Service Integration**: Components use config callbacks for data fetching
8. **Responsive UI**: Collapse/expand patterns for managing complexity

The component hierarchy mirrors the JSON schema structure while providing an intuitive, interactive editing experience.
