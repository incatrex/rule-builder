# Changes Since Last Commit

**Date:** December 1, 2025  
**Purpose:** Document all changes made while debugging condition naming and header display issues

---

## Overview

This document captures all changes made since the last git commit. The changes were made to address:

1. **Issue #2:** Condition Group headers not showing correctly when inside WHEN clauses (hideHeader functionality)
2. **Issue #3:** Condition Group not displaying as a Card with collapse header
3. **Issue #4:** Confusing hideHeader and compact props - cleanup needed
4. **Issue #5:** RuleRef should preserve whether original source was Condition or ConditionGroup
5. **Issue #6:** Tests using mocked rules instead of real backend integration

---

## File Changes

### 1. Frontend E2E Tests

#### `frontend/e2e/test-condition-naming.spec.js`
**Status:** Modified  
**Changes:**
- Converted all selectors from `page.locator('code:has-text("NAME")')` to `page.getByTestId('condition-header-name')` pattern
- Added test-id based selectors for better reliability
- Added beforeEach hook that creates a timestamp-based test rule, saves it, then reloads page
- This ensures RuleReference dropdown has the test rule available

**Why:** Tests were failing due to timing issues with mocked data and race conditions with element selection

#### `frontend/e2e/test-rule-versioning.spec.js`
**Status:** Modified  
**Changes:**
- Changed test rule ID generation from `Date.now()` to formatted timestamp: `TEST_VERSIONING_YYYY-MM-DD_HHMMSS`
- More readable test rule IDs in backend

**Why:** Improved test rule identification and debugging

#### `frontend/convert-to-testids.py`
**Status:** New file (utility script)  
**Changes:**
- Python script to automate conversion of text-based selectors to test-id selectors
- Not part of production code - development utility

---

### 2. Component Changes

#### `frontend/src/components/RuleBuilder/Condition.jsx`
**Status:** Modified - MAJOR CHANGES  
**Original Lines:** ~700  
**Current Lines:** ~742

**Changes:**

1. **Import Changes (Line 1):**
   - Added `useRef` to imports

2. **Props Documentation (Lines 50-59):**
   - Changed `compact` prop → `hideHeader` prop
   - Clarified prop purposes:
     - `hideHeader`: Hide Card/Collapse wrapper (used in CASE WHEN clauses only)
     - `isSimpleCondition`: Whether this is a parent-level simple condition (shows Add button)
   - Added `onSetExpansion` prop documentation
   - Removed `showAddButton` prop (now calculated internally)

3. **State Management (Lines 93-96):**
   - Added `isLocalUpdate = useRef(false)` to track component-initiated changes
   - This prevents race condition where useEffect overwrites local state changes

4. **useEffect Changes (Lines 115-124):**
   ```javascript
   useEffect(() => {
     if (isLocalUpdate.current) {
       // Skip this update - we just made a local change
       isLocalUpdate.current = false;
       return;
     }
     if (value) {
       const normalized = normalizeValue(value);
       setConditionData(normalized);
       setSourceType(determineSourceType(normalized));
     }
   }, [value]);
   ```
   - Added check for `isLocalUpdate.current` flag
   - Prevents race condition where parent updates overwrite component changes

5. **Show Add Button Logic (Lines 106-109):**
   ```javascript
   const showAddButton = (isSimpleCondition || hideHeader) && sourceType !== 'conditionGroup';
   ```
   - Calculated internally based on props and state
   - Shows button only for parent-level single conditions

6. **ConditionGroup Delegation (Lines 134-142):**
   - Removed `isSimpleCondition` and `compact` props when delegating to ConditionGroup
   - Passes `hideHeader` prop directly

7. **handleSourceChange - All Branches (Lines 154-247):**
   - **ruleRef branch (Line 170):** Added `isLocalUpdate.current = true;` before `onChange(newData)`
   - **condition branch - first path (Line 192):** Added `isLocalUpdate.current = true;` before `onChange(updated)`
   - **condition branch - else path (Line 206):** Added `isLocalUpdate.current = true;` before `onChange(newData)`
   - **conditionGroup branch (Line 246):** Added `isLocalUpdate.current = true;` before `onChange(newData)`
   
   **Why:** Prevents useEffect from overwriting these state changes

8. **Render Content Extraction (Lines 496-617):**
   - Extracted comparison UI into `renderConditionContent()` function
   - Cleaned up rendering logic with proper labels and layout
   - Used consistent structure for Left/Operator/Right sections

