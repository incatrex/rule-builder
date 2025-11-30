# Name Generation Analysis - Current State

## Overview
This document analyzes all locations where names are generated in the rule builder, including the current code and logic used.

**Last Updated:** 2025-11-28

**Recent Changes:**
- Added ConditionSourceSelector to Case WHEN clause headers
- Changed default WHEN clause type from `conditionGroup` to `condition` in two places:
  - `Case.jsx` - `addWhenClause()` function (manual add)
  - `useRuleBuilder.js` - `initializeDefinition()` function (structure change)
- Updated `getWhenSourceType` default return value from `'conditionGroup'` to `'condition'`
- **Added "Add Condition" button to single conditions (2025-11-28)**:
  - Appears at the bottom of single condition rendering
  - Converts the single condition to a conditionGroup (same as ConditionSourceSelector "Group")
  - Available in: Root Condition structure and Case WHEN clauses

---

## 1. CASE Component (Case.jsx)

### 1.1 New WHEN Clause Added (addWhenClause - Line 102)
**Location:** `Case.jsx:102-121`
**Trigger:** User clicks "Add WHEN Clause" button

**Name Generation Logic:**
```javascript
when: {
  type: 'condition',  // ← Changed from 'conditionGroup' to 'condition'
  returnType: 'boolean',
  name: `Condition ${caseData.whenClauses.length + 1}`,  // ← Sequential numbering
  left: createDirectExpression('field', 'number', 'TABLE1.NUMBER_FIELD_01'),
  operator: config?.types?.number?.defaultConditionOperator || 'equal',
  right: createDirectExpression('value', 'number', 0)
}
resultName: `Result ${caseData.whenClauses.length + 1}`  // ← Sequential numbering
```

**Examples:**
- First WHEN: name = "Condition 1", resultName = "Result 1"
- Second WHEN: name = "Condition 2", resultName = "Result 2"
- Third WHEN: name = "Condition 3", resultName = "Result 3"

**Behavior Changed (2025-11-28):**
- **Previously:** Created a `conditionGroup` with one nested condition
- **Now:** Creates a simple `condition` (matches behavior of Condition component)
- **Rationale:** Users can switch to "Group" via ConditionSourceSelector if needed
- **User Experience:** Simpler default, consistent with other components

---

### 1.1.1 ConditionSourceSelector in WHEN Clause Header (Added 2025-11-28)
**Location:** `Case.jsx:267-270` (in WHEN clause header rendering)
**Component:** `ConditionSourceSelector.jsx`

**Feature:**
A dropdown selector added to each WHEN clause header that allows users to switch between:
- **Condition** (single condition: left operator right)
- **Group** (conditionGroup: multiple conditions with AND/OR)
- **Rule** (ruleRef: reference to another rule)

**Visual Location:**
```
WHEN [🔀 Selector] [Condition 1] [✏️] ... [🗑️]
```

**Helper Function - getWhenSourceType:**
```javascript
const getWhenSourceType = (whenClause) => {
  if (!whenClause) return 'condition';  // ← Changed from 'conditionGroup'
  if (whenClause.ruleRef) return 'ruleRef';
  if (whenClause.type === 'condition') return 'condition';
  if (whenClause.type === 'conditionGroup') return 'conditionGroup';
  return 'condition';  // ← Changed from 'conditionGroup'
};
```

**Impact:**
- Default type changed from `'conditionGroup'` to `'condition'`
- Matches behavior of Condition and ConditionGroup components
- Provides consistent user experience across all condition types

---

### 1.2 WHEN Clause Source Changed to RuleRef (handleWhenSourceChange - Line 145)
**Location:** `Case.jsx:145-161`
**Trigger:** User switches WHEN clause source type to "Rule"

**Name Generation Logic:**
```javascript
const newWhen = {
  type: 'conditionGroup',
  returnType: 'boolean',
  name: currentWhen?.name || `Condition ${index + 1}`,  // ← Preserve existing or use index
  ruleRef: { ... }
};
```

