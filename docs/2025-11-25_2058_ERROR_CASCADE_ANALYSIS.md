# Error Cascade Suppression Analysis

## Summary

Investigation into whether cascade errors from oneOf validation can be safely suppressed without hiding legitimate validation issues.

## Key Findings

### 1. Error Types That Cascade

**oneOf/anyOf violations** are the primary source of cascade errors:
- Wrong expression type: 16 errors (1 root + 15 cascade)
- Missing required field in empty definition: 14 errors (0 root + 14 cascade)
- Pattern violation triggering oneOf: 7 errors (1-2 root + 5-6 cascade)

**Error types that DON'T cascade** (1 error each):
- `required` - missing fields
- `enum` - invalid enum values
- `type` - type mismatches
- `pattern` - pattern violations
- `minItems` - array constraints
- `additionalProperties` - unknown properties

### 2. Risk of Suppression

**CRITICAL RISK IDENTIFIED**: Naive suppression can hide legitimate errors.

**Example - Scenario 3**:
```json
{
  "definition": {
    "type": "value",      // Correct type
    "returnType": "number"
    // Missing "value" field - THIS IS THE REAL ERROR
  }
}
```

- Total errors: 14
- After naive suppression: **0 errors** ❌
- The legitimate "value is required" error gets classified as cascade because:
  - It's a `required` error at `$.definition`
  - It appears alongside oneOf cascade errors
  - Simple filtering can't distinguish it from irrelevant required errors

### 3. Schema-Dependent Logic Required

To safely suppress cascades, filter logic must understand:

1. **Which oneOf branch the user is targeting**
   - Determined by the `type` field value
   - Example: `"type": "value"` → user wants value expression

2. **Which errors are relevant to that branch**
   - Keep: Missing `value` when type is "value"
   - Suppress: Missing `field` when type is "value" (irrelevant branch)

3. **Schema structure and constraints**
   - Expression types: value, field, function, ruleRef, expressionGroup
   - Condition types: condition, conditionGroup
   - Required fields per type
   - Additional properties per type

### 4. Clean Suppression Architecture

```java
// 1. Get original errors
ValidationResult original = service.validate(rule);
int originalCount = original.getErrorCount();

// 2. Apply filtering
FilterResult filtered = ErrorCascadeFilter.filterCascadingErrors(original.getErrors());

// 3. Check for issues
if (filtered.hasHiddenErrors()) {
    log.warn("Suppression may have hidden legitimate errors");
    // Could return original errors with warning, or both filtered + original
}

// 4. Use filtered errors
return new ValidationResult(
    filtered.getFilteredErrors(),
    original.getSchemaFilename(),
    original.getSchemaVersion(),
    filtered.getFilteredErrors().size()
);
```

## Suppression Strategy Options

### Option A: No Suppression (Current)
**Pros**: No risk of hiding errors  
**Cons**: User sees 10-16 errors for single mistake  
**Best for**: Development/debugging

### Option B: Smart Suppression
**Pros**: Clean, focused error messages  
**Cons**: Complex, schema-dependent, risk of bugs  
**Best for**: Production UI with extensive testing

### Option C: Grouped/Collapsed Errors
**Pros**: Show all errors but visually group cascades  
**Cons**: UI complexity  
**Best for**: Power users who want full details

### Option D: Configurable
**Pros**: Let caller decide (API can use raw, UI can use filtered)  
**Cons**: More API surface to maintain  
**Best for**: Flexible systems with different consumer needs

## Recommendations

1. **Initial Release**: Ship with no suppression (Option A)
   - Return all errors from json-schema-validator unchanged
   - Document that oneOf errors cascade
   - UI can handle display/grouping

2. **Future Enhancement**: Add optional filtering parameter
   ```java
   validate(JsonNode rule, String jsonString, boolean calculateLineNumbers, boolean filterCascades)
   ```

3. **Schema Documentation**: Document in schema which fields belong to which oneOf branches
   - Could use custom keywords like `x-oneOf-branch: "value"`
   - Makes filter logic more maintainable

4. **Testing**: If implementing suppression, need extensive test coverage
   - Every oneOf path in schema
   - Every type combination
   - Every error type
   - Regression tests when schema changes

## Schema Version Compatibility

**Current Schema**: rule-schema-current.json v2.0.3

If schema changes affect:
- Expression types (add/remove/rename)
- Condition types
- Required fields per type
- Structure of oneOf/anyOf definitions

Then ErrorCascadeFilter logic MUST be updated and retested.

## Conclusion

**Answer to original questions:**

1. **Can we isolate suppression logic?**  
   Yes - `ErrorCascadeFilter.filterCascadingErrors()` with `FilterResult` containing metadata

2. **Get original count first?**  
   Yes - `FilterResult` tracks: `originalCount`, `filteredCount`, `suppressedCount`, `hasHiddenErrors`

3. **Detect when legitimate errors are hidden?**  
   Partially - `hasHiddenErrors()` flag detects when all errors at a path disappear, but perfect detection is difficult

4. **Is logic schema-dependent?**  
   **Absolutely yes** - Filter must understand:
   - oneOf branch identification (via `type` field)
   - Required fields per branch
   - Valid fields per branch
   - Schema structure

**Recommendation**: Start without suppression. Add it later as optional feature with extensive testing.