9. **hideHeader Mode (Lines 619-622):**
   ```javascript
   if (hideHeader) {
     return renderConditionContent();
   }
   ```
   - When hideHeader is true, renders content directly without Collapse wrapper
   - Used in CASE WHEN clauses where we want inline condition rendering

10. **Collapse Header Cleanup (Lines 636-694):**
    - Removed redundant ruleRef check (now delegated to ConditionGroup)
    - Simplified rendering logic
    - Improved Add Condition button placement

**Why These Changes:**
- **Race Condition Fix:** The useRef flag pattern is standard React for preventing useEffect from undoing component-initiated changes
- **Props Cleanup:** Replaced confusing `compact` prop with clearer `hideHeader` prop
- **Code Organization:** Extracted rendering logic for clarity
- **Correct Delegation:** Properly route between Condition and ConditionGroup

#### `frontend/src/components/RuleBuilder/ConditionGroup.jsx`
**Status:** Modified  
**Original Lines:** ~650  
**Current Lines:** ~680

**Changes:**

1. **Props Documentation (Lines 94-102):**
   - Removed `isSimpleCondition` and `compact` props
   - Added `hideHeader` prop documentation
   - Added `onSetExpansion` prop documentation

2. **Source Type Handling (Lines 187-220):**
   - When switching to ruleRef, now preserves current type (condition or conditionGroup)
   - Changed from:
     ```javascript
     const newName = naming.updateName(
       groupData.name,
       'conditionGroup',
       'ruleRef',
       expansionPath,
       null
     );
     const newData = {
       type: 'conditionGroup',
       returnType: 'boolean',
       name: newName,
       ruleRef: {...}
     };
     ```
   - To:
     ```javascript
     const newName = naming.updateName(
       groupData.name,
       groupData.type, // Keep current type
       groupData.type, // Don't change type
       expansionPath,
       null
     );
     const newData = {
       ...groupData, // Preserve existing structure
       name: newName,
       ruleRef: {...}
     };
     ```

3. **Removed hideHeader Inline Controls (Lines 457-502):**
   - Deleted duplicate header rendering code when hideHeader was true
   - Was showing ConditionSourceSelector inline when hideHeader - no longer needed

4. **RuleReference/Condition Rendering (Lines 464-480):**
   - Removed `compact` prop from RuleReference
   - Set `hideHeader={false}` when delegating to Condition (was previously `compact`)

5. **Child Condition Rendering (Lines 548-556):**
   - Removed `isSimpleCondition` and `compact` props
   - Set `hideHeader={false}` explicitly

6. **hideHeader Mode Comment (Line 605):**
   - Updated comment from "render without any wrapper" to "render without Card/Collapse wrapper"
   - Removed separate "compact mode" section that was doing the same thing

**Why These Changes:**
- **Type Preservation:** When switching to ruleRef, now preserves whether it was originally a Condition or ConditionGroup
- **Props Cleanup:** Removed confusing compact prop, consolidated to hideHeader
- **Simpler Rendering:** One path for hideHeader instead of two similar paths

#### `frontend/src/components/RuleBuilder/Case.jsx`
**Status:** Modified  
**Original Lines:** ~600  
**Current Lines:** ~620

**Changes:**

1. **Line 439:** Added `expansionPath` prop to ConditionSourceSelector:
   ```javascript
   <ConditionSourceSelector
     value={getWhenSourceType(clause.when)}
     onChange={(newType) => handleWhenSourceChange(index, newType)}
     expansionPath={`${expansionPath}-when-${index}`}
   />
   ```

2. **Line 522:** Changed `compact={true}` to `hideHeader={true}` when rendering Condition in WHEN clause:
   ```javascript
   <Condition
     value={clause.when}
     onChange={(newWhen) => updateWhenClause(index, { when: newWhen })}
     config={config}
     darkMode={darkMode}
     hideHeader={true}  // Changed from compact={true}
     expansionPath={`${expansionPath}-when-${index}`}
     isExpanded={isExpanded}
     onToggleExpansion={onToggleExpansion}
     onSetExpansion={onSetExpansion}
     isNew={isNew}
   />
   ```

**Why These Changes:**
- Consistent prop naming across components
- Proper expansion path tracking for nested conditions

#### `frontend/src/components/RuleBuilder/ConditionGroup.jsx.bak`
**Status:** New file (backup)  
**Changes:**
- Backup of ConditionGroup before major refactoring
- Contains older compact prop logic
- Not part of production code

---

### 3. Documentation Files

