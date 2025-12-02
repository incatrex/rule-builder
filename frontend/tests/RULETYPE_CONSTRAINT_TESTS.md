# RuleType Constraint Testing Strategy

## Overview
Tests for the new context-dependent ruleType constraints feature where:
- **Condition** ruleRefs must use `ruleType: "Condition"` (const/locked)
- **ConditionGroup** ruleRefs must use `ruleType: "Condition Group"` (const/locked)  
- **Expression** ruleRefs default to `ruleType: "Transformation"` (default/flexible)

## Test Files Created

### 1. Unit Tests: RuleReference Component
**File:** `tests/unit/RuleReference.test.jsx`

**Purpose:** Test the constraint prop passing and initial value logic

**Tests:**
- ✅ Passes const constraint correctly to RuleSelector
- ✅ Passes default constraint correctly to RuleSelector
- ✅ Passes no constraint when null
- ✅ Uses constraint value as initial ruleType when no value provided
- ✅ Respects existing ruleType in value over constraint
- ✅ onChange resets rule selection when ruleType changes (default mode)
- ✅ Const constraint prevents ruleType changes

**What it catches:**
- Constraint prop plumbing issues
- Initial value logic bugs
- State management problems

---

### 2. Unit Tests: RuleSelector Component
**File:** `tests/unit/RuleSelector.test.jsx`

**Purpose:** Test the filtering UI behavior for different constraint modes

**Tests:**

#### Const Mode (Locked):
- ✅ Filters rules to only show constrained ruleType
- ✅ RuleType filter dropdown is disabled
- ✅ Displays locked ruleType value in filter

#### Default Mode (Pre-selected):
- ✅ Pre-selects default ruleType but allows changes
- ✅ Shows rules matching default type initially
- ✅ Can change filter to show different ruleType rules

#### No Constraint Mode:
- ✅ Shows all ruleTypes when no constraint
- ✅ Shows all rules regardless of ruleType

#### Edge Cases:
- ✅ Handles constraint with ruleType not in ruleTypes list
- ✅ initialRuleType takes precedence over constraint default

**What it catches:**
- UI filtering logic bugs
- Dropdown enable/disable issues
- Rule list filtering problems

---

### 3. Integration Tests: Component Context
**File:** `tests/integration/ruletype-constraints.test.jsx`

**Purpose:** Test that components use RuleReference correctly in real scenarios

**Tests:**

#### Condition Component:
- ✅ Shows only "Condition" ruleType when using ruleRef source
- ✅ Selecting a rule sets ruleType to "Condition"

#### ConditionGroup Component:
- ✅ Shows only "Condition Group" ruleType when using ruleRef source
- ✅ Selecting a rule sets ruleType to "Condition Group"

#### Expression Component:
- ✅ Defaults to "Transformation" ruleType but allows changes
- ✅ Selecting a rule defaults ruleType to "Transformation"
- ✅ Can change filter to show different ruleTypes

#### JSON Output Validation:
- ✅ Condition ruleRef outputs correct ruleType in JSON
- ✅ Expression ruleRef outputs Transformation ruleType by default

**What it catches:**
- Context propagation issues
- Component integration bugs
- Data flow problems from parent to child
- Output structure validation

---

### 4. Schema Validation Tests
**File:** `tests/schema/ruletype-validation.test.js`

**Purpose:** Ensure JSON Schema validates the constraints correctly

**Tests:**

#### Condition with RuleRef:
- ✅ Validates when ruleType is "Condition"
- ✅ FAILS validation when ruleType is not "Condition"
- ✅ FAILS validation when ruleType is missing

#### ConditionGroup with RuleRef:
- ✅ Validates when ruleType is "Condition Group"
- ✅ FAILS validation when ruleType is not "Condition Group"

#### Expression with RuleRef:
- ✅ Validates with ruleType "Transformation" (default)
- ✅ Validates with different ruleType (default mode allows changes)
- ✅ Validates without ruleType (schema applies default hint)

#### Nested RuleRefs:
- ✅ Expression ruleRef in THEN clause allows flexible ruleType
- ✅ Condition ruleRef in WHEN clause requires "Condition" ruleType

#### RuleType Enum:
- ✅ Schema includes new ruleTypes in enum
- ✅ Rejects invalid ruleType values

**What it catches:**
- Schema constraint definition bugs
- Validation logic errors
- Missing enum values
- Schema structure issues

---

## Test Coverage Summary

### Layer 1: Component Isolation (Unit Tests)
- Tests individual components in isolation
- Mocks dependencies
- Fast execution
- Catches component-level bugs

### Layer 2: Component Integration (Integration Tests)
- Tests components working together
- Real component interactions
- Moderate execution speed
- Catches interaction bugs

### Layer 3: Data Validation (Schema Tests)
- Tests JSON Schema validation
- Backend validation simulation
- Fast execution
- Catches schema definition bugs

### Layer 4: End-to-End (Not included, covered by existing E2E)
- Playwright tests already cover full UI workflows
- Would need updates after implementation

---

## Running the Tests

```bash
# Run all new tests
npm test RuleReference
npm test RuleSelector  
npm test ruletype-constraints
npm test ruletype-validation

# Run all unit tests
npm test tests/unit

# Run all integration tests
npm test tests/integration

# Run all schema tests
npm test tests/schema

# Run everything
npm test
```

---

## Expected Test Results Before Implementation

**Current Status:** ❌ All tests should FAIL initially

This is expected because:
1. `ruleTypeConstraint` prop doesn't exist yet in RuleReference
2. RuleSelector doesn't have constraint handling logic
3. Condition/ConditionGroup/Expression don't pass the constraint prop
4. Schema doesn't have "Condition" or "Condition Group" in RuleType enum
5. Schema doesn't have const/default constraints on ruleRef

---

## Implementation Checklist

Use these tests to guide TDD:

1. ✅ Write tests (DONE)
2. ⏳ Update schema:
   - Add "Condition" and "Condition Group" to RuleType enum
   - Add const constraints for Condition and ConditionGroup ruleRefs
   - Add default constraint for Expression ruleRefs
3. ⏳ Update RuleSelector:
   - Add `ruleTypeConstraint` prop handling
   - Implement locked/default mode filtering
   - Update UI to disable filter in const mode
4. ⏳ Update RuleReference:
   - Accept `ruleTypeConstraint` prop
   - Pass it to RuleSelector
   - Handle initial value logic based on constraint
5. ⏳ Update parent components:
   - Condition: pass `ruleTypeConstraint={{ mode: 'const', value: 'Condition' }}`
   - ConditionGroup: pass `ruleTypeConstraint={{ mode: 'const', value: 'Condition Group' }}`
   - Expression: pass `ruleTypeConstraint={{ mode: 'default', value: 'Transformation' }}`
6. ⏳ Run tests and fix issues until all pass
7. ⏳ Update E2E tests if needed
8. ⏳ Manual testing for edge cases

---

## Benefits of This Test Strategy

1. **TDD Workflow:** Tests written first, guide implementation
2. **Regression Prevention:** Ensures feature works and stays working
3. **Documentation:** Tests serve as usage examples
4. **Confidence:** Comprehensive coverage from unit to schema level
5. **Fast Feedback:** Unit tests run quickly during development
6. **Integration Safety:** Integration tests catch interaction bugs
7. **Schema Validation:** Backend validation is testable without backend running

---

## Notes

- Tests use Vitest + React Testing Library (existing setup)
- Mocks keep unit tests fast and isolated
- Integration tests use real components but mock services
- Schema tests use Ajv (JSON Schema validator)
- Tests are independent and can run in any order
- Each test is focused on one specific behavior
