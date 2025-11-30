# Condition/ConditionGroup vs Expression/ExpressionGroup Symmetry Analysis

## Current State Comparison

### Expression/ExpressionGroup Architecture (Current Working Model)

#### Key Design Pattern
The **Expression** component acts as a **smart router** that handles both simple and complex cases:

```javascript
// Expression.jsx handles 3 cases:
if (expressionData.type === 'expressionGroup') {
  if (expressions.length === 1) {
    // Case 1: Single-item group → unwrap and render as Expression
    return <Expression value={singleExpression} ... />
  } else if (expressions.length > 1) {
    // Case 2: Multi-item group → delegate to ExpressionGroup
    return <ExpressionGroup value={expressionData} ... />
  }
}
// Case 3: Simple expression (value/field/function/ruleRef) → render inline
return renderValueExpression() | renderFieldExpression() | ...
```

#### JSON Structure
```json
// Simple Expression (leaf node)
{
  "type": "value",  // or "field", "function", "ruleRef"
  "returnType": "number",
  "value": 42
}

// Expression Group (2+ children with operators)
{
  "type": "expressionGroup",
  "returnType": "number",
  "expressions": [
    { "type": "value", "returnType": "number", "value": 10 },
    { "type": "value", "returnType": "number", "value": 20 }
  ],
  "operators": ["+"]  // operators BETWEEN expressions
}

// Can nest infinitely
{
  "type": "expressionGroup",
  "returnType": "number",
  "expressions": [
    {
      "type": "expressionGroup",
      "returnType": "number",
      "expressions": [...],
      "operators": ["+"]
    },
    { "type": "value", "returnType": "number", "value": 5 }
  ],
  "operators": ["*"]
}
```

#### Benefits of Current Expression Model
1. **Single Entry Point**: Always use `<Expression>` component, it routes automatically
2. **Automatic Unwrapping**: Single-item groups automatically unwrap to avoid nesting
3. **Seamless Nesting**: ExpressionGroups can contain Expressions or other ExpressionGroups
4. **Type Inference**: returnType automatically inferred from operators and children
5. **Operator Array**: `operators` array makes it clear what happens between expressions

---

### Condition/ConditionGroup Architecture (Current)

#### Current Design Pattern
**ConditionGroup** and **Condition** are **separate** components with no router:

```javascript
// ConditionGroup.jsx - renders children directly
{conditions.map((child, index) => (
  child.type === 'condition' ? (
    <Condition value={child} ... />
  ) : (
    <ConditionGroup value={child} ... />  // Nested group
  )
))}
```

#### JSON Structure
```json
// Single Condition (leaf node)
{
  "type": "condition",
  "returnType": "boolean",
  "name": "Check Age",
  "left": { /* Expression */ },
  "operator": "greaterThan",
  "right": { /* Expression */ }
}

// Condition Group (container with conjunction)
{
  "type": "conditionGroup",
  "returnType": "boolean",
  "name": "Main Condition",
  "conjunction": "AND",  // conjunction applies to ALL conditions
  "not": false,
  "conditions": [
    { "type": "condition", ... },
    { "type": "condition", ... },
    { "type": "conditionGroup", ... }  // Can nest groups
  ]
}
```

#### Problems with Current Condition Model
1. **No Single Entry Point**: Must know whether to use `<Condition>` or `<ConditionGroup>`
2. **No Unwrapping**: Single-condition groups stay as groups (unnecessary nesting)
3. **Conjunction is Global**: ALL conditions in a group use the same AND/OR
4. **Cannot Mix Conjunctions**: Can't do: `(A AND B) OR (C AND D)` without nesting groups
5. **Name Property**: Groups have names but conditions also have names (redundant)
6. **Asymmetry**: Doesn't match Expression model at all

---

## Proposed Solution: Symmetric Architecture

### Goal
Make **Condition/ConditionGroup** work **exactly like Expression/ExpressionGroup**:
- Single entry point: `<Condition>` component
- Automatic routing based on structure
- Conjunction operators BETWEEN conditions (like expression operators)
- Seamless nesting and unwrapping

### New JSON Structure

#### Simple Condition (Leaf)
```json
{
  "type": "condition",
  "returnType": "boolean",
  "name": "Age Check",  // KEEP name for individual conditions
  "left": { "type": "field", "returnType": "number", "field": "age" },
  "operator": "greaterThan",
  "right": { "type": "value", "returnType": "number", "value": 18 }
}
```

