# Test Reports - Available Options

## 🎯 Three Ways to View Test Results

### 1. **Interactive Vitest UI** (Real-time)
```bash
npm run test:ui
```
- Opens at: http://localhost:51204/__vitest__/
- ✅ Live test execution
- ✅ Filter and search tests
- ✅ See console logs per test
- ✅ Watch mode - auto-reruns on file changes
- ✅ Test coverage visualization
- ✅ Click to see test code

**Best for:** Development and debugging

### 2. **HTML Bug Report** (Static)
```bash
npm run test:bugs
```
- Generates: `bug-report.html`
- ✅ Beautiful visual design
- ✅ Lists all documented bugs
- ✅ Shows test names and details
- ✅ Includes bug comments from code
- ✅ Easy to share with team
- ✅ Can be committed to git

**Best for:** Documentation and sharing

### 3. **Terminal Output** (Quick)
```bash
npm test
```
- ✅ Fast and simple
- ✅ Shows pass/fail status
- ✅ Includes console.log output from tests
- ✅ Good for CI/CD pipelines
- ✅ Shows the 🐛 bug documentation

**Best for:** Quick checks and CI/CD

---

## 📊 What Each Report Shows

### Vitest UI
![Vitest UI](https://vitest.dev/guide/ui.png)
- Test hierarchy (files → describe → test)
- Pass/fail with timing
- Detailed error messages
- Source code links
- Console output per test
- **Can click on tests to see bugs documented in code**

### HTML Bug Report
Shows:
- **2 Bugs Documented** (from test names with "BUG:")
- Bug details extracted from test comments
- Beautiful gradient design
- Stats: 2 bugs, 19 total tests
- Timestamp of when generated

### Terminal Output
Shows:
```
🐛 BUG: Cannot add operators to text expressions
   Cause: canAddOperators() only returns true for numbers
   Impact: Users cannot create text concatenation via UI
   Workaround: Must manually edit JSON
```

---

## 🔍 What's Being Tested

| Test Type | Count | File | Purpose |
|-----------|-------|------|---------|
| **Structure Tests** | 5 | `json-roundtrip.test.js` | Validate JSON structure |
| **Round-trip Tests** | 8 | `roundtrip-integration.test.jsx` | Data integrity through UI |
| **UI Interaction Tests** | 6 | `ui-interaction.test.jsx` | **User workflows (finds bugs!)** |
| **Total** | **19** | 3 files | Comprehensive coverage |

---

## 🐛 Current Bugs Documented

The tests intentionally **document buggy behavior** instead of failing:

1. **Cannot add operators to text expressions**
   - Location: `ui-interaction.test.jsx`
   - Test: "BUG: clicking + on a text expression incorrectly converts to number"
   - Status: ✅ Documented

2. **Text value gets converted to number**
   - Location: `ui-interaction.test.jsx`
   - Test: "BUG: text value gets converted to number when operator is added"
   - Status: ✅ Documented

3. **Warning shows for valid text concatenation**
   - Location: `ui-interaction.test.jsx`
   - Test: "SHOULD WORK: text + text = concatenation"
   - Status: ✅ Shows incorrect warning

4. **New expressions wrapped in expressionGroup**
   - Location: `ui-interaction.test.jsx`
   - Test: "clicking + on a number expression should add another number"
   - Status: ✅ Creates nested structure instead of simple value

---

## 📝 Quick Commands

```bash
# Run all tests once
npm test -- --run

# Watch mode (auto-rerun)
npm test

# Interactive UI
npm run test:ui

# Generate bug report
npm run test:bugs

# Run specific test file
npm test ui-interaction

# Run with coverage
npm test -- --coverage
```

---

## 🎨 HTML Bug Report Preview

The `bug-report.html` file includes:
- **Gradient header** with bug icon
- **Stats cards** showing bug count, test count
- **Bug cards** with:
  - 🐛 Icon
  - Bug number
  - Full test name
  - File name badge
  - Detailed comments from code
- **Hover effects** on bug cards
- **Responsive design** for mobile/desktop
- **Timestamp** in footer

All bugs are extracted from test names containing "BUG:" and comments in the test code.

---

## 💡 Pro Tips

1. **Keep Vitest UI open** while developing - it auto-reruns tests
2. **Generate HTML report before meetings** to share with team
3. **Check terminal output in CI/CD** for quick pass/fail
4. **Test comments are documentation** - they appear in reports!
5. **Bug tests pass** - this is intentional, documenting current behavior

---

## 🔄 Updating Tests After Fixing Bugs

When you fix a bug:

1. Find the test with "BUG:" in the name
2. Update the assertions to expect **correct** behavior
3. Remove "BUG:" from test name or change to "FIXED:"
4. Run tests - they should still pass!

Example:
```javascript
// Before fix:
test('BUG: clicking + converts to number', () => {
  expect(result.type).toBe('number'); // Documents bug
});

// After fix:
test('clicking + maintains text type', () => {
  expect(result.type).toBe('text'); // Expects correct behavior
});
```
