# Allowing Conditions/ConditionGroups as Rule References - Impact Analysis

**Date**: November 26, 2025  
**Feature**: Support `ruleRef` type for conditions (alongside current expression-only support)

---

## Executive Summary

Currently, `ruleRef` is only supported in **Expression** contexts (right side of equations, function arguments, case results). This analysis explores allowing `ruleRef` in **Condition** contexts, enabling:

1. **Condition as ruleRef**: Reference a boolean-returning rule instead of defining a new condition
2. **ConditionGroup as ruleRef**: Reference a rule that evaluates to a complex condition group

**Recommendation**: ✅ **Implement** - High value, moderate complexity, clear use cases

---

## Current State

### What Works Today

**Expression ruleRef** (✅ Supported):
```json
{
  "type": "condition",
  "returnType": "boolean",
  "left": {
    "type": "ruleRef",
    "returnType": "boolean",
    "id": "IS_VALID_CUSTOMER",
    "uuid": "abc-123-...",
    "version": 1
  },
  "operator": "equal",
  "right": {
    "type": "value",
    "returnType": "boolean",
    "value": true
  }
}
```

**Use case**: Compare a rule's result against a value

### What Doesn't Work Today

**Condition as ruleRef** (❌ Not supported):
```json
{
  "type": "conditionGroup",
  "conjunction": "AND",
  "conditions": [
    {
      // ❌ This doesn't work - we'd need type: "ruleRef" 
      // but conditions require type: "condition" or type: "conditionGroup"
      "type": "condition",
      "left": {...},
      "operator": "equal",
      "right": {...}
    },
    {
      // ❌ Can't do this:
      "type": "ruleRef",
      "returnType": "boolean",
      "id": "CREDIT_CHECK",
      "uuid": "def-456-...",
      "version": 1
    }
  ]
}
```

**Problem**: The schema's `conditions` array only accepts `Condition` or `ConditionGroup`, not `ruleRef`

---

## Proposed Feature: Condition as RuleRef

### Use Cases

#### 1. Reusable Business Rules
**Scenario**: You have a complex validation rule "IS_VALID_CUSTOMER" that checks 10 different fields. You want to reuse it in multiple places.

**Today** (❌ Workaround):
```json
{
  "type": "condition",
  "left": {
    "type": "ruleRef",
    "id": "IS_VALID_CUSTOMER"
  },
  "operator": "equal",
  "right": {"type": "value", "value": true}
}
```
*Clunky - you're comparing against `true` unnecessarily*

**With ruleRef condition** (✅ Proposed):
```json
{
  "type": "ruleRef",
  "returnType": "boolean",
  "id": "IS_VALID_CUSTOMER",
  "uuid": "...",
  "version": 1
}
```
*Clean - the rule IS the condition*

#### 2. Conditional Logic Composition
**Scenario**: Build complex rules from simpler building blocks

```json
{
  "type": "conditionGroup",
  "conjunction": "AND",
  "conditions": [
    {
      "type": "ruleRef",
      "id": "CREDIT_CHECK_PASSED"
    },
    {
      "type": "ruleRef", 
      "id": "AGE_VERIFICATION_PASSED"
    },
    {
      "type": "ruleRef",
      "id": "ADDRESS_VALIDATED"
    }
  ]
}
```
*Each component is independently testable and reusable*

#### 3. Negation of Complex Rules
```json
{
  "type": "conditionGroup",
  "conjunction": "AND",
  "not": true,  // Negate the entire group
  "conditions": [
    {
      "type": "ruleRef",
      "id": "IS_BLACKLISTED"
    }
  ]
}
```
*Cleanly negate a complex rule without wrapping in equality check*

#### 4. A/B Testing and Rule Versioning
```json
{
  "type": "conditionGroup",
  "conjunction": "OR",
  "conditions": [
    {
      "type": "ruleRef",
      "id": "FRAUD_DETECTION_V1",
      "version": 1
    },
    {
      "type": "ruleRef",
      "id": "FRAUD_DETECTION_V2",
      "version": 2
    }
  ]
}
```
*Test new rule versions alongside old ones*

---

## Schema Changes

### 1. Add Optional `ruleRef` Property to Condition and ConditionGroup