**Behavior:**
- **If name exists:** Preserves current name
- **If no name:** Uses index-based name like "Condition 1", "Condition 2"

---

### 1.3 WHEN Clause Source Changed to Condition (handleWhenSourceChange - Line 162)
**Location:** `Case.jsx:162-179`
**Trigger:** User switches WHEN clause source type to "Simple Condition"

**Name Generation Logic:**
```javascript
if (currentWhen?.type === 'conditionGroup' && currentWhen.conditions?.length > 0) {
  // Extract first condition from group - KEEPS ITS NAME AS-IS
  const firstCondition = currentWhen.conditions[0];
  updateWhenClause(index, { when: firstCondition });
} else {
  // Create new condition
  const newWhen = {
    name: currentWhen?.name || `Condition ${index + 1}`,  // ← Preserve or use index
    ...
  };
}
```

**Behavior:**
- **From group with conditions:** Uses first condition's existing name
- **New/empty:** Preserves current name or uses "Condition {index+1}"

---

### 1.4 WHEN Clause Source Changed to ConditionGroup (handleWhenSourceChange - Line 180)
**Location:** `Case.jsx:180-228`
**Trigger:** User switches WHEN clause source type to "Group"

**Name Generation Logic:**

**A. When wrapping existing condition:**
```javascript
if (currentWhen?.type === 'condition') {
  const newWhen = {
    type: 'conditionGroup',
    name: currentWhen.name || `Condition ${index + 1}`,  // ← Preserve condition's name
    conditions: [
      currentWhen,  // ← Keeps its name
      {
        name: 'Condition 2'  // ← Hardcoded
      }
    ]
  };
}
```

**B. When creating new group:**
```javascript
const newWhen = {
  type: 'conditionGroup',
  name: currentWhen?.name || `Condition ${index + 1}`,  // ← Use existing or index
  conditions: [{
    name: 'Condition 1'  // ← Hardcoded
  }]
};
```

**Behavior:**
- **Group name:** Preserves existing or uses "Condition {index+1}"
- **Child conditions:** Hardcoded as "Condition 1", "Condition 2"
- **No hierarchical numbering**

---

### 1.5 Structure Change to Case (useRuleBuilder.initializeDefinition - Line 247)
**Location:** `useRuleBuilder.js:247-267`
**Trigger:** User changes rule structure from Condition/Expression to Case

**Name Generation Logic:**
```javascript
if (structure === 'case') {
  definition = {
    whenClauses: [{
      when: {
        type: 'condition',  // ← Changed from 'conditionGroup' to 'condition'
        returnType: 'boolean',
        name: 'Condition 1',
        left: createDirectExpression('field', 'number', 'TABLE1.NUMBER_FIELD_01'),
        operator: 'equal',
        right: createDirectExpression('value', 'number', 0)
      },
      then: createDirectExpression('value', 'number', 0),
      resultName: 'Result 1'
    }],
    elseClause: createDirectExpression('value', 'number', 0),
    elseResultName: 'Default'
  };
}
```

**Behavior Changed (2025-11-28):**
- **Previously:** Created initial WHEN clause with `conditionGroup` containing one condition
- **Now:** Creates initial WHEN clause with simple `condition`
- **Impact:** When changing from Condition → Case structure, WHEN clause is now simpler
- **User Experience:** Consistent with manual "Add WHEN Clause" behavior

---

## 2. Condition Component (Condition.jsx)

### 2.1 New Rule Creation / Loading
**Location:** `Condition.jsx:69-96`
**Trigger:** Component initialization with null/empty value

**Name Generation Logic:**
```javascript
const normalizeValue = (val) => {
  if (!val) {
    return {
      name: 'New Condition',  // ← Hardcoded default
      ...
    };
  }
  // For loaded rules, keeps existing name
};
```

**Behavior:**
- **New rule:** "New Condition"
- **Loaded rule:** Preserves saved name from JSON

