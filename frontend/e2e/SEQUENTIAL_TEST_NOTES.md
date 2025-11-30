# Sequential Test Structure - Key Insight

## User Correction (2025-11-29)

The CSV file `docs/test-scenarios-condition-names.csv` defines **2 SEQUENTIAL scenarios**, not 10 independent tests:

1. **"New Simple Condition"** (CSV rows 2-27) - 26 sequential steps
2. **"New Case Expression"** (CSV rows 30-69) - 40 sequential steps

Each step **builds on all previous steps** within that scenario. The tests must be run as continuous flows, not as independent test cases.

## Original Incorrect Interpretation

The original test file `condition-naming-scenarios.spec.js` broke these into 10 separate test cases:
- Scenarios 1-5: Different parts of "New Simple Condition" 
- Scenarios 6-10: Different parts of "New Case Expression"

This was **incorrect** because:
- Each test started fresh, losing state from previous steps
- Steps that depended on earlier setup would fail
- Couldn't properly test user custom naming persistence across multiple transformations

## Correct Test Structure

### Scenario 1: New Simple Condition
All steps execute in one continuous test:
1. Create rule with default structure → "Condition"
2. Convert to Group → "Condition Group" with "Condition 1", "Condition 2"
3. Convert to Rule → "Condition"
4. Select rule "SAVE" → "SAVE"
5. Convert back to Condition → "Condition"
6. Convert to Group again → "Condition Group" with children
7. Convert Condition 1 to Group → "Condition Group 1" with "1.1", "1.2"
8. Convert Condition 1 to Rule → "Condition 1"
9. Convert back to Condition → "Condition 1"
10. Convert Condition 2 to Group → "Condition Group 2" with "2.1", "2.2"
11. Convert Condition 2.1 to Group → "Condition Group 2.1" with "2.1.1", "2.1.2"
12. Add Group to root → "Condition Group 3" with "3.1", "3.2"
13. Rename Condition 1 to "User Named 1"
14. Convert "User Named 1" to Group → preserves custom name, children are "1.1", "1.2"
15. Convert back to Condition → preserves "User Named 1"
16. Convert to Group again → still "User Named 1"
17. Rename child 1.1 to "User Named 2"
18. Convert "User Named 1" back to Condition → preserves custom name
19. Convert "User Named 1" to Rule → preserves custom name
20. Select rule → replaces with rule ID
21. Convert back to Condition → reverts to auto-generated "Condition 1"

### Scenario 2: New Case Expression
Similar continuous flow with 40 steps testing Case expressions, WHEN clauses, THEN expressions, etc.

## Implementation Files

- `condition-naming-scenarios-sequential.spec.js` - New correct implementation (2 long tests)
- `condition-naming-scenarios.spec.js` - Original incorrect implementation (10 short tests)

## Known Issues

1. **Rule selection helpers need debugging** - currently skipped with TODO markers
2. **Child visibility after parent group conversion** - nested children may not be visible immediately
3. **"Add Group to root" button selector** - needs better selector strategy
4. **Expression source changes in THEN clauses** - helper function needs implementation

## Test Execution Status

As of 2025-11-29:
- Sequential test structure created but not fully passing yet
- Original 10-test structure had 8/10 passing (incorrect approach)
- Need to complete sequential implementation and debug remaining issues