**Current Condition**:
```json
"Condition": {
  "type": "object",
  "required": ["type", "returnType", "left", "operator"],
  "properties": {
    "type": { "const": "condition" },
    "returnType": { "const": "boolean" },
    "left": { "$ref": "#/definitions/Expression" },
    "operator": { "enum": ["equal", "not_equal", ...] },
    "right": { "$ref": "#/definitions/Expression" }
  }
}
```

**Proposed Condition**:
```json
"Condition": {
  "type": "object",
  "required": ["type", "returnType"],
  "properties": {
    "type": { "const": "condition" },
    "returnType": { "const": "boolean" },
    "ruleRef": { 
      "$ref": "#/definitions/RuleReference",
      "description": "Optional: If present, this condition is backed by a rule reference instead of left/operator/right"
    },
    "left": { "$ref": "#/definitions/Expression" },
    "operator": { "enum": ["equal", "not_equal", ...] },
    "right": { "$ref": "#/definitions/Expression" }
  },
  "oneOf": [
    {
      "required": ["left", "operator"],
      "description": "Standard condition with left/operator/right"
    },
    {
      "required": ["ruleRef"],
      "description": "Rule reference condition"
    }
  ]
}
```

**Proposed ConditionGroup**:
```json
"ConditionGroup": {
  "type": "object",
  "required": ["type", "returnType"],
  "properties": {
    "type": { "const": "conditionGroup" },
    "returnType": { "const": "boolean" },
    "ruleRef": { 
      "$ref": "#/definitions/RuleReference",
      "description": "Optional: If present, this group is backed by a rule reference instead of conjunction/conditions"
    },
    "conjunction": { "enum": ["AND", "OR"] },
    "not": { "type": "boolean" },
    "conditions": {
      "type": "array",
      "items": {
        "oneOf": [
          { "$ref": "#/definitions/Condition" },
          { "$ref": "#/definitions/ConditionGroup" }
        ]
      }
    }
  },
  "oneOf": [
    {
      "required": ["conjunction", "conditions"],
      "description": "Standard condition group with conjunction/conditions"
    },
    {
      "required": ["ruleRef"],
      "description": "Rule reference condition group"
    }
  ]
}
```

### 2. Add Shared RuleReference Definition

**New definition** (shared across Expression, Condition, ConditionGroup):
```json
"RuleReference": {
  "type": "object",
  "description": "Reference to another rule",
  "required": ["id", "uuid", "version"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Rule identifier (human-readable ID)"
    },
    "uuid": {
      "type": "string",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
      "description": "Rule UUID for version tracking"
    },
    "version": {
      "type": "integer",
      "minimum": 1,
      "description": "Rule version number"
    },
    "returnType": {
      "type": "string",
      "description": "Expected return type of the referenced rule"
    },
    "ruleType": {
      "$ref": "#/definitions/RuleType",
      "description": "Rule type filter (optional, used to filter rule selection in UI)"
    },
    "name": {
      "type": "string",
      "description": "Optional display name for this rule reference"
    }
  },
  "additionalProperties": false
}
```

### 3. Update Expression to Use Shared RuleReference

**Current Expression** (with inline ruleRef):
```json
"Expression": {
  "oneOf": [
    { "$ref": "#/definitions/ValueExpression" },
    { "$ref": "#/definitions/FieldExpression" },
    { "$ref": "#/definitions/FunctionExpression" },
    { "$ref": "#/definitions/RuleRefExpression" }  // Inline definition
  ]
}
```

**Proposed Expression**:
```json
"RuleRefExpression": {
  "type": "object",
  "required": ["type", "returnType", "ruleRef"],
  "properties": {
    "type": { "const": "ruleRef" },
    "returnType": { "type": "string" },
    "ruleRef": { "$ref": "#/definitions/RuleReference" }
  }
}
```

### 4. Semantic Validation Requirements

**New XUISemanticValidator rules**:

1. **Return type validation**:
   ```java
   // For Condition with ruleRef
   if (condition.has("ruleRef")) {
       JsonNode ruleRef = condition.get("ruleRef");
       String returnType = ruleRef.has("returnType") ? ruleRef.get("returnType").asText() : null;
       if (!"boolean".equals(returnType)) {
           error: "Rule references in condition context must return boolean, got: " + returnType;
       }
   }
   
   // For ConditionGroup with ruleRef
   if (conditionGroup.has("ruleRef")) {
       JsonNode ruleRef = conditionGroup.get("ruleRef");
       String returnType = ruleRef.has("returnType") ? ruleRef.get("returnType").asText() : null;
       if (!"boolean".equals(returnType)) {
           error: "Rule references in condition group context must return boolean, got: " + returnType;
       }
   }
   ```

