# Full Implementation Plan: Rule Builder Restructuring

## Overview

This plan covers three major improvements to the Rule Builder:
1. **Button Consistency** - Make Condition/ConditionGroup buttons match Expression/ExpressionGroup
2. **Condition/Group Restructuring** - Make Condition component a smart router like Expression
3. **Expand/Collapse Centralization** - Single source of truth for all expansion state

**Key Decision**: Keep single conjunction per group (no conjunction array between conditions)

---

## Phase 1: Button Consistency (3-4 hours)

### Goal
Add action buttons to Condition/ConditionGroup to match Expression/ExpressionGroup patterns, without changing data structures.

### Changes

#### 1.1 Update Condition.jsx (1 hour)

**Add Props:**
```javascript
const Condition = ({ 
  value, 
  onChange, 
  config, 
  darkMode = false, 
  onRemove,           // EXISTING
  isLoadedRule = false,
  onGroupWithCondition,  // NEW - callback to wrap in group
  showActionButtons = true  // NEW - control visibility
}) => {
```

**Add Action Buttons (right side of condition card):**
```jsx
{showActionButtons && (
  <Space>
    <Tooltip title="Group with new Condition">
      <Button 
        size="small" 
        onClick={handleGroupWithCondition}
      >
        (+)
      </Button>
    </Tooltip>
    <Tooltip title="Remove">
      <Button 
        size="small" 
        icon={<CloseOutlined />}
        onClick={onRemove}
      />
    </Tooltip>
  </Space>
)}
```

**Add Handler:**
```javascript
const handleGroupWithCondition = () => {
  if (onGroupWithCondition) {
    onGroupWithCondition(conditionData);
  }
};
```

#### 1.2 Update ConditionGroup.jsx (2 hours)

**Add per-condition action buttons:**
```jsx
{conditions.map((condition, index) => (
  <div key={index}>
    <Space direction="vertical" style={{ width: '100%' }}>
      {child.type === 'condition' ? (
        <Condition
          value={child}
          onChange={(updated) => handleConditionChange(index, updated)}
          onRemove={() => handleRemoveCondition(index)}
          onGroupWithCondition={() => handleGroupCondition(index)}  // NEW
          showActionButtons={true}
          // ... other props
        />
      ) : (
        <ConditionGroup
          value={child}
          onChange={(updated) => handleConditionChange(index, updated)}
          onRemove={() => handleRemoveCondition(index)}
          // ... other props
        />
      )}
      
      {/* Add between conditions (like Expression) */}
      {index < conditions.length - 1 && (
        <Button 
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handleAddCondition(index + 1)}
        >
          + Add Condition
        </Button>
      )}
    </Space>
  </div>
))}
```

**Add Group Wrapping Logic:**
```javascript
const handleGroupCondition = (index) => {
  const condition = conditions[index];
  
  // Create new condition
  const newCondition = {
    type: 'condition',
    returnType: 'boolean',
    name: `Condition ${conditions.length + 1}`,
    left: createDirectExpression('field', 'number'),
    operator: 'equal',
    right: createDirectExpression('value', 'number', 0)
  };
  
  // Create new group containing both
  const newGroup = {
    type: 'conditionGroup',
    returnType: 'boolean',
    name: `Group ${depth + 2}`,
    conjunction: groupData.conjunction || 'AND',  // Inherit parent's conjunction
    not: false,
    conditions: [condition, newCondition]
  };
  
  // Replace the condition with the group
  const newConditions = [...conditions];
  newConditions[index] = newGroup;
  
  handleChange({ conditions: newConditions });
};
```

**Update Bottom Buttons:**
```jsx
<Space>
  <Button 
    icon={<PlusOutlined />}
    onClick={() => handleAddCondition()}
  >
    + Add Condition
  </Button>
  <Button 
    icon={<PlusOutlined />}
    onClick={addConditionGroup}
  >
    (+) Add Group
  </Button>
</Space>
```

**Add External Group Button (outside group card):**
```jsx
{!compact && onGroupWithConditionGroup && (
  <Tooltip title="Group with new Condition">
    <Button 
      size="small"
      onClick={onGroupWithConditionGroup}
    >
      (+)
    </Button>
  </Tooltip>
)}
```