---

### 2.2 Source Changed to RuleRef (handleSourceChange - Line 150)
**Location:** `Condition.jsx:150-161`
**Trigger:** User switches from condition/group to rule reference

**Name Generation Logic:**
```javascript
const newData = {
  type: conditionData.type,
  returnType: 'boolean',
  name: conditionData.name || 'Rule Reference',  // ← Preserve or default
  ruleRef: { ... }
};
```

**Behavior:**
- **If name exists:** Preserves current name
- **If no name:** Uses "Rule Reference"

---

### 2.3 Source Changed to Condition (handleSourceChange - Line 162)
**Location:** `Condition.jsx:162-178`
**Trigger:** User switches to simple condition

**Name Generation Logic:**

**A. Extracting from group:**
```javascript
if (conditionData.type === 'conditionGroup' && conditionData.conditions?.length > 0) {
  const firstCondition = conditionData.conditions[0];
  // USES FIRST CONDITION'S NAME AS-IS
}
```

**B. Creating new:**
```javascript
const newData = {
  name: conditionData.name || 'Condition',  // ← Preserve or default to "Condition"
  ...
};
```

**Behavior:**
- **From group:** Inherits first child's name
- **New:** Preserves existing or uses "Condition"

---

### 2.3.1 Add Condition Button (Added 2025-11-28)
**Location:** `Condition.jsx:664-675` (in single condition rendering)
**Trigger:** User clicks "Add Condition" button at bottom of single condition

**Button:**
```jsx
{(showAddButton !== undefined ? showAddButton : depth === 0) && (
  <Button
    type="primary"
    size="small"
    icon={<BranchesOutlined />}
    onClick={() => handleSourceChange('conditionGroup')}
  >
    Add Condition
  </Button>
)}
```

**Visibility:**
- **Shows** when `depth === 0` (parent level conditions)
- **Hidden** when `depth > 0` (nested conditions inside ConditionGroup)
- Can be overridden with `showAddButton` prop