2. **Mutual exclusivity validation**:
   ```java
   // Condition: Can't have both ruleRef and left/operator/right
   if (condition.has("ruleRef") && (condition.has("left") || condition.has("operator") || condition.has("right"))) {
       error: "Condition cannot have both ruleRef and left/operator/right properties";
   }
   
   // ConditionGroup: Can't have both ruleRef and conjunction/conditions
   if (conditionGroup.has("ruleRef") && (conditionGroup.has("conjunction") || conditionGroup.has("conditions"))) {
       error: "ConditionGroup cannot have both ruleRef and conjunction/conditions properties";
   }
   ```

3. **Circular dependency detection**:
   ```java
   // Track rule dependency chain
   void validateNoCycles(String currentRuleId, Set<String> visitedRules) {
       if (visitedRules.contains(currentRuleId)) {
           error: "Circular rule reference detected: " + visitedRules.toString()
       }
       
       // Recursively check all ruleRefs in this rule's definition
       for (ruleRef in getAllRuleRefs(currentRuleId)) {
           visitedRules.add(currentRuleId);
           validateNoCycles(ruleRef.id, visitedRules);
           visitedRules.remove(currentRuleId);
       }
   }
   ```

4. **Version compatibility check**:
   ```java
   // Warn if referenced rule version is deprecated or doesn't exist
   if (!ruleExists(ruleRef.uuid, ruleRef.version)) {
       warning: "Referenced rule version not found: " + ruleRef.id + " v" + ruleRef.version
   }
   ```

---

## UI Changes

### 1. Create Shared RuleReference Component

**New component**: `RuleReference.jsx` - Reusable across Expression, Condition, and ConditionGroup

```jsx
/**
 * Shared component for selecting and displaying rule references
 * Used in Expression.jsx, Condition.jsx, and ConditionGroup.jsx
 */
const RuleReference = ({ 
  value,           // The ruleRef object: { id, uuid, version, returnType, ruleType, name }
  onChange,        // Callback when selection changes
  config,          // { currentRuleId, ... }
  darkMode,
  returnTypeFilter, // Optional: "boolean", "number", "text", etc.
  context          // "expression", "condition", "conditionGroup" for validation messages
}) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* Rule Type Filter */}
      <Select
        placeholder="Filter by rule type"
        value={value?.ruleType}
        onChange={(ruleType) => onChange({ ...value, ruleType })}
        style={{ width: '100%' }}
        allowClear
      >
        <Option value="Validation">Validation</Option>
        <Option value="Reporting">Reporting</Option>
        <Option value="Calculation">Calculation</Option>
      </Select>
      
      {/* Rule Selector Dropdown */}
      <RuleSelector
        value={value?.id ? `${value.id}.${value.uuid}` : null}
        onChange={(selection) => {
          if (selection) {
            onChange({
              ...value,
              id: selection.id,
              uuid: selection.uuid,
              version: selection.version,
              returnType: selection.returnType,
              name: selection.description
            });
          } else {
            onChange(null); // Clear selection
          }
        }}
        ruleTypeFilter={value?.ruleType}
        returnTypeFilter={returnTypeFilter}
        excludeRuleId={config.currentRuleId} // Prevent self-reference
        darkMode={darkMode}
      />
      
      {/* Display selected rule info */}
      {value?.id && (
        <Alert
          message={
            <Space direction="vertical" size={0}>
              <Text strong>{value.id}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                v{value.version} • Returns: {value.returnType}
              </Text>
            </Space>
          }
          type="info"
          showIcon
          icon={<LinkOutlined />}
        />
      )}
      
      {/* Validation warnings */}
      {value?.returnType && returnTypeFilter && value.returnType !== returnTypeFilter && (
        <Alert
          message={`Warning: Type mismatch`}
          description={`This rule returns ${value.returnType}, but ${context} expects ${returnTypeFilter}`}
          type="error"
          showIcon
        />
      )}
      
      {!value?.id && (
        <Alert
          message="No rule selected"
          description="Select a rule to reference"
          type="warning"
          showIcon
        />
      )}
    </Space>
  );
};
```

### 2. Update Condition Component - Add "Use Rule" Toggle

