# Testing Strategy

## Two Types of Tests

### 1. Round-Trip Tests (`roundtrip-integration.test.jsx`)
**What they test:** Data integrity - JSON → Component → JSON

**How they work:**
- Load pre-made JSON files using `loadRuleData()`
- Wait for component to render
- Extract data using `getRuleOutput()`
- Verify output matches input

**What they catch:**
✅ Data structure preservation
✅ Nested object handling
✅ Field serialization/deserialization
✅ Schema validation

**What they miss:**
❌ UI interaction bugs
❌ User workflow issues
❌ Button behavior problems
❌ Type conversion bugs during editing

**Example:** The CASE_EXPRESSION sample contains text concatenation (`"PATTERN_MATCH_" + LEN(field)`), and the round-trip test passes because it just loads the JSON and extracts it back. It never tests whether a user can CREATE this via the UI.

### 2. UI Interaction Tests (`ui-interaction.test.jsx`)
**What they test:** Actual user interactions - clicking, typing, selecting

**How they work:**
- Use `@testing-library/user-event` to simulate real user actions
- Click buttons, type into inputs, select from dropdowns
- Verify the component state changes correctly
- Check for proper validation and error messages

**What they catch:**
✅ Button click behavior
✅ Type conversion bugs
✅ Dropdown availability
✅ User workflow problems
✅ Warning message accuracy

**What they expose:**
🐛 **BUG #1:** Clicking + button creates expressionGroup instead of value
🐛 **BUG #2:** Can't add operators to text expressions (+ button hidden)
🐛 **BUG #3:** Warning shows for valid text concatenation
🐛 **BUG #4:** New expressions always hardcoded to number type

## Example: Why Both Are Needed

### Scenario: Text Concatenation
```json
{
  "type": "expressionGroup",
  "returnType": "text",
  "expressions": [
    { "type": "value", "returnType": "text", "value": "Hello" },
    { "type": "value", "returnType": "text", "value": " World" }
  ],
  "operators": ["+"]
}
```

**Round-trip test:** ✅ PASSES
- Loads this JSON successfully
- Displays it correctly
- Extracts it back unchanged
- Test is happy!

**UI interaction test:** ❌ FAILS
- Try to create text concatenation from scratch
- Type "Hello" into first expression
- Click + button to add operator
- **BUG:** + button is hidden because `canAddOperators()` returns false for text!
- User cannot create this structure via UI
- Test exposes the real problem!

## Bug Discovery Timeline

1. **Initial Problem:** Blank dropdowns (fixed)
2. **Round-trip tests created:** All passed ✅
3. **Felt confident:** Tests are green!
4. **User tries UI:** Can't create text concatenation 😱
5. **Realized:** Round-trip tests don't test UI creation
6. **Created UI tests:** Exposed 4 bugs that round-trip tests missed

## Running Tests

```bash
# Run all tests
npm test

# Run only round-trip tests
npm test roundtrip

# Run only UI interaction tests
npm test ui-interaction

# Run only JSON structure tests
npm test json-roundtrip
```

## Test Coverage Summary

| Test File | Tests | What It Tests |
|-----------|-------|---------------|
| `json-roundtrip.test.js` | 5 | JSON structure validity |
| `roundtrip-integration.test.jsx` | 8 | Data integrity through component |
| `ui-interaction.test.jsx` | 6 | User interactions and workflows |
| **Total** | **19** | **Comprehensive coverage** |

## Key Takeaways

1. **Round-trip tests validate data**, not user experience
2. **UI tests validate workflows**, not just data structures
3. **You need BOTH** to catch all bugs
4. **Pre-made JSON** can contain features the UI can't create
5. **Green tests** don't always mean users can do their work

## Next Steps to Fix Bugs

The UI interaction tests document the following issues that need fixing:

1. **Support text concatenation:**
   - Modify `canAddOperators()` to allow + for text types
   - Update `addExpression()` to create text expressions when appropriate
   - Add type detection based on existing expressions

2. **Fix expressionGroup wrapping:**
   - New expressions should be simple values, not wrapped in groups
   - Only create expressionGroups when truly nested

3. **Update warning logic:**
   - Don't show "Mathematical operations" warning for text concatenation
   - Distinguish between arithmetic and concatenation operators

4. **Add operator selection by type:**
   - Number: +, -, *, / (arithmetic)
   - Text: + (concatenation only)
   - Date: No operators
   - Boolean: No operators