#### 1.3 Update useRuleBuilder.js (1 hour)

**Add new handler:**
```javascript
const handleGroupConditionWithNew = useCallback((conditionData, path) => {
  // Implementation to wrap a condition in a group with new condition
  // Will be refined in Phase 2
}, [ruleData]);
```

### Testing Phase 1
- [ ] Click (+) on single Condition creates group with 2 conditions
- [ ] Click + between conditions adds new condition
- [ ] Click (+) on ConditionGroup wraps entire group
- [ ] All buttons have proper tooltips
- [ ] Visual consistency with Expression buttons

---

## Phase 2: Condition/Group Restructuring (6-8 hours)

### Goal
Make Condition.jsx a smart router like Expression.jsx, with automatic unwrapping of single-condition groups.

**Note**: Keep single conjunction per group (no array)

### 2.1 Rewrite Condition.jsx as Router (3-4 hours)

**New Structure:**
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
    
    // Default to condition
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

const renderSingleCondition = () => {
  // Existing single condition rendering logic
  return (
    <Collapse ...>
      <Panel header={header} key="condition">
        {/* Left expression */}
        <Expression
          value={conditionData.left}
          onChange={(newLeft) => handleChange({ left: newLeft })}
          ...
        />
        
        {/* Operator selector */}
        <Select
          value={conditionData.operator}
          onChange={(newOp) => handleChange({ operator: newOp })}
          ...
        />
        
        {/* Right expression */}
        <Expression
          value={conditionData.right}
          onChange={(newRight) => handleChange({ right: newRight })}
          ...
        />
      </Panel>
    </Collapse>
  );
};
```

### 2.2 Update ConditionGroup.jsx (2-3 hours)

**Add Validation:**
```javascript
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
```

**Auto-unwrap on Remove:**
```javascript
const handleRemoveCondition = (index) => {
  const newConditions = conditions.filter((_, i) => i !== index);
  
  if (newConditions.length === 1) {
    // Unwrap: return the single remaining condition/group
    onChange(newConditions[0]);
    return;
  }
  
  // Keep as group
  handleChange({ conditions: newConditions });
};
```

**Update Rendering to Always Use Condition:**
```jsx
{conditions.map((child, index) => (
  <div key={index}>
    {/* Always use Condition - it will route to ConditionGroup if needed */}
    <Condition
      value={child}
      onChange={(updated) => handleConditionChange(index, updated)}
      onRemove={() => handleRemoveCondition(index)}
      onGroupWithCondition={() => handleGroupCondition(index)}
      expansionPath={`${expansionPath}-condition-${index}`}
      isExpanded={isExpanded}
      onToggleExpansion={onToggleExpansion}
      isNew={isNew}
      // ... other props
    />
  </div>
))}
```

### 2.3 Update Parent Components (1 hour)

**Case.jsx:**
```jsx
// Change from explicit ConditionGroup to Condition
<Condition
  value={whenClause.condition}
  onChange={(newCondition) => handleWhenChange(index, { condition: newCondition })}
  // ... props
/>
```

**RuleBuilderUI.jsx:**
```jsx
// Change from explicit ConditionGroup to Condition
{ruleData.structure === 'condition' && (
  <Condition
    value={ruleData.definition}
    onChange={handleDefinitionChange}
    // ... props
  />
)}
```

### Testing Phase 2
- [ ] Load rule with nested condition groups - renders correctly
- [ ] Single-condition groups automatically unwrap
- [ ] Removing conditions unwraps when only 1 remains
- [ ] Can still nest groups manually
- [ ] Case component uses Condition router
- [ ] RuleBuilderUI uses Condition router

---

## Phase 3: Centralized Expand/Collapse (8-10 hours)

### Goal
Single source of truth for all expansion state with predictable behavior.

### 3.1 Create useExpansionState Hook (2 hours)

**File: `frontend/src/components/RuleBuilder/hooks/useExpansionState.js`**

```javascript
import { useState, useCallback } from 'react';