**Current**: `Condition.jsx` routes between single condition and ConditionGroup

**Proposed**: Add toggle in header to switch between manual condition and rule reference

```jsx
const SingleCondition = ({ value, onChange, config, ...props }) => {
  const [useRule, setUseRule] = useState(!!value.ruleRef);
  
  const handleToggleChange = (checked) => {
    setUseRule(checked);
    
    if (checked) {
      // Switch to rule reference mode
      onChange({
        type: 'condition',
        returnType: 'boolean',
        ruleRef: {
          id: null,
          uuid: null,
          version: 1,
          returnType: 'boolean',
          ruleType: null,
          name: null
        }
      });
    } else {
      // Switch to manual condition mode
      onChange({
        type: 'condition',
        returnType: 'boolean',
        left: createEmptyExpression(),
        operator: 'equal',
        right: createEmptyExpression()
      });
    }
  };
  
  return (
    <Card
      size="small"
      title={
        <Space>
          <CheckCircleOutlined />
          <Text strong>Condition</Text>
        </Space>
      }
      extra={
        <Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>Use Rule</Text>
          <Switch 
            checked={useRule}
            onChange={handleToggleChange}
            size="small"
            checkedChildren={<LinkOutlined />}
            unCheckedChildren={<EditOutlined />}
          />
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={onRemove} />
        </Space>
      }
    >
      {useRule ? (
        <RuleReference
          value={value.ruleRef}
          onChange={(ruleRef) => onChange({ ...value, ruleRef })}
          config={config}
          returnTypeFilter="boolean"
          context="condition"
          {...props}
        />
      ) : (
        <>
          {/* Existing left/operator/right UI */}
          <Expression value={value.left} onChange={(left) => onChange({ ...value, left })} />
          <Select value={value.operator} onChange={(operator) => onChange({ ...value, operator })}>
            {/* operator options */}
          </Select>
          <Expression value={value.right} onChange={(right) => onChange({ ...value, right })} />
        </>
      )}
    </Card>
  );
};
```

### 3. Update ConditionGroup Component - Add "Use Rule" Toggle

**Proposed**: Add same toggle pattern to ConditionGroup header

```jsx
const ConditionGroup = ({ value, onChange, config, ...props }) => {
  const [useRule, setUseRule] = useState(!!value.ruleRef);
  
  const handleToggleChange = (checked) => {
    setUseRule(checked);
    
    if (checked) {
      // Switch to rule reference mode
      onChange({
        type: 'conditionGroup',
        returnType: 'boolean',
        ruleRef: {
          id: null,
          uuid: null,
          version: 1,
          returnType: 'boolean',
          ruleType: null,
          name: null
        }
      });
    } else {
      // Switch to manual group mode
      onChange({
        type: 'conditionGroup',
        returnType: 'boolean',
        conjunction: 'AND',
        not: false,
        conditions: []
      });
    }
  };
  
  return (
    <Card
      size="small"
      title={
        <Space>
          <GroupOutlined />
          <Text strong>Condition Group</Text>
          {!useRule && value.conjunction && (
            <Tag color={value.conjunction === 'AND' ? 'blue' : 'green'}>
              {value.conjunction}
            </Tag>
          )}
          {!useRule && value.not && <Tag color="red">NOT</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>Use Rule</Text>
          <Switch 
            checked={useRule}
            onChange={handleToggleChange}
            size="small"
            checkedChildren={<LinkOutlined />}
            unCheckedChildren={<EditOutlined />}
          />
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={onRemove} />
        </Space>
      }
    >
      {useRule ? (
        <RuleReference
          value={value.ruleRef}
          onChange={(ruleRef) => onChange({ ...value, ruleRef })}
          config={config}
          returnTypeFilter="boolean"
          context="conditionGroup"
          {...props}
        />
      ) : (
        <>
          {/* Existing conjunction/conditions UI */}
          <Space>
            <Select value={value.conjunction} onChange={(conjunction) => onChange({ ...value, conjunction })}>
              <Option value="AND">AND</Option>
              <Option value="OR">OR</Option>
            </Select>
            <Checkbox checked={value.not} onChange={(e) => onChange({ ...value, not: e.target.checked })}>
              NOT
            </Checkbox>
          </Space>
          
          <DndContext>
            {value.conditions?.map((condition, index) => (
              <Condition 
                key={index}
                value={condition}
                onChange={(updated) => {
                  const newConditions = [...value.conditions];
                  newConditions[index] = updated;
                  onChange({ ...value, conditions: newConditions });
                }}
                {...props}
              />
            ))}
          </DndContext>
          
          <Space>
            <Button onClick={handleAddCondition}>
              <PlusOutlined /> Add Condition
            </Button>
            <Button onClick={handleAddGroup}>
              <GroupOutlined /> Add Group
            </Button>
          </Space>
        </>
      )}
    </Card>
  );
};
```