**Available in:**
- ✅ Root level Condition structure (RuleBuilderUI.jsx) - `depth=0`
- ✅ Case WHEN clauses (Case.jsx) - `depth=0`
- ❌ ConditionGroup children - `depth > 0` (they use parent's Add buttons)

**Behavior:**
- Calls `handleSourceChange('conditionGroup')` - same as ConditionSourceSelector "Group" option
- Wraps current condition in a group with a new empty condition
- Styled to match ConditionGroup's "Add Condition" button (primary, BranchesOutlined icon)

**Name Generation:**
- See section 2.4 for details on how names are generated when converting to group
- Group name: Preserves existing or uses "Group"
- First child (existing): Preserves name or uses "Condition 1"
- Second child (new): "Condition 2"

---

### 2.4 Source Changed to ConditionGroup (handleSourceChange - Line 179)
**Location:** `Condition.jsx:179-219`
**Trigger:** User switches to group (wraps existing condition)

**Name Generation Logic:**
```javascript
// Wrap existing condition
const wrappedExistingCondition = {
  ...conditionData,
  name: conditionData.name || 'Condition 1'  // ← Preserve or default
};

// Add new condition
const newCondition = {
  name: 'Condition 2',  // ← Hardcoded
  ...
};

// Create group
const newData = {
  type: 'conditionGroup',
  name: conditionData.name || 'Group',  // ← Preserve or use "Group"
  conditions: [wrappedExistingCondition, newCondition]
};
```

**Behavior:**
- **Group name:** Preserves existing or uses "Group"
- **First child:** Preserves existing or uses "Condition 1"
- **Second child:** Hardcoded "Condition 2"
- **No hierarchical numbering**

---

## 3. ConditionGroup Component (ConditionGroup.jsx)

### 3.1 Component Initialization
**Location:** `ConditionGroup.jsx:105-112`

**Name Generation Logic:**
```javascript
const [groupData, setGroupData] = useState(value || {
  type: 'conditionGroup',
  returnType: 'boolean',
  name: 'Main Condition',  // ← Hardcoded default
  conjunction: 'AND',
  conditions: []
});
```

**Behavior:**
- **New group:** "Main Condition"
- **Loaded group:** Preserves name from value prop

---

### 3.2 Source Changed to RuleRef (handleSourceChange - Line 180)
**Location:** `ConditionGroup.jsx:180-192`

**Name Generation Logic:**
```javascript
const newData = {
  type: 'conditionGroup',
  returnType: 'boolean',
  name: groupData.name || 'Rule Reference',  // ← Preserve or default
  ruleRef: { ... }
};
```

**Behavior:**
- **If name exists:** Preserves current name
- **If no name:** Uses "Rule Reference"

---

### 3.3 Source Changed to Condition (handleSourceChange - Line 193)
**Location:** `ConditionGroup.jsx:193-219`

**Name Generation Logic:**

**A. Extracting from group:**
```javascript
if (groupData.type === 'conditionGroup' && groupData.conditions?.length > 0) {
  const firstCondition = groupData.conditions[0];
  // USES FIRST CONDITION AS-IS (with its name)
}
```

**B. Creating new:**
```javascript
const newData = {
  type: 'condition',
  name: groupData.name || 'Condition',  // ← Preserve or default
  ...
};
```

**Behavior:**
- **From group:** Inherits first child (including name)
- **New:** Preserves existing or uses "Condition"

---

### 3.4 Source Changed to ConditionGroup (handleSourceChange - Line 220)
**Location:** `ConditionGroup.jsx:220-263`

**Name Generation Logic:**
```javascript
// Wrap existing
const wrappedExistingCondition = {
  ...groupData,
  name: groupData.name || 'Condition 1'  // ← Preserve or default
};

// New condition
const newCondition = {
  name: 'Condition 2',  // ← Hardcoded
  ...
};

// Create group
const newData = {
  type: 'conditionGroup',
  name: groupData.name || 'Group',  // ← Preserve or use "Group"
  conditions: [wrappedExistingCondition, newCondition]
};
```

**Behavior:**
- **Group name:** Preserves existing or uses "Group"
- **First child:** Preserves existing or uses "Condition 1"
- **Second child:** Hardcoded "Condition 2"
- **No hierarchical numbering**

---

### 3.5 Add Condition Button (addCondition - Line 277)
**Location:** `ConditionGroup.jsx:277-302`
**Trigger:** User clicks "Add Condition" button inside a group

**Name Generation Logic:**
```javascript
const addCondition = () => {
  const conditions = groupData.conditions || [];
  const newCondition = {
    type: 'condition',
    returnType: 'boolean',
    name: `Condition ${conditions.length + 1}`,  // ← Sequential numbering
    ...
  };
};
```

**Behavior:**
- Uses **sequential numbering** based on array length
- **Not hierarchical** - doesn't use parent's position
- Examples:
  - First child: "Condition 1"
  - Second child: "Condition 2"
  - Third child: "Condition 3"

**Problem:** If parent is at depth 2, children still get "Condition 1", "Condition 2" instead of "Condition 2.1", "Condition 2.2"

---

### 3.6 Add Group Button (addConditionGroup - Line 304)
**Location:** `ConditionGroup.jsx:304-349`
**Trigger:** User clicks "Add Group" button inside a group

**Name Generation Logic:**
```javascript
const addConditionGroup = () => {
  const conditions = groupData.conditions || [];
  const newGroup = {
    type: 'conditionGroup',
    returnType: 'boolean',
    name: `Group ${depth + 2}.${conditions.filter(c => c.type === 'conditionGroup').length + 1}`,  // ← Uses depth
    conjunction: 'AND',
    not: false,
    conditions: [
      {
        name: 'Condition 1',  // ← Hardcoded
        ...
      },
      {
        name: 'Condition 2',  // ← Hardcoded
        ...
      }
    ]
  };
};
```

**Behavior:**
- Uses **depth-based** numbering: "Group {depth+2}.{groupCount}"
- Examples with depth=0:
  - First group: "Group 2.1"
  - Second group: "Group 2.2"
- Examples with depth=1:
  - First group: "Group 3.1"
  - Second group: "Group 3.2"

**Problems:**
1. Uses "Group" instead of "Condition Group"
2. Depth calculation seems off (depth+2)
3. Children are hardcoded as "Condition 1", "Condition 2" without parent prefix

---

## 4. Summary of Issues

**Note:** Some improvements were made on 2025-11-28 (see section 1.1.1), but core naming issues remain.

### 4.1 Inconsistent Naming Conventions
- **Case.jsx:** Uses "Condition {n}" (improved: now creates simple conditions by default)
- **Condition.jsx:** Uses "Condition" or "Group"
- **ConditionGroup.jsx:** Uses "Main Condition", "Group {n}"
- **No unified standard**

**Improvement (2025-11-28):**
- Case WHEN clauses now default to simple `condition` type instead of `conditionGroup`
- Users can switch to Group via ConditionSourceSelector when needed
- More consistent with Condition component behavior

### 4.2 No Hierarchical Numbering for Conditions
- When adding conditions via `addCondition()`, they get simple sequential numbers
- They should inherit parent's position (e.g., "Condition 1.1", "Condition 1.2")

### 4.3 Hardcoded Child Names
- When wrapping conditions in groups, children are hardcoded as "Condition 1", "Condition 2"
- Doesn't account for hierarchical position

### 4.4 Depth-Based Numbering Issues
- `addConditionGroup()` uses `depth + 2` which produces confusing numbers
- Should use hierarchical prefix system instead

### 4.5 Mixed Name Preservation Logic
- Sometimes preserves existing names, sometimes doesn't
- No consistent "auto-generated vs user-defined" detection

---

## 5. Desired Hierarchical Naming System

### Example Structure:
```
Condition Group (root)
├── Condition 1
├── Condition 2  
├── Condition Group 1
│   ├── Condition 1.1
│   ├── Condition 1.2
│   └── Condition Group 1.1
│       ├── Condition 1.1.1
│       └── Condition 1.1.2
└── Condition 3
```

### Requirements:
1. Root level: "Condition Group" (no number)
2. First level children: "Condition 1", "Condition Group 1"
3. Nested children: "Condition 1.1", "Condition Group 1.2"
4. Deep nesting: "Condition 1.2.3", "Condition Group 2.1.1"
5. Detect auto-generated vs user-defined names
6. Preserve user-defined names when structure changes
7. Update auto-generated names when structure changes

---

## 6. Implementation Strategy

### 6.1 Create Centralized Naming Utility
File: `/workspaces/rule-builder/frontend/src/components/RuleBuilder/utils/nameGenerator.js`

Functions needed:
- `generateName(type, parentPrefix, itemIndex, ruleId)` - Generate hierarchical name
- `isAutoGeneratedName(name)` - Detect if name is auto-generated
- `generateResultName(index)` - For Case result names
- Constants for default names

### 6.2 Add parentPrefix Prop
- Flow through component tree: RuleBuilder → Case/Condition → ConditionGroup → children
- Root level: `parentPrefix = ''`
- First level: `parentPrefix = '1'`, `'2'`, `'3'`
- Second level: `parentPrefix = '1.1'`, `'1.2'`, `'2.1'`

### 6.3 Update All Name Generation Call Sites
Replace hardcoded names with calls to centralized utility, passing:
- Type: 'condition', 'conditionGroup', 'ruleRef'
- Parent prefix from props
- Item index within parent (1-based)
- Rule ID (for ruleRef types)

### 6.4 Name Preservation Logic
Before changing structure:
```javascript
const preserveName = !isAutoGeneratedName(currentName);
const newName = preserveName ? currentName : generateName(type, parentPrefix, index);
```