/**
 * Hook to manage expansion state for all collapsible components
 * 
 * @param {string} structure - Rule structure type (condition, case, expression)
 * @param {boolean} isNew - Is this a new rule or loaded rule
 * @returns {Object} Expansion state management functions
 */
export const useExpansionState = (structure, isNew) => {
  const [expansionMap, setExpansionMap] = useState(() => 
    generateInitialState(structure, isNew)
  );

  function generateInitialState(structure, isNew) {
    if (isNew) {
      // For new rules: empty map means everything expanded by default
      return {};
    }
    
    // For loaded rules: explicitly set what should be expanded
    const state = {};
    if (structure === 'condition') {
      // Only root condition group expanded
      state['conditionGroup-0'] = true;
    }
    // Everything else collapsed (not in map = collapsed)
    return state;
  }

  // Check if a path is expanded
  const isExpanded = useCallback((path) => {
    if (isNew) {
      // For new rules: default is expanded unless explicitly collapsed
      return expansionMap[path] !== false;
    } else {
      // For loaded rules: default is collapsed unless explicitly expanded
      return expansionMap[path] === true;
    }
  }, [expansionMap, isNew]);

  // Toggle expansion state
  const toggleExpansion = useCallback((path) => {
    setExpansionMap(prev => ({
      ...prev,
      [path]: !isExpanded(path)
    }));
  }, [isExpanded]);

  // Set expansion state explicitly
  const setExpansion = useCallback((path, expanded) => {
    setExpansionMap(prev => ({
      ...prev,
      [path]: expanded
    }));
  }, []);

  // Reset to initial state (when loading a different rule)
  const reset = useCallback((newStructure, newIsNew) => {
    setExpansionMap(generateInitialState(newStructure, newIsNew));
  }, []);

  // Expand all
  const expandAll = useCallback(() => {
    setExpansionMap({});  // Empty for isNew, or set all to true
  }, []);

  // Collapse all
  const collapseAll = useCallback(() => {
    const state = {};
    if (structure === 'condition') {
      state['conditionGroup-0'] = true;  // Keep root expanded
    }
    setExpansionMap(state);
  }, [structure]);

  return {
    isExpanded,
    toggleExpansion,
    setExpansion,
    reset,
    expandAll,
    collapseAll
  };
};
```

### 3.2 Update Component Props (4-5 hours)

**All Components Need:**
- `expansionPath` - Unique identifier (e.g., "conditionGroup-0-condition-1")
- `isExpanded` - Function to check if expanded
- `onToggleExpansion` - Function to toggle
- `isNew` - Boolean indicating new vs loaded rule

**ConditionGroup.jsx:**
```javascript
const ConditionGroup = ({ 
  value, 
  onChange, 
  config, 
  darkMode = false, 
  onRemove, 
  depth = 0,
  compact = false,
  // NEW props
  expansionPath = 'conditionGroup-0',
  isExpanded,
  onToggleExpansion,
  isNew = false
}) => {
  // Remove local useState for isExpanded
  // const [isExpanded, setIsExpanded] = useState(!isLoadedRule);  // REMOVE

  // Use prop functions instead
  const expanded = isExpanded ? isExpanded(expansionPath) : true;

  return (
    <Collapse
      activeKey={expanded ? ['group'] : []}
      onChange={(keys) => {
        if (onToggleExpansion) {
          onToggleExpansion(expansionPath);
        }
      }}
      ...
    >
      <Panel key="group" header={header}>
        {conditions.map((child, index) => (
          <Condition
            value={child}
            // Pass down expansion props
            expansionPath={`${expansionPath}-condition-${index}`}
            isExpanded={isExpanded}
            onToggleExpansion={onToggleExpansion}
            isNew={isNew}
            // ... other props
          />
        ))}
      </Panel>
    </Collapse>
  );
};
```

**Condition.jsx:**
```javascript
const Condition = ({
  value,
  onChange,
  config,
  darkMode = false,
  onRemove,
  // NEW props
  expansionPath = 'condition-0',
  isExpanded,
  onToggleExpansion,
  isNew = false
}) => {
  // Remove local useState for isExpanded
  // const [isExpanded, setIsExpanded] = useState(!isLoadedRule);  // REMOVE

  // Use prop functions
  const expanded = isExpanded ? isExpanded(expansionPath) : true;

  // If this is a conditionGroup, pass props to ConditionGroup
  if (conditionData.type === 'conditionGroup') {
    // ... router logic with expansion props passed through
  }

  return (
    <Collapse
      activeKey={expanded ? ['condition'] : []}
      onChange={(keys) => {
        if (onToggleExpansion) {
          onToggleExpansion(expansionPath);
        }
      }}
      ...
    >
      {/* condition content */}
    </Collapse>
  );
};
```

**Expression.jsx:**
```javascript
const Expression = ({
  value,
  onChange,
  config,
  expectedType,
  darkMode = false,
  compact = false,
  // NEW props
  expansionPath = 'expression',
  isExpanded,
  onToggleExpansion,
  isNew = false,
  // ... other props
}) => {
  // Remove local useState
  // const [isExpanded, setIsExpanded] = useState(!isLoadedRule);  // REMOVE

  // Use prop functions
  const expanded = isExpanded ? isExpanded(expansionPath) : true;

  // If this is expressionGroup, pass props to ExpressionGroup
  if (expressionData.type === 'expressionGroup') {
    return (
      <ExpressionGroup
        value={expressionData}
        onChange={onChange}
        expansionPath={expansionPath}
        isExpanded={isExpanded}
        onToggleExpansion={onToggleExpansion}
        isNew={isNew}
        // ... other props
      />
    );
  }

  // Single expression rendering...
};
```

**ExpressionGroup.jsx:**
```javascript
const ExpressionGroup = ({
  value,
  onChange,
  config,
  expectedType,
  darkMode = false,
  compact = false,
  // NEW props
  expansionPath = 'expressionGroup',
  isExpanded,
  onToggleExpansion,
  isNew = false,
  // ... other props
}) => {
  // Remove local useState
  // const [isExpanded, setIsExpanded] = useState(!isLoadedRule);  // REMOVE

  // Use prop functions
  const expanded = isExpanded ? isExpanded(expansionPath) : true;

  return (
    <>
      {expanded ? (
        // Expanded view
        {expressions.map((expr, index) => (
          <Expression
            value={expr}
            onChange={...}
            expansionPath={`${expansionPath}-expression-${index}`}
            isExpanded={isExpanded}
            onToggleExpansion={onToggleExpansion}
            isNew={isNew}
            // ... props
          />
        ))}
      ) : (
        // Collapsed view
        <div onClick={() => onToggleExpansion?.(expansionPath)}>
          {/* compact summary */}
        </div>
      )}
    </>
  );
};
```

**Case.jsx:**
```javascript
const Case = ({
  value,
  onChange,
  config,
  darkMode = false,
  // NEW props
  expansionPath = 'case',
  isExpanded,
  onToggleExpansion,
  isNew = false
}) => {
  // Remove local useState for elseExpanded
  // const [elseExpanded, setElseExpanded] = useState(!isLoadedRule);  // REMOVE

  // Generate paths for each section
  const elsePath = `${expansionPath}-else`;
  const elseExpanded = isExpanded ? isExpanded(elsePath) : true;

  return (
    <>
      {/* WHEN clauses */}
      {whenClauses.map((when, index) => {
        const whenPath = `${expansionPath}-when-${index}`;
        const whenExpanded = isExpanded ? isExpanded(whenPath) : true;
        
        return (
          <Collapse
            activeKey={whenExpanded ? [String(index)] : []}
            onChange={() => onToggleExpansion?.(whenPath)}
          >
            <Panel key={String(index)} header={...}>
              <Condition
                value={when.condition}
                expansionPath={`${whenPath}-condition`}
                isExpanded={isExpanded}
                onToggleExpansion={onToggleExpansion}
                isNew={isNew}
                // ... props
              />
              <Expression
                value={when.expression}
                expansionPath={`${whenPath}-expression`}
                isExpanded={isExpanded}
                onToggleExpansion={onToggleExpansion}
                isNew={isNew}
                // ... props
              />
            </Panel>
          </Collapse>
        );
      })}

      {/* ELSE clause */}
      <Collapse
        activeKey={elseExpanded ? ['else'] : []}
        onChange={() => onToggleExpansion?.(elsePath)}
      >
        <Panel key="else" header="ELSE">
          <Expression
            value={elseExpression}
            expansionPath={`${elsePath}-expression`}
            isExpanded={isExpanded}
            onToggleExpansion={onToggleExpansion}
            isNew={isNew}
            // ... props
          />
        </Panel>
      </Collapse>
    </>
  );
};
```

### 3.3 Integrate with RuleBuilder (1 hour)

**RuleBuilder.jsx:**
```javascript
import { useExpansionState } from './hooks/useExpansionState';