### 4. Update Expression Component - Use Shared RuleReference

**Current**: Expression has inline ruleRef rendering

**Proposed**: Use shared RuleReference component

```jsx
// In Expression.jsx, for type === "ruleRef"
const renderRuleRef = () => {
  return (
    <RuleReference
      value={value.ruleRef}
      onChange={(ruleRef) => onChange({ ...value, ruleRef })}
      config={config}
      returnTypeFilter={expectedReturnType} // From parent context
      context="expression"
      darkMode={darkMode}
    />
  );
};
```

### 5. Visual Distinction

**Toggle appearance**:
```jsx
<Switch 
  checked={useRule}
  onChange={handleToggleChange}
  size="small"
  checkedChildren={<LinkOutlined />}  // Link icon when using rule
  unCheckedChildren={<EditOutlined />} // Edit icon when manual
/>
```

**Card styling when using rule**:
```jsx
const cardStyle = useRule ? {
  background: darkMode ? '#1a3a4a' : '#e6f7ff', // Blue tint
  border: `2px dashed ${darkMode ? '#177ddc' : '#1890ff'}`,
} : {
  background: darkMode ? '#1f1f1f' : '#ffffff',
  border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
};
```

**Icon indicators** (unchanged):
- Condition: `<CheckCircleOutlined />` (green)
- ConditionGroup: `<GroupOutlined />` (purple)
- Toggle ON: `<LinkOutlined />` (blue) - indicates rule reference mode

### 6. RuleCanvas Visualization

**Update RuleCanvas** to show rule reference indicators:

```jsx
// In RuleCanvas.jsx
const renderConditionNode = (condition) => {
  if (condition.ruleRef) {
    // Condition/Group backed by rule reference
    return (
      <div className="rule-ref-node">
        <LinkOutlined style={{ color: '#1890ff' }} />
        <span>{condition.ruleRef.id || 'Select Rule'}</span>
        {condition.ruleRef.version && <Tag color="blue">v{condition.ruleRef.version}</Tag>}
      </div>
    );
  }
  
  // ... existing condition/group rendering
};
```

---

## Backend Changes

### 1. RuleValidationService

**No changes needed** - schema validation handles structure automatically

### 2. XUISemanticValidator

**Add new validation method**:

```java
/**
 * Validate rule references in condition context
 */
private void validateConditionRuleRef(JsonNode ruleRefNode, String path, List<ValidationError> errors) {
    // 1. Check return type is boolean
    String returnType = ruleRefNode.get("returnType").asText();
    if (!"boolean".equals(returnType)) {
        errors.add(createError(
            "x-ui-validation",
            path + ".returnType",
            "Rule references in condition context must return boolean, got: " + returnType,
            Map.of("expectedType", "boolean", "actualType", returnType)
        ));
    }
    
    // 2. Check rule exists (if we have access to rule repository)
    String ruleId = ruleRefNode.has("id") ? ruleRefNode.get("id").asText() : null;
    String uuid = ruleRefNode.has("uuid") ? ruleRefNode.get("uuid").asText() : null;
    int version = ruleRefNode.has("version") ? ruleRefNode.get("version").asInt() : 1;
    
    if (ruleId != null && uuid != null) {
        // TODO: Integrate with rule repository to check existence
        // For now, just validate structure
    }
    
    // 3. Circular reference detection (requires access to rule definitions)
    // TODO: Implement when rule repository integration is available
}
```

**Integrate into main validation**:

```java
private void validateCondition(JsonNode conditionNode, String path, List<ValidationError> errors) {
    // Check if using ruleRef
    if (conditionNode.has("ruleRef")) {
        validateConditionRuleRef(conditionNode.get("ruleRef"), path + ".ruleRef", errors);
        
        // Ensure mutual exclusivity
        if (conditionNode.has("left") || conditionNode.has("operator") || conditionNode.has("right")) {
            errors.add(createError("x-ui-validation", path,
                "Condition cannot have both ruleRef and left/operator/right properties"));
        }
    } else {
        // Validate standard condition (left/operator/right)
        validateStandardCondition(conditionNode, path, errors);
    }
}

private void validateConditionGroup(JsonNode groupNode, String path, List<ValidationError> errors) {
    // Check if using ruleRef
    if (groupNode.has("ruleRef")) {
        validateConditionRuleRef(groupNode.get("ruleRef"), path + ".ruleRef", errors);
        
        // Ensure mutual exclusivity
        if (groupNode.has("conjunction") || groupNode.has("conditions")) {
            errors.add(createError("x-ui-validation", path,
                "ConditionGroup cannot have both ruleRef and conjunction/conditions properties"));
        }
    } else {
        // Validate standard group (conjunction/conditions)
        validateStandardConditionGroup(groupNode, path, errors);
    }
}
```

### 3. Rule Repository Integration (Future)

**For full circular dependency detection**, need:

```java
public interface RuleRepository {
    /**
     * Get rule definition by UUID and version
     */
    JsonNode getRuleDefinition(String uuid, int version);
    
    /**
     * Get all rule references in a rule's definition
     */
    Set<RuleReference> getRuleReferences(String uuid, int version);
    
    /**
     * Check for circular dependencies
     */
    boolean hasCircularDependency(String uuid, int version);
}
```

---

## Migration & Rollout

### Phase 1: Schema & Backend (Week 1)
1. ✅ Update schema with `ConditionRuleRef` definition
2. ✅ Modify `ConditionGroup.conditions` to accept `ruleRef`
3. ✅ Add XUISemanticValidator rules for ruleRef validation
4. ✅ Update RuleSamplesValidationTest to test ruleRef conditions
5. ✅ Add backend tests for circular dependency detection (basic)

### Phase 2: UI Components (Week 2)
1. ✅ Create shared `RuleReference.jsx` component
2. ✅ Update `Expression.jsx` to use shared RuleReference component
3. ✅ Add "Use Rule" toggle to `Condition.jsx` header
4. ✅ Add "Use Rule" toggle to `ConditionGroup.jsx` header
5. ✅ Update RuleCanvas to visualize ruleRef indicators
6. ✅ Add UI tests for toggle behavior and ruleRef rendering

### Phase 3: Integration & Testing (Week 3)
1. ✅ Integration tests: Create rule with ruleRef conditions
2. ✅ Integration tests: Load/save/validate ruleRef conditions
3. ✅ UI tests: roundtrip-integration.test.jsx with ruleRef
4. ✅ Manual testing: Circular dependency scenarios
5. ✅ Performance testing: Deeply nested ruleRef chains

### Phase 4: Rule Repository Integration (Week 4+)
1. ⚠️ Implement RuleRepository interface
2. ⚠️ Add database queries for rule lookup
3. ⚠️ Implement full circular dependency detection
4. ⚠️ Add rule versioning compatibility checks
5. ⚠️ Cache rule definitions for performance

---

## Risks & Mitigations

### Risk 1: Circular Dependencies
**Problem**: Rule A references Rule B, which references Rule A

**Mitigation**:
- ✅ **Phase 1**: Client-side validation in UI (check current rule not in chain)
- ✅ **Phase 2**: Basic backend validation (detect immediate cycles)
- ⚠️ **Phase 3**: Full backend validation with rule repository (detect deep cycles)
- 🔄 **Runtime**: Execution engine detects cycles and fails gracefully

**Implementation**:
```jsx
// In RuleSelector
<RuleSelector
  excludeRuleId={currentRuleId}  // Don't allow self-reference
  excludeRuleChain={[...parentRuleIds]} // Don't allow any rule in parent chain
/>
```

### Risk 2: Performance with Deep Nesting
**Problem**: Rule A → Rule B → Rule C → Rule D (deep chain)

**Mitigation**:
- ✅ Set max depth limit in UI (e.g., 5 levels)
- ✅ Backend validation fails if depth > threshold
- ✅ Execution engine has recursion depth limit
- 🔄 Cache rule evaluation results

### Risk 3: Version Compatibility
**Problem**: Referenced rule version gets deleted or modified

**Mitigation**:
- ⚠️ Rule repository maintains version history (immutable)
- ⚠️ Validation warns if referenced version doesn't exist
- ✅ UI shows warning icon for broken references
- 🔄 Rule execution falls back to latest version with warning