#### `.github/prompts/custom-function-and-args.prompt.md`
**Status:** New file  
**Changes:**
- Placeholder/notes file for future custom function feature
- Contains design ideas for API-backed dropdown options and custom UI components
- Not part of current implementation

#### `docs/CUSTOM_FUNCTION_IMPLEMENTATION_PROPOSAL.md`
**Status:** New file  
**Changes:**
- Comprehensive proposal for custom function feature (future enhancement)
- TDD-based approach with test plans
- Not part of current implementation

---

## Issue-by-Issue Analysis

### Issue #2: Header Display in WHEN Clauses ❌ NOT FULLY FIXED

**Expected:** Condition/ConditionGroup headers should be hidden when inside CASE WHEN clauses

**Status:** Partially implemented but race condition discovered

**Changes Made:**
1. Renamed `compact` prop to `hideHeader` for clarity
2. Case.jsx now passes `hideHeader={true}` to Condition components in WHEN clauses
3. Condition.jsx checks hideHeader and renders content directly without Collapse wrapper
4. ConditionGroup.jsx respects hideHeader and renders content without Collapse

**What's Working:**
- Props are correctly passed
- hideHeader logic is in place

**What's Not Working:**
- Race condition prevents name from resetting when switching from ruleRef back to Condition
- This is Issue #5 (see below)

---

### Issue #3: Condition Group Card Display ✅ SHOULD WORK

**Expected:** Condition Group should display as a Card with collapse header

**Status:** Should be working (pending testing)

**Changes Made:**
1. ConditionGroup always renders with Collapse unless hideHeader is true
2. Removed confusing dual rendering paths (compact vs normal)
3. Condition properly delegates to ConditionGroup for type='conditionGroup'

**Testing Needed:** Verify that ConditionGroup shows proper Card/Collapse header when not in WHEN clause

---

### Issue #4: Props Cleanup ✅ DONE

**Expected:** Remove confusing hideHeader and compact props

**Status:** Complete

**Changes Made:**
1. Removed `compact` prop from all components
2. Consolidated to single `hideHeader` prop with clear purpose
3. Updated all prop documentation
4. Removed `isSimpleCondition` prop where it was causing confusion

**Result:** Single, clear prop: `hideHeader` - hides Card/Collapse wrapper when true (used in CASE WHEN clauses)

---

### Issue #5: RuleRef Type Preservation ⏳ IN PROGRESS - RACE CONDITION

**Expected:** When switching to ruleRef, preserve whether source was Condition or ConditionGroup

**Status:** Implementation attempted but race condition discovered

**Changes Made:**
1. ConditionGroup.handleSourceChange now preserves `groupData.type` when switching to ruleRef
2. Added useRef flag pattern to prevent race condition in Condition.jsx
3. Set `isLocalUpdate.current = true` before all `onChange()` calls in handleSourceChange
4. useEffect checks flag and skips update when true

**What Should Happen (Row 6 of E2E test):**
1. User has ruleRef with name = "TEST_RULE_ABC" (a rule ID)
2. User switches source from "Rule" to "Condition"
3. handleSourceChange('condition') is called
4. Naming logic calculates newName = "Condition" (resets from rule ID)
5. newData is created with name="Condition"
6. isLocalUpdate.current = true (flag set)
7. setConditionData(newData) (local state updated)
8. onChange(newData) (parent notified)
9. Parent updates and passes back value prop
10. useEffect fires, sees flag is true, skips update, resets flag
11. UI shows "Condition" ✓

**What Was Happening (Race Condition):**
1. Steps 1-8 same as above
2. Parent updates and passes back value prop
3. useEffect fires BEFORE flag check was added
4. useEffect calls setConditionData(normalized) which overwrites "Condition" back to rule ID
5. UI shows rule ID ❌

**Current Status:**
- Fix implemented in code
- All 4 code paths in handleSourceChange now set the flag
- useEffect checks the flag
- Waiting for user confirmation that fix works

---

### Issue #6: Test Improvements ✅ DONE

**Expected:** Tests should use real backend integration with timestamp-based rules instead of mocked data

**Status:** Complete

**Changes Made:**
1. test-condition-naming.spec.js now creates real rule in beforeEach
2. Rule ID format: `TEST_NAMING_YYYY-MM-DD_HHMMSS`
3. Saves rule, then reloads page to ensure RuleReference dropdown is populated
4. test-rule-versioning.spec.js also uses timestamp format
5. Converted all selectors to test-id based for reliability

**Result:**
- Tests now use real backend
- Rule dropdown properly populated before tests run
- More realistic testing scenario
- Better debugging with readable test rule IDs