const RuleBuilder = () => {
  const {
    ruleData,
    isLoadedRule,
    // ... other state
  } = useRuleBuilder({ ... });

  // Expansion state management
  const isNew = !isLoadedRule;
  const {
    isExpanded,
    toggleExpansion,
    setExpansion,
    reset,
    expandAll,
    collapseAll
  } = useExpansionState(ruleData.structure, isNew);

  // Reset expansion state when loading a new rule
  useEffect(() => {
    reset(ruleData.structure, isNew);
  }, [ruleData.uuId, ruleData.version, reset]);

  // Auto-expand newly added elements
  const handleDefinitionChange = useCallback((newDefinition) => {
    // If adding new condition/expression, auto-expand it
    // (detect by comparing lengths)
    
    // ... existing change logic
    
    // Set new element as expanded
    // setExpansion(newPath, true);
  }, [setExpansion]);

  return (
    <RuleBuilderUI
      ruleData={ruleData}
      onDefinitionChange={handleDefinitionChange}
      // Pass expansion props
      isNew={isNew}
      isExpanded={isExpanded}
      onToggleExpansion={toggleExpansion}
      onSetExpansion={setExpansion}
      onExpandAll={expandAll}
      onCollapseAll={collapseAll}
      // ... other props
    />
  );
};
```

**RuleBuilderUI.jsx:**
```javascript
const RuleBuilderUI = ({
  ruleData,
  onDefinitionChange,
  // Expansion props
  isNew,
  isExpanded,
  onToggleExpansion,
  onSetExpansion,
  onExpandAll,
  onCollapseAll,
  // ... other props
}) => {
  return (
    <>
      {/* Optional: Expand/Collapse All buttons */}
      <Space>
        <Button size="small" onClick={onExpandAll}>
          Expand All
        </Button>
        <Button size="small" onClick={onCollapseAll}>
          Collapse All
        </Button>
      </Space>

      {/* Structure-specific rendering */}
      {ruleData.structure === 'condition' && (
        <Condition
          value={ruleData.definition}
          onChange={onDefinitionChange}
          expansionPath="conditionGroup-0"
          isExpanded={isExpanded}
          onToggleExpansion={onToggleExpansion}
          isNew={isNew}
          // ... other props
        />
      )}

      {ruleData.structure === 'case' && (
        <Case
          value={ruleData.definition}
          onChange={onDefinitionChange}
          expansionPath="case"
          isExpanded={isExpanded}
          onToggleExpansion={onToggleExpansion}
          isNew={isNew}
          // ... other props
        />
      )}

      {ruleData.structure === 'expression' && (
        <Expression
          value={ruleData.definition}
          onChange={onDefinitionChange}
          expansionPath="expression"
          isExpanded={isExpanded}
          onToggleExpansion={onToggleExpansion}
          isNew={isNew}
          // ... other props
        />
      )}
    </>
  );
};
```

### 3.4 Auto-Expand New Elements (1 hour)

**In useRuleBuilder.js:**
```javascript
// Track when elements are added
const addCondition = useCallback((groupPath, insertIndex) => {
  // ... add condition logic
  
  // Auto-expand the new condition
  const newPath = `${groupPath}-condition-${insertIndex}`;
  if (onSetExpansion) {
    onSetExpansion(newPath, true);
  }
}, [onSetExpansion]);