### Risk 4: Type Safety
**Problem**: Referenced rule's return type changes from boolean to number

**Mitigation**:
- ✅ XUISemanticValidator checks return type at validation time
- ⚠️ Rule repository maintains type metadata
- 🔄 Execution engine validates types at runtime
- ✅ UI shows error if type mismatch

---

## Alternatives Considered

### Alternative 1: Expression-only (Current)
**Status**: ✅ Currently implemented

**Pros**:
- ✅ Simpler schema
- ✅ No circular dependency concerns
- ✅ Clearer separation of concerns

**Cons**:
- ❌ Verbose syntax (must compare against `true`)
- ❌ Can't negate complex rules cleanly
- ❌ Can't compose condition groups from rule refs

**Verdict**: ❌ Too limiting for real-world use cases

### Alternative 2: Inline Rule Expansion
**Idea**: At save time, expand all rule refs into their full definitions

**Pros**:
- ✅ No runtime rule lookup needed
- ✅ No circular dependency risk
- ✅ Self-contained rules

**Cons**:
- ❌ Loses traceability (which rule was referenced?)
- ❌ Can't update referenced rules independently
- ❌ Large rule definitions (lots of duplication)
- ❌ Versioning nightmare

**Verdict**: ❌ Defeats purpose of reusable rules

### Alternative 3: Hybrid Approach
**Idea**: Support both inline expansion AND rule refs

**Pros**:
- ✅ Flexibility for different use cases
- ✅ Can snapshot rule refs for immutability

**Cons**:
- ❌ Complexity - two ways to do the same thing
- ❌ Confusing UX - when to use which?
- ❌ Harder to maintain

**Verdict**: ⚠️ Maybe consider for Phase 2+

---

## Success Metrics

### User Experience
1. **Rule reusability**: Number of rules using ruleRef conditions
2. **Rule complexity reduction**: Average rule size before/after ruleRef
3. **User satisfaction**: Feedback from rule builders

### Technical
1. **Validation accuracy**: Zero false positives for circular deps
2. **Performance**: Rule validation time < 100ms (including ruleRef lookup)
3. **Error rates**: < 1% of rules with broken ruleRef links

### Business
1. **Rule maintenance time**: Reduced by 30% (update once, apply everywhere)
2. **Rule testing time**: Reduced by 40% (test component rules independently)
3. **Rule library growth**: 50+ reusable rule components in first 3 months

---

## Conclusion

### Recommendation: ✅ **Implement**

**Justification**:
1. **High value**: Enables rule composition, reduces duplication, improves maintainability
2. **Lower complexity than initially thought**: Toggle-based UI is cleaner than separate components
3. **Clear use cases**: Reusable validations, A/B testing, rule versioning
4. **Manageable risks**: Can mitigate circular dependencies, type safety, performance
5. **Code reuse**: Shared RuleReference component across Expression/Condition/ConditionGroup

### Implementation Priority: **High**

**Reasoning**:
- Foundation for advanced features (rule library, marketplace)
- User requests for rule reusability
- Architectural improvement (composition over duplication)

### Next Steps:
1. ✅ Review this analysis with team
2. ✅ Create detailed implementation tasks
3. ✅ Set up development environment for testing
4. 🔄 Implement Phase 1 (schema + backend)
5. 🔄 Implement Phase 2 (UI components)
6. 🔄 Integration testing & rollout

---

## Appendices

### A. Example Rule with RuleRef Conditions

**Using new schema with ruleRef property**:

```json
{
  "structure": "condition",
  "returnType": "boolean",
  "ruleType": "Validation",
  "uuId": "...",
  "version": 1,
  "metadata": {
    "id": "LOAN_APPROVAL",
    "description": "Comprehensive loan approval validation"
  },
  "definition": {
    "type": "conditionGroup",
    "returnType": "boolean",
    "name": "Loan Approval Checks",
    "conjunction": "AND",
    "not": false,
    "conditions": [
      {
        "type": "condition",
        "returnType": "boolean",
        "ruleRef": {
          "id": "CREDIT_SCORE_CHECK",
          "uuid": "abc-123-...",
          "version": 2,
          "returnType": "boolean",
          "name": "Credit Score >= 650"
        }
      },
      {
        "type": "condition",
        "returnType": "boolean",
        "ruleRef": {
          "id": "INCOME_VERIFICATION",
          "uuid": "def-456-...",
          "version": 1,
          "returnType": "boolean",
          "name": "Income > 3x Monthly Payment"
        }
      },
      {
        "type": "conditionGroup",
        "returnType": "boolean",
        "name": "Additional Checks",
        "conjunction": "OR",
        "not": false,
        "conditions": [
          {
            "type": "condition",
            "returnType": "boolean",
            "ruleRef": {
              "id": "HAS_COLLATERAL",
              "uuid": "ghi-789-...",
              "version": 1,
              "returnType": "boolean"
            }
          },
          {
            "type": "condition",
            "returnType": "boolean",
            "ruleRef": {
              "id": "HAS_COSIGNER",
              "uuid": "jkl-012-...",
              "version": 1,
              "returnType": "boolean"
            }
          }
        ]
      },
      {
        "type": "conditionGroup",
        "returnType": "boolean",
        "name": "Exclusions",
        "not": true,
        "ruleRef": {
          "id": "IS_BLACKLISTED",
          "uuid": "mno-345-...",
          "version": 1,
          "returnType": "boolean",
          "name": "Blacklist Check"
        }
      }
    ]
  }
}
```

**Key differences from original proposal**:
- Still uses `type: "condition"` and `type: "conditionGroup"`
- Adds optional `ruleRef` property instead of changing type
- When `ruleRef` is present, `left/operator/right` or `conjunction/conditions` are absent
- Cleaner schema with mutual exclusivity enforced by validation
```

### B. Circular Dependency Detection Algorithm

```java
public class CircularDependencyDetector {
    
    private final RuleRepository ruleRepository;
    private final Map<String, Set<String>> dependencyCache = new HashMap<>();
    
    public boolean hasCircularDependency(String ruleUuid, int version) {
        Set<String> visited = new HashSet<>();
        Set<String> recursionStack = new HashSet<>();
        
        return detectCycle(ruleUuid, version, visited, recursionStack);
    }
    
    private boolean detectCycle(String ruleUuid, int version, 
                               Set<String> visited, Set<String> recursionStack) {
        String key = ruleUuid + ":" + version;
        
        // Mark this node as being explored
        recursionStack.add(key);
        
        // Get all rule refs in this rule's definition
        Set<RuleReference> refs = getRuleReferences(ruleUuid, version);
        
        for (RuleReference ref : refs) {
            String refKey = ref.getUuid() + ":" + ref.getVersion();
            
            // Cycle detected
            if (recursionStack.contains(refKey)) {
                return true;
            }
            
            // Haven't visited this node yet, explore it
            if (!visited.contains(refKey)) {
                if (detectCycle(ref.getUuid(), ref.getVersion(), visited, recursionStack)) {
                    return true;
                }
            }
        }
        
        // Done exploring this node
        recursionStack.remove(key);
        visited.add(key);
        
        return false;
    }
    
    private Set<RuleReference> getRuleReferences(String uuid, int version) {
        // Get rule definition from repository
        JsonNode rule = ruleRepository.getRuleDefinition(uuid, version);
        
        // Extract all ruleRef nodes recursively
        Set<RuleReference> refs = new HashSet<>();
        extractRuleRefs(rule.get("definition"), refs);
        
        return refs;
    }
    
    private void extractRuleRefs(JsonNode node, Set<RuleReference> refs) {
        if (node == null) return;
        
        if (node.has("type") && "ruleRef".equals(node.get("type").asText())) {
            refs.add(new RuleReference(
                node.get("id").asText(),
                node.get("uuid").asText(),
                node.get("version").asInt()
            ));
        }
        
        // Recursively check all child nodes
        node.fields().forEachRemaining(entry -> {
            JsonNode value = entry.getValue();
            if (value.isObject()) {
                extractRuleRefs(value, refs);
            } else if (value.isArray()) {
                value.forEach(item -> extractRuleRefs(item, refs));
            }
        });
    }
}
```

---

## References

- Current schema: `backend/src/main/resources/static/schemas/rule-schema-current.json`
- Expression component: `frontend/src/components/RuleBuilder/Expression.jsx`
- Condition component: `frontend/src/components/RuleBuilder/Condition.jsx`
- XUISemanticValidator: `backend/src/main/java/com/rulebuilder/service/XUISemanticValidator.java`
- Related feature: Rule composition and reusability