#### Condition Group (2+ conditions with conjunctions)
```json
{
  "type": "conditionGroup",
  "returnType": "boolean",
  "name": "Main Condition",  // Group-level name (optional)
  "not": false,
  "conditions": [
    { "type": "condition", "name": "Age Check", ... },
    { "type": "condition", "name": "Status Check", ... },
    { "type": "condition", "name": "Region Check", ... }
  ],
  "conjunctions": ["AND", "AND"]  // conjunctions BETWEEN conditions
}
```

#### Mixed Conjunctions Example
```json
{
  "type": "conditionGroup",
  "returnType": "boolean",
  "name": "Complex Logic",
  "conditions": [
    { "type": "condition", "name": "A", ... },
    { "type": "condition", "name": "B", ... },
    { "type": "condition", "name": "C", ... }
  ],
  "conjunctions": ["AND", "OR"]  // A AND B OR C
}
```

#### Nested Groups (for precedence)
```json
{
  "type": "conditionGroup",
  "returnType": "boolean",
  "name": "Main",
  "conditions": [
    {
      "type": "conditionGroup",  // (A AND B)
      "name": "Group 1",
      "conditions": [
        { "type": "condition", "name": "A", ... },
        { "type": "condition", "name": "B", ... }
      ],
      "conjunctions": ["AND"]
    },
    {
      "type": "conditionGroup",  // (C AND D)
      "name": "Group 2",
      "conditions": [
        { "type": "condition", "name": "C", ... },
        { "type": "condition", "name": "D", ... }
      ],
      "conjunctions": ["AND"]
    }
  ],
  "conjunctions": ["OR"]  // (A AND B) OR (C AND D)
}
```

### New Component Structure

#### Condition.jsx (Smart Router)
```javascript
const Condition = ({ value, onChange, ... }) => {
  // Normalize input
  const normalizeValue = (val) => {
    if (!val) {
      return {
        type: 'condition',
        returnType: 'boolean',
        name: 'New Condition',
        left: createDirectExpression('field', 'number'),
        operator: 'equal',
        right: createDirectExpression('value', 'number', 0)
      };
    }
    
    if (val.type && ['condition', 'conditionGroup'].includes(val.type)) {
      return val;
    }
    
    // Invalid - default to condition
    return { type: 'condition', ... };
  };

  const [conditionData, setConditionData] = useState(normalizeValue(value));

  // ROUTER LOGIC (like Expression.jsx)
  if (conditionData.type === 'conditionGroup') {
    if (conditionData.conditions && conditionData.conditions.length === 1) {
      // Case 1: Single-condition group → unwrap and render as Condition
      const singleCondition = conditionData.conditions[0];
      
      const handleSingleConditionChange = (newCondition) => {
        // If it became a multi-condition group, pass through
        if (newCondition.type === 'conditionGroup' && newCondition.conditions?.length > 1) {
          onChange(newCondition);
          return;
        }
        
        // Otherwise wrap in group (preserve group structure)
        onChange({
          ...conditionData,
          conditions: [newCondition]
        });
      };
      
      return (
        <Condition
          value={singleCondition}
          onChange={handleSingleConditionChange}
          {...otherProps}
        />
      );
    } else if (conditionData.conditions && conditionData.conditions.length > 1) {
      // Case 2: Multi-condition group → delegate to ConditionGroup
      return (
        <ConditionGroup
          value={conditionData}
          onChange={onChange}
          {...otherProps}
        />
      );
    }
  }
  
  // Case 3: Simple condition → render inline
  return renderSingleCondition();
};
```

