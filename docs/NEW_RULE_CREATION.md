# RuleBuilder: New Rule Creation

## Overview

This document explains how the RuleBuilder component creates a new blank rule compared to loading an existing rule. The component uses the same props structure for both scenarios, but with different internal values.

## Props Comparison

### Common Props (Same for Both)

These props are identical whether creating a new rule or loading an existing one:

- `config` - UI configuration (operators, fields, functions)
- `darkMode` - Theme preference boolean
- `onRuleChange` - Callback function triggered when rule data changes
- `onSaveSuccess` - Callback function triggered after successful save

### Different Values

| Aspect | New Rule | Loaded Rule |
|--------|----------|-------------|
| `selectedRuleUuid` | `null` | Actual UUID string (e.g., "123e4567-e89b-12d3-a456-426614174000") |
| Internal `ruleData.uuid` | `null` | Actual UUID |
| Internal `ruleData.version` | `1` | Loaded version number (e.g., 5) |
| Internal `ruleData.metadata.id` | `''` (empty string) | Actual rule ID (e.g., "CUSTOMER_ELIGIBILITY") |
| Internal `ruleData.metadata.description` | `''` (empty string) | Actual description |
| Internal `ruleData.definition` | Pre-populated template | Loaded definition from database |
| Internal `isLoadedRule` flag | `false` | `true` |

## Creation Flow

### 1. App.jsx Triggers Creation

When the user clicks "New Rule", `App.jsx` calls the `newRule()` method via ref:

```javascript
// App.jsx line 243
const handleNewRule = () => {
  setSelectedRuleUuid(null);
  if (ruleBuilderRef.current) {
    ruleBuilderRef.current.newRule({
      structure: 'condition',
      returnType: 'boolean',
      ruleType: 'Reporting',
      version: 1,
      metadata: { id: '', description: '' }
    });
  }
};
```

### 2. useRuleBuilder Hook Processes Request

The `newRule()` function in `useRuleBuilder.js` (line 397):

```javascript
const newRule = useCallback((data = {}) => {
  const structure = data.structure || 'condition';
  
  setRuleData({
    structure,
    returnType: data.returnType || 'boolean',
    ruleType: data.ruleType || 'Reporting',
    uuid: null,                    // No UUID for new rules
    version: 1,                     // Always starts at version 1
    metadata: data.metadata || { id: '', description: '' },
    definition: null                // Initially null
  });
  
  setIsLoadedRule(false);          // Mark as new rule
  
  // Initialize definition asynchronously
  setTimeout(() => {
    initializeDefinition(structure);
  }, 0);
}, [initializeDefinition]);
```

### 3. Template Definition Creation

The `initializeDefinition()` function (line 205) creates a pre-populated template based on the structure type:

#### Condition Structure Template

```javascript
{
  type: 'condition',
  returnType: 'boolean',
  name: 'Condition',
  left: {
    type: 'field',
    returnType: 'number',
    field: 'TABLE1.NUMBER_FIELD_01'
  },
  operator: 'equal',
  right: {
    type: 'value',
    returnType: 'number',
    value: 0
  }
}
```

#### Case Structure Template

```javascript
{
  whenClauses: [
    {
      when: {
        type: 'condition',
        returnType: 'boolean',
        name: 'Condition 1',
        left: createDirectExpression('field', 'number', 'TABLE1.NUMBER_FIELD_01'),
        operator: 'equal',
        right: createDirectExpression('value', 'number', 0)
      },
      then: createDirectExpression('value', 'number', 0),
      resultName: 'Result 1',
      editingName: false,
      editingResultName: false
    }
  ],
  elseClause: createDirectExpression('value', 'number', 0),
  elseResultName: 'Default',
  elseExpanded: true
}
```

#### Expression Structure Template

```javascript
{
  type: 'value',
  returnType: 'number',
  value: 0
}
```

## Loading Existing Rules

For comparison, when loading an existing rule, the flow is different:

### 1. Load via UUID Selection

```javascript
// App.jsx - when user selects a rule from dropdown
useEffect(() => {
  if (selectedRuleUuid && ruleBuilderRef.current) {
    ruleService.getRuleVersion(selectedRuleUuid, 'latest')
      .then(ruleData => {
        if (ruleData) {
          ruleBuilderRef.current.loadRuleData(ruleData);
        }
      });
  }
}, [selectedRuleUuid]);
```

### 2. Load Rule Data

The `loadRuleData()` function in `useRuleBuilder.js` (line 356):

```javascript
const loadRuleData = useCallback((data) => {
  const structure = data.structure || 'condition';
  
  // Support both formats:
  // 1. Definition format (new): { structure: "case", definition: {...} }
  // 2. Dynamic key format (old): { structure: "case", case: {...} }
  let content = data.definition || data[structure] || null;
  
  setRuleData({
    structure,
    returnType: data.returnType || 'boolean',
    ruleType: data.ruleType || 'Reporting',
    uuid: data.uuid || null,           // Has actual UUID
    version: data.version || 1,         // Has actual version
    metadata: data.metadata || { id: '', description: '' },
    definition: content                 // Has actual definition
  });
  
  setIsLoadedRule(true);               // Mark as loaded rule
  
  // If content is null, initialize it
  if (!content) {
    setTimeout(() => {
      initializeDefinition(structure);
    }, 0);
  }
}, [initializeDefinition]);
```

## Key Behavioral Differences

### Expansion State

The `isLoadedRule` flag affects the initial expansion state:

```javascript
// RuleBuilder.jsx line 117
const isNew = !isLoadedRule;
const { isExpanded, toggleExpansion, ... } = useExpansionState(ruleData.structure, isNew);
```

- **New rules**: Start with all sections expanded for easy editing
- **Loaded rules**: Start with sections collapsed to show overview

### Save Behavior

- **New rules**: POST request creates new rule with new UUID
- **Loaded rules**: PUT request updates existing rule, increments version

### Validation

Both new and loaded rules go through the same validation:
- Metadata must have an ID before saving
- Return type must match evaluated type for expressions
- Definition must be valid according to structure type

## Component Architecture

```
App.jsx
  └─> RuleBuilder (ref exposed)
       ├─> useRuleBuilder (headless logic)
       │    ├─> newRule()
       │    ├─> loadRuleData()
       │    ├─> initializeDefinition()
       │    └─> getRuleOutput()
       │
       └─> RuleBuilderUI (presentation)
            └─> Renders based on ruleData state
```

## Exposed Methods via Ref

The RuleBuilder component exposes these methods to parent components:

```javascript
// Get current rule as JSON
const output = ruleBuilderRef.current.getRuleOutput();

// Load existing rule from JSON
ruleBuilderRef.current.loadRuleData(existingRuleData);

// Create new rule with optional initial data
ruleBuilderRef.current.newRule({
  structure: 'case',
  returnType: 'boolean',
  ruleType: 'Pricing'
});

// Save current rule
ruleBuilderRef.current.handleSave();
```

## Summary

The RuleBuilder component treats new and loaded rules uniformly through the same props interface. The main differences are:

1. **New rules** have `null` UUIDs and get pre-populated templates
2. **Loaded rules** have actual UUIDs and get their definitions from the database
3. Both use the same component structure and validation logic
4. The `isLoadedRule` flag controls minor UI differences like initial expansion state

This design ensures consistency while providing sensible defaults for new rules and maintaining backward compatibility for loaded rules.
