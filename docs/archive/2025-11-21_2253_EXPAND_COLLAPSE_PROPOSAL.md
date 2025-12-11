# Expand/Collapse State Management Proposal

## Current State Analysis

### Current Implementation Issues

1. **Inconsistent State Management**
   - Each component manages its own `isExpanded` state independently
   - `isLoadedRule` flag is used to determine initial state but transitions are unclear
   - No centralized state management for expansion states
   - When `isLoadedRule` transitions from `true` to `false`, some components expand, others don't

2. **Components with Expansion State**
   - `ConditionGroup`: Uses `isExpanded` state (special logic for simple conditions)
   - `Condition`: Uses `isExpanded` state
   - `ExpressionGroup`: Uses `isExpanded` state
   - `Expression`: Uses `isExpanded` state
   - `Case`: Uses `elseExpanded` and per-case expansion tracking
   - `RuleBuilderUI`: Uses `metadataCollapsed` for metadata section

3. **Current Flags**
   - `isLoadedRule`: Boolean flag indicating if rule was loaded from backend
   - `isExpanded`: Local component state for collapse/expand
   - `compact`: Mode flag for nested rendering (but doesn't consistently control expansion)

### Problems

- **No unique identifiers**: Components can't be individually tracked
- **State lost on re-render**: Parent component re-renders cause state reset
- **No persistence**: Expansion state lost when navigating away
- **Complex logic**: Different rules for new vs loaded, with special cases

---

## Proposed Solution

### 1. Centralized Expansion State Management

Create a new context/hook to manage all expansion states in one place:

```javascript
// expandCollapseState.js
{
  // Map of component paths to expansion state
  'conditionGroup-0': true,
  'conditionGroup-0-condition-0': false,
  'conditionGroup-0-condition-0-left': true,
  'conditionGroup-0-condition-1': true,
  'case-when-0': true,
  'case-when-0-conditionGroup': true,
  'case-then': false,
  'case-else': false,
  // etc.
}
```

### 2. Unique Path Generation

Each component generates a unique path based on its position in the tree:

- ConditionGroup: `conditionGroup-{index}`
- Condition: `{parentPath}-condition-{index}`
- Expression: `{parentPath}-{side}-expression` (e.g., `condition-0-left-expression`)
- ExpressionGroup: `{parentPath}-expressionGroup`
- Case When: `case-when-{index}`
- Case Then: `case-then`
- Case Else: `case-else`

### 3. Expansion Rules

#### New Rule (isNew = true)
```javascript
structure === 'condition':
  - conditionGroup: EXPANDED
  - all conditions: EXPANDED
  - all expressions: EXPANDED

structure === 'case':
  - all when clauses: EXPANDED
  - all condition groups in when: EXPANDED
  - all conditions in when: EXPANDED
  - all expressions in when: EXPANDED
  - then expression: EXPANDED
  - else expression: EXPANDED

structure === 'expression':
  - root expression: EXPANDED
  - if expressionGroup: EXPANDED
  - all nested expressions: EXPANDED
```

#### Loaded Rule (isNew = false)
```javascript
structure === 'condition':
  - conditionGroup (root only): EXPANDED
  - all nested condition groups: COLLAPSED
  - all conditions: COLLAPSED
  - all expressions: COLLAPSED

structure === 'case':
  - all when clauses: COLLAPSED
  - then expression: COLLAPSED
  - else expression: COLLAPSED

structure === 'expression':
  - root expression: COLLAPSED
  - all nested: COLLAPSED
```

#### Adding New Elements
```javascript
When user clicks "+ Add Condition":
  - new condition: EXPANDED
  - preserve all other states

When user clicks "+ Add Expression":
  - new expression: EXPANDED
  - preserve all other states

When user clicks "(+) Add Group":
  - new group: EXPANDED
  - preserve all other states
```

#### Manual Toggle
```javascript
When user clicks collapse/expand icon:
  - toggle that specific component
  - preserve all other states
  - state persists until rule is reloaded
```

---

## Implementation Plan

### Phase 1: Create Expansion State Management (1-2 hours)

**File: `frontend/src/components/RuleBuilder/hooks/useExpansionState.js`**

```javascript
import { useState, useCallback, useMemo } from 'react';

/**
 * Hook to manage expansion state for all collapsible components
 * 
 * @param {string} structure - Rule structure type
 * @param {boolean} isNew - Is this a new rule or loaded rule
 * @returns {Object} Expansion state management functions
 */
export const useExpansionState = (structure, isNew) => {
  const [expansionMap, setExpansionMap] = useState(() => 
    generateInitialState(structure, isNew)
  );

  // Generate initial expansion state based on rules
  function generateInitialState(structure, isNew) {
    if (isNew) {
      return {}; // Empty means everything expanded by default
    }
    
    // For loaded rules, explicitly set what should be expanded
    const state = {};
    if (structure === 'condition') {
      state['conditionGroup-0'] = true; // Root condition group expanded
    }
    // Everything else collapsed (not in map = collapsed)
    return state;
  }

  // Check if a path is expanded
  const isExpanded = useCallback((path) => {
    if (isNew) {
      // For new rules, default is expanded unless explicitly collapsed
      return expansionMap[path] !== false;
    } else {
      // For loaded rules, default is collapsed unless explicitly expanded
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

  return {
    isExpanded,
    toggleExpansion,
    setExpansion,
    reset
  };
};
```

### Phase 2: Update Components to Use Central State (3-4 hours)

**Changes needed in each component:**

1. **Accept expansion state props**
   ```javascript
   const ConditionGroup = ({ 
     // ... existing props
     expansionPath,  // NEW: unique path for this component
     isExpanded,     // NEW: from central state
     onToggleExpansion, // NEW: callback to central state
     isNew          // NEW: replaces isLoadedRule
   }) => {
   ```

2. **Remove local useState for expansion**
   ```javascript
   // REMOVE:
   const [isExpanded, setIsExpanded] = useState(!isLoadedRule);
   
   // USE:
   // isExpanded and onToggleExpansion from props
   ```

3. **Generate child paths consistently**
   ```javascript
   // In ConditionGroup rendering conditions:
   conditions.map((condition, index) => (
     <Condition
       key={index}
       expansionPath={`${expansionPath}-condition-${index}`}
       isExpanded={isExpanded(`${expansionPath}-condition-${index}`)}
       onToggleExpansion={onToggleExpansion}
       // ... other props
     />
   ))
   ```

### Phase 3: Update RuleBuilder Integration (1 hour)

**File: `frontend/src/components/RuleBuilder/RuleBuilder.jsx`**

```javascript
import { useExpansionState } from './hooks/useExpansionState';

const RuleBuilder = () => {
  const {
    ruleData,
    isLoadedRule, // Keep this flag
    // ... other state
  } = useRuleBuilder({ ... });

  // NEW: Expansion state management
  const isNew = !isLoadedRule;
  const {
    isExpanded,
    toggleExpansion,
    setExpansion,
    reset
  } = useExpansionState(ruleData.structure, isNew);

  // Reset expansion state when loading a new rule
  useEffect(() => {
    reset(ruleData.structure, isNew);
  }, [ruleData.uuid, ruleData.version]); // Reset on rule change

  return (
    <RuleBuilderUI
      ruleData={ruleData}
      isNew={isNew}
      isExpanded={isExpanded}
      onToggleExpansion={toggleExpansion}
      onSetExpansion={setExpansion}
      // ... other props
    />
  );
};
```

### Phase 4: Handle New Element Addition (1 hour)

When adding new elements, automatically expand them:

```javascript
// In useRuleBuilder.js
const addCondition = useCallback((groupPath) => {
  // ... existing logic to add condition
  
  // NEW: Auto-expand the new condition
  const newConditionIndex = conditions.length;
  const newPath = `${groupPath}-condition-${newConditionIndex}`;
  onSetExpansion(newPath, true);
}, [onSetExpansion]);
```

---

## Testing Strategy

### Unit Tests

**File: `frontend/src/components/RuleBuilder/hooks/__tests__/useExpansionState.test.js`**

```javascript
describe('useExpansionState', () => {
  describe('New Rule (isNew = true)', () => {
    it('should default all components to expanded', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      expect(result.current.isExpanded('conditionGroup-0')).toBe(true);
      expect(result.current.isExpanded('condition-0')).toBe(true);
      expect(result.current.isExpanded('anything')).toBe(true);
    });

    it('should allow collapsing individual components', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      act(() => {
        result.current.toggleExpansion('condition-0');
      });
      expect(result.current.isExpanded('condition-0')).toBe(false);
      expect(result.current.isExpanded('condition-1')).toBe(true);
    });
  });

  describe('Loaded Rule (isNew = false)', () => {
    it('should default all to collapsed except root condition group', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      expect(result.current.isExpanded('conditionGroup-0')).toBe(true);
      expect(result.current.isExpanded('condition-0')).toBe(false);
      expect(result.current.isExpanded('conditionGroup-1')).toBe(false);
    });

    it('should allow expanding individual components', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      act(() => {
        result.current.toggleExpansion('condition-0');
      });
      expect(result.current.isExpanded('condition-0')).toBe(true);
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across toggles', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      // Expand condition-0
      act(() => result.current.toggleExpansion('condition-0'));
      expect(result.current.isExpanded('condition-0')).toBe(true);
      
      // Collapse it again
      act(() => result.current.toggleExpansion('condition-0'));
      expect(result.current.isExpanded('condition-0')).toBe(false);
    });
  });
});
```

### Integration Tests

**File: `frontend/src/components/RuleBuilder/__tests__/expansion.integration.test.jsx`**

```javascript
describe('Expansion/Collapse Integration', () => {
  describe('New Condition Rule', () => {
    it('should start with all components expanded', async () => {
      const { getByText, getAllByRole } = render(
        <RuleBuilder initialStructure="condition" />
      );
      
      // All Collapse components should be expanded
      const collapseHeaders = getAllByRole('button', { expanded: true });
      expect(collapseHeaders.length).toBeGreaterThan(0);
    });

    it('should keep manual changes when adding new condition', async () => {
      const { getByText, getByTestId } = render(
        <RuleBuilder initialStructure="condition" />
      );
      
      // Collapse first condition
      const firstCondition = getByTestId('condition-0-header');
      await userEvent.click(firstCondition);
      expect(getByTestId('condition-0-content')).not.toBeVisible();
      
      // Add new condition
      const addButton = getByText('+ Add Condition');
      await userEvent.click(addButton);
      
      // First condition should still be collapsed
      expect(getByTestId('condition-0-content')).not.toBeVisible();
      // New condition should be expanded
      expect(getByTestId('condition-1-content')).toBeVisible();
    });
  });

  describe('Loaded Condition Rule', () => {
    it('should start with only root condition group expanded', async () => {
      const ruleData = createConditionRuleData();
      const { getByTestId } = render(
        <RuleBuilder initialRule={ruleData} />
      );
      
      // Root condition group expanded
      expect(getByTestId('conditionGroup-0-content')).toBeVisible();
      // Conditions collapsed
      expect(getByTestId('condition-0-content')).not.toBeVisible();
    });

    it('should maintain expanded state when editing', async () => {
      const ruleData = createConditionRuleData();
      const { getByTestId, getByLabelText } = render(
        <RuleBuilder initialRule={ruleData} />
      );
      
      // Expand a condition
      const conditionHeader = getByTestId('condition-0-header');
      await userEvent.click(conditionHeader);
      expect(getByTestId('condition-0-content')).toBeVisible();
      
      // Edit something
      const nameField = getByLabelText('Condition Name');
      await userEvent.clear(nameField);
      await userEvent.type(nameField, 'New Name');
      
      // Condition should still be expanded
      expect(getByTestId('condition-0-content')).toBeVisible();
    });
  });

  describe('Case Structure', () => {
    it('should start with all expanded for new rule', () => {
      const { getByTestId } = render(
        <RuleBuilder initialStructure="case" />
      );
      
      expect(getByTestId('case-when-0-content')).toBeVisible();
      expect(getByTestId('case-then-content')).toBeVisible();
      expect(getByTestId('case-else-content')).toBeVisible();
    });

    it('should start with all collapsed for loaded rule', () => {
      const ruleData = createCaseRuleData();
      const { getByTestId } = render(
        <RuleBuilder initialRule={ruleData} />
      );
      
      expect(getByTestId('case-when-0-content')).not.toBeVisible();
      expect(getByTestId('case-then-content')).not.toBeVisible();
      expect(getByTestId('case-else-content')).not.toBeVisible();
    });
  });
});
```

### Visual Regression Tests

Use Playwright or Cypress to capture screenshots:

1. New condition rule - all expanded
2. Loaded condition rule - root expanded, rest collapsed
3. After manually collapsing a condition
4. After adding a new condition (old state preserved, new expanded)
5. New case rule - all expanded
6. Loaded case rule - all collapsed

---

## Migration Path

### Step 1: Create New Hook (No Breaking Changes)
- Create `useExpansionState.js` with tests
- Ensure all tests pass

### Step 2: Update One Component (Proof of Concept)
- Choose `Condition.jsx` as pilot
- Update to use central state
- Run tests to verify behavior

### Step 3: Update Remaining Components
- `ConditionGroup.jsx`
- `ExpressionGroup.jsx`
- `Expression.jsx`
- `Case.jsx`

### Step 4: Integration Testing
- Run full integration test suite
- Visual regression testing
- Manual QA testing

### Step 5: Cleanup
- Remove old `isLoadedRule` logic from individual components
- Remove unused `isExpanded` state declarations
- Update documentation

---

## Benefits

1. **Single Source of Truth**: All expansion state in one place
2. **Predictable Behavior**: Clear rules for initial state and transitions
3. **Testable**: Easy to unit test expansion logic independently
4. **Maintainable**: Future changes won't accidentally break expansion logic
5. **Debuggable**: Can log entire expansion state for debugging
6. **Extensible**: Easy to add features like "expand all" / "collapse all" buttons

---

## Estimated Timeline

- Phase 1 (Hook Creation): 2 hours
- Phase 2 (Component Updates): 4 hours
- Phase 3 (Integration): 1 hour
- Phase 4 (New Elements): 1 hour
- Testing & QA: 3 hours
- **Total: ~11 hours (~1.5 days)**

---

## Questions for Clarification

1. Should expansion state persist across sessions (localStorage)?
2. Should there be "Expand All" / "Collapse All" buttons?
3. For deeply nested structures, should expanding a parent auto-expand children?
4. Should the metadata panel follow the same rules or have independent logic?