#### ConditionGroup.jsx (Multi-Condition Manager)
```javascript
const ConditionGroup = ({ value, onChange, ... }) => {
  // Validate: must have 2+ conditions
  const validateConditionGroup = (val) => {
    if (!val || val.type !== 'conditionGroup') {
      throw new Error('ConditionGroup requires type="conditionGroup"');
    }
    
    if (!val.conditions || val.conditions.length < 2) {
      throw new Error('ConditionGroup requires 2+ conditions. Use Condition for single conditions.');
    }
    
    return val;
  };

  const [groupData, setGroupData] = useState(() => validateConditionGroup(value));

  const addCondition = (afterIndex = null) => {
    const newCondition = {
      type: 'condition',
      returnType: 'boolean',
      name: `Condition ${conditions.length + 1}`,
      left: createDirectExpression('field', 'number'),
      operator: 'equal',
      right: createDirectExpression('value', 'number', 0)
    };

    const insertIndex = afterIndex !== null ? afterIndex + 1 : conditions.length;
    const newConditions = [...conditions];
    newConditions.splice(insertIndex, 0, newCondition);

    // Add conjunction (default to same as previous)
    const newConjunctions = [...(groupData.conjunctions || [])];
    const defaultConjunction = newConjunctions[newConjunctions.length - 1] || 'AND';
    newConjunctions.splice(insertIndex > 0 ? insertIndex - 1 : 0, 0, defaultConjunction);

    handleChange({
      conditions: newConditions,
      conjunctions: newConjunctions
    });
  };

  const removeCondition = (index) => {
    if (conditions.length <= 2) {
      // Removing would leave only 1 condition
      // Unwrap: return the remaining condition directly
      const remaining = conditions.filter((_, i) => i !== index)[0];
      onChange(remaining);
      return;
    }

    // Remove condition and adjacent conjunction
    const newConditions = conditions.filter((_, i) => i !== index);
    const newConjunctions = (conjunctions || []).filter((_, i) => 
      // Remove conjunction after this condition (or before if it's the last one)
      i !== Math.min(index, conjunctions.length - 1)
    );

    handleChange({
      conditions: newConditions,
      conjunctions: newConjunctions
    });
  };

  // Render: conditions with conjunctions between them
  return (
    <Space direction="vertical">
      {conditions.map((condition, index) => (
        <React.Fragment key={index}>
          {/* Condition */}
          <Condition
            value={condition}
            onChange={(updated) => {
              const newConditions = [...conditions];
              newConditions[index] = updated;
              handleChange({ conditions: newConditions });
            }}
            onRemove={() => removeCondition(index)}
            {...otherProps}
          />

          {/* Conjunction Selector (between conditions) */}
          {index < conditions.length - 1 && (
            <Select
              value={conjunctions[index] || 'AND'}
              onChange={(newConjunction) => {
                const newConjunctions = [...(conjunctions || [])];
                newConjunctions[index] = newConjunction;
                handleChange({ conjunctions: newConjunctions });
              }}
              options={[
                { value: 'AND', label: 'AND' },
                { value: 'OR', label: 'OR' }
              ]}
            />
          )}

          {/* Add Condition Button */}
          {index < conditions.length - 1 && (
            <Button onClick={() => addCondition(index)}>
              + Add Condition
            </Button>
          )}
        </React.Fragment>
      ))}
    </Space>
  );
};
```

---

## Migration Impact Analysis

### Breaking Changes

#### JSON Schema Changes
```diff
 {
   "type": "conditionGroup",
   "returnType": "boolean",
   "name": "Main Condition",
-  "conjunction": "AND",  // REMOVED: single global conjunction
   "not": false,
   "conditions": [
     { "type": "condition", ... },
     { "type": "condition", ... }
-  ]
+  ],
+  "conjunctions": ["AND"]  // NEW: array of conjunctions between conditions
 }
```

**Impact**: All existing saved rules with conditionGroups must be migrated

#### Component Interface Changes
```diff
 // BEFORE: Parent must know which component to use
-<ConditionGroup value={conditionGroupData} ... />
-<Condition value={conditionData} ... />

 // AFTER: Always use Condition (it routes automatically)
+<Condition value={conditionOrGroupData} ... />
```

**Impact**: All parent components rendering conditions must be updated

### Files Requiring Changes

1. **Core Components** (HIGH IMPACT)
   - `frontend/src/components/RuleBuilder/Condition.jsx` - Complete rewrite as router
   - `frontend/src/components/RuleBuilder/ConditionGroup.jsx` - Rewrite to handle conjunctions array
   - `frontend/src/components/RuleBuilder/Case.jsx` - Update to use new Condition router
   - `frontend/src/components/RuleBuilder/RuleBuilderUI.jsx` - Update condition rendering

2. **Schema & Validation** (CRITICAL)
   - `backend/src/main/resources/schemas/*.json` - Update conditionGroup schema
   - `backend/src/main/java/com/rulebuilder/validator/*` - Update validators
   - Schema version bump required