---

## Race Condition Deep Dive

### The Problem

When a component calls `onChange()` to notify its parent of a state change, the parent updates and passes the new value back via props. This triggers a useEffect that watches the `value` prop. If that useEffect calls `setConditionData()`, it can overwrite the component's own state change before React completes the render cycle.

**Timeline:**
```
T0: Component calls setConditionData(newData)    // Local state queued
T1: Component calls onChange(newData)             // Parent notified
T2: Parent updates and passes back value prop     // Props updated
T3: useEffect fires (watching value)              // Effect triggered
T4: useEffect calls setConditionData(normalized)  // OVERWRITES local change!
T5: React processes state updates                 // Too late - overwritten
```

### The Solution

Use a `useRef` flag to track component-initiated changes:

```javascript
const isLocalUpdate = useRef(false);

// In handleSourceChange or any handler that calls onChange:
setConditionData(newData);
isLocalUpdate.current = true;  // Flag this as our change
onChange(newData);

// In useEffect:
useEffect(() => {
  if (isLocalUpdate.current) {
    // This is our own change bouncing back - ignore it
    isLocalUpdate.current = false;
    return;
  }
  // This is a real external change - process it
  if (value) {
    setConditionData(normalizeValue(value));
  }
}, [value]);
```

**Why This Works:**
1. Flag survives across renders (useRef doesn't trigger re-renders)
2. Flag is checked before any state updates in useEffect
3. Component can distinguish its own changes from parent changes
4. No race condition - flag is set synchronously before onChange

### Where Applied

This pattern was applied in `Condition.jsx` at 4 locations where `onChange()` is called:

1. **handleSourceChange - ruleRef branch** (Line 170)
2. **handleSourceChange - condition branch (first path)** (Line 192)
3. **handleSourceChange - condition branch (else path)** (Line 206)
4. **handleSourceChange - conditionGroup branch** (Line 246)

---

## Test Status

### Unit Tests
- **Status:** ✅ All 102 tests passing (not affected by these changes)
- **Location:** `frontend/src/tests/`

### E2E Tests - Condition Naming
- **Status:** ⏳ In progress - debugging Row 6
- **Location:** `frontend/e2e/test-condition-naming.spec.js`
- **Rows Status:**
  - Rows 1-5: ✅ Passing (includes rule selection after page reload)
  - Row 6: ⏳ Testing race condition fix
  - Row 8: ⏳ Blocked on Row 6
  - Rows 9-27: ⏸️ Not yet tested

### E2E Tests - Rule Versioning
- **Status:** ✅ Should still be passing
- **Location:** `frontend/e2e/test-rule-versioning.spec.js`
- **Changes:** Only test rule ID format changed

---

## Rollback Instructions

To rollback to the last committed version:

```bash
# 1. View what will be reverted
git status
git diff

# 2. Rollback all changes
git reset --hard HEAD

# 3. Clean up any new files
git clean -fd

# 4. Verify clean state
git status
```

---

## Systematic Re-Application Plan

If you rollback and want to re-apply changes systematically:

### Phase 1: Props Cleanup (Issue #4)
**Estimated Time:** 30 minutes

1. Rename `compact` → `hideHeader` in Condition.jsx
2. Update Condition prop documentation
3. Update ConditionGroup to remove isSimpleCondition/compact
4. Update Case.jsx to use hideHeader
5. Test: Verify conditions still render correctly

**Verification:** Manual testing of condition rendering in both normal and WHEN clause contexts

---

### Phase 2: Type Preservation (Issue #5 - Part 1)
**Estimated Time:** 20 minutes

1. Update ConditionGroup.handleSourceChange for ruleRef
2. Preserve groupData.type instead of hardcoding 'conditionGroup'
3. Spread groupData instead of creating new object

**Verification:** Manual test: Create ConditionGroup → switch to Rule → switch back → verify still ConditionGroup

---

### Phase 3: Test Infrastructure (Issue #6)
**Estimated Time:** 45 minutes

1. Update test-condition-naming.spec.js beforeEach
2. Add timestamp rule creation and page reload
3. Convert selectors to test-ids
4. Update test-rule-versioning.spec.js timestamp format

**Verification:** Run E2E tests: `npx playwright test e2e/test-condition-naming.spec.js`

---

### Phase 4: Race Condition Fix (Issue #5 - Part 2)
**Estimated Time:** 30 minutes

1. Add useRef import to Condition.jsx
2. Add isLocalUpdate ref declaration
3. Update useEffect with flag check
4. Add flag set before each onChange in handleSourceChange (4 locations)

**Verification:** Run Row 6 of condition naming test

---

### Phase 5: Header Display (Issue #2 & #3)
**Estimated Time:** 15 minutes

1. Verify hideHeader prop is correctly passed through Case.jsx
2. Verify Condition.jsx renders without Collapse when hideHeader=true
3. Verify ConditionGroup renders with Card/Collapse when hideHeader=false

**Verification:** Manual testing + E2E tests

---

## Testing Checklist

Before considering work complete, verify:

- [ ] All 102 unit tests passing
- [ ] E2E condition naming test Rows 1-27 passing
- [ ] E2E rule versioning test passing
- [ ] Manual test: Condition shows Collapse header (normal mode)
- [ ] Manual test: Condition renders inline (hideHeader mode in WHEN)
- [ ] Manual test: ConditionGroup shows Card/Collapse (normal mode)
- [ ] Manual test: ConditionGroup renders inline (hideHeader mode in WHEN)
- [ ] Manual test: Convert Condition → Rule → Condition → name resets correctly
- [ ] Manual test: Convert ConditionGroup → Rule → ConditionGroup → structure preserved
- [ ] Manual test: Rule selection works in dropdown
- [ ] Manual test: Rule name updates when rule selected/cleared
- [ ] No console errors
- [ ] No React warnings about keys/props
- [ ] Performance: No lag when typing or switching sources

---

## Known Issues / Limitations

1. **Race Condition Fix Unverified:**
   - The useRef flag pattern is implemented but not yet confirmed working
   - Row 6 of E2E test is the critical verification point

2. **ConditionGroup Type Preservation:**
   - Implementation changes the approach but needs testing
   - Previous behavior might have had edge cases we're not aware of

3. **Test Coverage:**
   - Only tested Rows 1-6 of condition naming so far
   - Rows 7-27 may reveal additional issues

4. **Manual Testing Needed:**
   - Header display in various contexts needs visual verification
   - Card/Collapse rendering needs visual verification

---

## Performance Notes

**Bundle Size Impact:** Negligible
- Added one useRef (no bundle impact)
- Refactored existing code (no new dependencies)

**Runtime Performance:** Should improve slightly
- Eliminated duplicate rendering logic
- Reduced prop drilling with clearer semantics

---

## Code Quality

**Before Changes:**
- Props: compact, isSimpleCondition, showAddButton, hideHeader (confusing overlap)
- Race condition bug in state management
- Duplicate rendering paths for compact mode
- Type not preserved when switching to ruleRef

**After Changes:**
- Props: hideHeader only (clear purpose)
- Race condition handled with standard React pattern
- Single rendering path with conditional wrapper
- Type preserved when switching to ruleRef

---

## Dependencies

No new dependencies added. All changes use existing React features:
- `useRef` (already imported in other components)
- Standard React patterns

---

## Related Documentation

- `docs/ID-NAME-ANALYSIS.md` - Analysis of ID vs name handling
- `docs/CONDITION_RULEREF_ANALYSIS.md` - Analysis of condition/ruleRef relationship
- `frontend/TEST-REPORTS.md` - Test execution results
- `CONDITION_NAMING_FIX_SUMMARY.md` - Earlier naming fix summary
- `NAMING_IMPLEMENTATION_PLAN.md` - Original naming system design

---

## Next Steps

1. **Immediate:** User to test Row 6 with race condition fix
2. **If Row 6 passes:** Test Row 8 (should now work)
3. **If Row 8 passes:** Run full Scenario 1 (Rows 2-27)
4. **If Scenario 1 passes:** Manual testing of header display
5. **If all passes:** Commit changes with descriptive message
6. **If issues found:** Debug and iterate

---

## Questions for User

Before proceeding with systematic re-application, please confirm:

1. What issues from the original list are highest priority?
2. Do you want to keep the test infrastructure changes (timestamp rules)?
3. Do you want the race condition fix (required for type preservation)?
4. Do you want the props cleanup (hideHeader vs compact)?
5. Is there anything in this document that's unclear or needs more detail?

---

## Conclusion

This document provides a complete record of all changes made since the last commit. The changes address real bugs (race condition, type preservation) and improve code quality (props cleanup), but they also introduce complexity that needs verification.

**Recommendation:** Start with clean slate, then systematically apply changes one phase at a time with testing between each phase. This will help identify exactly which change (if any) caused issues versus the working committed version.