const addExpression = useCallback((groupPath, insertIndex) => {
  // ... add expression logic
  
  // Auto-expand the new expression
  const newPath = `${groupPath}-expression-${insertIndex}`;
  if (onSetExpansion) {
    onSetExpansion(newPath, true);
  }
}, [onSetExpansion]);
```

### Testing Phase 3
- [ ] New condition rule: all expanded
- [ ] New case rule: all expanded
- [ ] New expression rule: all expanded
- [ ] Loaded condition rule: root group expanded, rest collapsed
- [ ] Loaded case rule: all collapsed
- [ ] Loaded expression rule: all collapsed
- [ ] Manual collapse persists through edits
- [ ] Adding new element expands it, preserves other states
- [ ] Expand All / Collapse All buttons work
- [ ] Switching between rules resets expansion state

---

## Phase 4: Testing & Documentation (3-4 hours)

### 4.1 Unit Tests (2 hours)

**useExpansionState.test.js:**
```javascript
describe('useExpansionState', () => {
  describe('New Rule', () => {
    it('defaults all to expanded', () => {
      const { result } = renderHook(() => useExpansionState('condition', true));
      expect(result.current.isExpanded('anything')).toBe(true);
    });

    it('allows manual collapse', () => {
      const { result } = renderHook(() => useExpansionState('condition', true));
      act(() => result.current.toggleExpansion('condition-0'));
      expect(result.current.isExpanded('condition-0')).toBe(false);
    });
  });

  describe('Loaded Rule', () => {
    it('defaults to collapsed except root condition group', () => {
      const { result } = renderHook(() => useExpansionState('condition', false));
      expect(result.current.isExpanded('conditionGroup-0')).toBe(true);
      expect(result.current.isExpanded('condition-0')).toBe(false);
    });

    it('allows manual expansion', () => {
      const { result } = renderHook(() => useExpansionState('condition', false));
      act(() => result.current.toggleExpansion('condition-0'));
      expect(result.current.isExpanded('condition-0')).toBe(true);
    });
  });

  it('resets state when rule changes', () => {
    const { result } = renderHook(() => useExpansionState('condition', false));
    act(() => result.current.toggleExpansion('condition-0'));
    expect(result.current.isExpanded('condition-0')).toBe(true);
    
    act(() => result.current.reset('condition', false));
    expect(result.current.isExpanded('condition-0')).toBe(false);
  });
});
```

**Condition.test.jsx:**
```javascript
describe('Condition Router', () => {
  it('renders single condition directly', () => {
    const condition = {
      type: 'condition',
      name: 'Test',
      left: { type: 'value', returnType: 'number', value: 1 },
      operator: 'equal',
      right: { type: 'value', returnType: 'number', value: 1 }
    };
    const { getByText } = render(<Condition value={condition} />);
    expect(getByText('Test')).toBeInTheDocument();
  });

  it('unwraps single-condition groups', () => {
    const group = {
      type: 'conditionGroup',
      name: 'Group',
      conjunction: 'AND',
      conditions: [{
        type: 'condition',
        name: 'Inner',
        left: { type: 'value', returnType: 'number', value: 1 },
        operator: 'equal',
        right: { type: 'value', returnType: 'number', value: 1 }
      }]
    };
    const { getByText, queryByText } = render(<Condition value={group} />);
    expect(getByText('Inner')).toBeInTheDocument();
    expect(queryByText('Group')).not.toBeInTheDocument();  // Group unwrapped
  });

  it('delegates multi-condition groups to ConditionGroup', () => {
    const group = {
      type: 'conditionGroup',
      name: 'Group',
      conjunction: 'AND',
      conditions: [
        { type: 'condition', name: 'A', ... },
        { type: 'condition', name: 'B', ... }
      ]
    };
    const { getByText } = render(<Condition value={group} />);
    expect(getByText('Group')).toBeInTheDocument();
    expect(getByText('A')).toBeInTheDocument();
    expect(getByText('B')).toBeInTheDocument();
  });
});
```

### 4.2 Integration Tests (1 hour)

**expansion.integration.test.jsx:**
```javascript
describe('Expansion Integration', () => {
  it('new condition rule starts fully expanded', () => {
    const { getAllByRole } = render(
      <RuleBuilder initialStructure="condition" isNew={true} />
    );
    // Check all Collapse components are expanded
    const expandedPanels = getAllByRole('button', { expanded: true });
    expect(expandedPanels.length).toBeGreaterThan(0);
  });

  it('loaded condition rule starts with root expanded only', () => {
    const ruleData = createConditionRuleData();
    const { getByTestId } = render(
      <RuleBuilder initialRule={ruleData} isNew={false} />
    );
    expect(getByTestId('conditionGroup-0-content')).toBeVisible();
    expect(getByTestId('condition-0-content')).not.toBeVisible();
  });

  it('manual collapse persists through edits', async () => {
    const { getByTestId, getByLabelText } = render(
      <RuleBuilder initialStructure="condition" isNew={true} />
    );
    
    // Collapse condition
    const conditionHeader = getByTestId('condition-0-header');
    await userEvent.click(conditionHeader);
    expect(getByTestId('condition-0-content')).not.toBeVisible();
    
    // Edit something
    const nameField = getByLabelText('Condition Name');
    await userEvent.clear(nameField);
    await userEvent.type(nameField, 'New Name');
    
    // Should still be collapsed
    expect(getByTestId('condition-0-content')).not.toBeVisible();
  });

  it('adding new condition expands it, preserves others', async () => {
    const { getByText, getByTestId } = render(
      <RuleBuilder initialStructure="condition" isNew={true} />
    );
    
    // Collapse first condition
    await userEvent.click(getByTestId('condition-0-header'));
    expect(getByTestId('condition-0-content')).not.toBeVisible();
    
    // Add new condition
    await userEvent.click(getByText('+ Add Condition'));
    
    // First still collapsed, second expanded
    expect(getByTestId('condition-0-content')).not.toBeVisible();
    expect(getByTestId('condition-1-content')).toBeVisible();
  });
});
```

### 4.3 Documentation (1 hour)

Update:
- Component API documentation
- Architecture diagrams
- User guide for expand/collapse behavior
- Migration guide if any breaking changes

---

## Summary & Timeline

### Phase 1: Button Consistency (3-4 hours)
- ✅ No breaking changes
- ✅ Immediate visual improvement
- ✅ Easier user experience

### Phase 2: Condition/Group Restructuring (6-8 hours)
- ⚠️ Some breaking changes (component usage)
- ✅ Architectural consistency
- ✅ Auto-unwrapping behavior
- ⚠️ Requires component updates

### Phase 3: Centralized Expand/Collapse (8-10 hours)
- ⚠️ Breaking changes (prop signatures)
- ✅ Single source of truth
- ✅ Predictable behavior
- ✅ Easy to test

### Phase 4: Testing & Documentation (3-4 hours)
- ✅ Comprehensive test coverage
- ✅ Protected against regressions

### Total Estimated Time: 20-26 hours (~3-4 days)

### Risk Assessment

**Low Risk:**
- Phase 1 (buttons only)

**Medium Risk:**
- Phase 2 (requires testing parent components)
- Phase 4 (standard testing process)

**Higher Risk:**
- Phase 3 (touches all components, needs careful coordination)

### Recommendation

**Phased Rollout:**
1. Complete Phase 1 first (quick win, low risk)
2. Complete Phase 2 (enables Phase 3)
3. Complete Phase 3 (biggest improvement)
4. Complete Phase 4 throughout (continuous testing)

**Alternative: Do Phase 2 & 3 together** since they're closely related and Phase 3 requires the routing pattern from Phase 2.

---

## Open Questions

1. Should we add "Expand All" / "Collapse All" buttons to the UI?
2. Should expansion state persist in localStorage across sessions?
3. Should we add keyboard shortcuts for expand/collapse?
4. Should metadata panel follow same expansion rules or stay independent?
5. Any specific visual styling changes needed for buttons?