3. **Migration Scripts** (REQUIRED)
   - Create migration script to convert old conditionGroup format to new format
   - Add version detection to handle both old and new formats during transition

4. **Tests** (HIGH IMPACT)
   - All condition-related tests must be updated
   - New tests for conjunction array handling
   - Migration script tests

5. **Sample Data** (MEDIUM IMPACT)
   - `backend/src/main/resources/static/rules/*.json` - Update all rule samples
   - Test fixture files

---

## Benefits of Proposed Changes

### 1. **Architectural Consistency**
- Condition/ConditionGroup mirrors Expression/ExpressionGroup exactly
- Same patterns, same mental model, same code structure
- Easier to understand and maintain

### 2. **Flexibility in Logic**
```javascript
// Can now express: A AND B OR C (without nesting)
{
  conditions: [A, B, C],
  conjunctions: ["AND", "OR"]
}

// Previously required:
{
  type: 'conditionGroup',
  conjunction: 'OR',
  conditions: [
    {
      type: 'conditionGroup',
      conjunction: 'AND',
      conditions: [A, B]
    },
    C
  ]
}
```

### 3. **Simplified Component Usage**
```javascript
// Always use Condition component (it routes automatically)
<Condition value={anyConditionData} onChange={...} />

// No need to check type and choose component
```

### 4. **Automatic Unwrapping**
```javascript
// Removing a condition from a 2-condition group automatically unwraps
{
  type: 'conditionGroup',
  conditions: [A, B],
  conjunctions: ['AND']
}
// User removes B →
{
  type: 'condition',  // Automatically unwrapped to single condition
  ...A
}
```

### 5. **Better SQL Generation**
```sql
-- With conjunction array:
WHERE (condition1 AND condition2 OR condition3)

-- Clearer precedence, simpler generation logic
```

---

## Implementation Plan

### Phase 1: Backend Schema & Migration (3-4 hours)
1. Update JSON schema for conditionGroup
2. Create migration script (old → new format)
3. Add backward compatibility layer
4. Update validators

### Phase 2: Create New Components (4-6 hours)
1. Rewrite `Condition.jsx` as router (like Expression)
2. Rewrite `ConditionGroup.jsx` to handle conjunctions array
3. Add conjunction selector UI
4. Add tests for new components

### Phase 3: Update Parent Components (2-3 hours)
1. Update `Case.jsx` to use new Condition router
2. Update `RuleBuilderUI.jsx`
3. Update any other components using Condition/ConditionGroup

### Phase 4: Migration & Testing (3-4 hours)
1. Run migration script on all sample rules
2. Test backward compatibility
3. Update integration tests
4. Visual regression testing

### Phase 5: Documentation & Cleanup (1-2 hours)
1. Update documentation
2. Remove old code
3. Update examples

**Total Estimated Time: 13-19 hours (~2-3 days)**

---

## Risks & Mitigation

### Risk 1: Breaking Existing Rules
**Mitigation**: 
- Keep backward compatibility for 2 versions
- Auto-migrate on load
- Clear migration documentation

### Risk 2: SQL Generation Changes
**Mitigation**:
- Test SQL generation extensively
- Ensure operator precedence is preserved
- Add parentheses where needed

### Risk 3: Complex Migration
**Mitigation**:
- Start with sample rules
- Test migration script thoroughly
- Provide rollback mechanism

---

## Recommendation

**YES - Proceed with this restructuring** for the following reasons:

1. **Long-term Maintainability**: Having consistent patterns across Expression and Condition makes the codebase much easier to understand and maintain

2. **Better User Experience**: Users can mix AND/OR conjunctions without complex nesting

3. **Cleaner Code**: Single entry point (`<Condition>`) simplifies parent components

4. **Future Flexibility**: Easier to add features like "wrap with group" buttons

5. **Alignment with Requirements**: Makes expand/collapse logic identical for both (which is a stated goal)

The migration effort is significant but worthwhile. The new architecture is cleaner, more flexible, and more maintainable.

---

## Alternative: Minimal Changes

If the full restructure is too risky, consider these minimal changes:

1. **Add Condition Router** - Make Condition.jsx auto-route to ConditionGroup
2. **Keep conjunction property** - Don't change JSON structure yet
3. **Add unwrapping logic** - Single-condition groups unwrap automatically

This gives some benefits without the breaking changes, but doesn't achieve full symmetry.
