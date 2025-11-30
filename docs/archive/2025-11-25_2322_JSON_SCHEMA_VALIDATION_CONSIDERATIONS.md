# JSON Schema Validation Considerations

This document evaluates potential improvements to the validation stack, including JSON Schema version upgrades and alternative validation libraries.

**Date**: November 26, 2025  
**Current Status**: Using `com.networknt:json-schema-validator v1.0.87` with JSON Schema draft-07

---

## Current Architecture

### Validation Layers

1. **JSON Schema Validation** (draft-07)
   - Library: `com.networknt:json-schema-validator v1.0.87`
   - Validates: Structure, types, required fields, oneOf polymorphism
   - Location: `RuleValidationService.java`

2. **Error Cascade Filtering**
   - Custom implementation: `ErrorCascadeFilter.java`
   - Suppresses cascading errors from oneOf branch failures
   - Identifies root cause errors (const, enum, pattern, additionalProperties)
   - Prioritizes actionable errors: enum > const > pattern > additionalProperties > type > required
   - Adds line number tracking

3. **Semantic Validation** (X-UI Rules)
   - Custom implementation: `XUISemanticValidator.java`
   - Validates: Function arguments match definitions, return types, dynamic args count
   - Business logic validation beyond structural constraints

### Why This Architecture Works

The separation of concerns is clean:
- **Schema**: Structural constraints
- **Filter**: UX optimization (reducing noise)
- **Semantic**: Business rules and domain logic

---

## Option 1: Upgrade to JSON Schema Draft 2020-12

### Current State
- Most schemas use: `http://json-schema.org/draft-07/schema#`
- One schema (v1.0.0) already uses: `https://json-schema.org/draft/2020-12/schema`
- Library supports both versions

### Draft 2020-12 Features

#### 1. `prefixItems`
**Benefit**: Better array validation (replaces tuple-style `items`)

```json
// Draft-07
"items": [
  {"type": "number"},
  {"type": "string"}
]

// Draft 2020-12
"prefixItems": [
  {"type": "number"},
  {"type": "string"}
],
"items": false  // No additional items allowed
```

**Use case**: Could improve validation of dynamic args arrays in functions.

#### 2. `dependentSchemas`
**Benefit**: Cleaner conditional validation

```json
// Draft-07 (complex)
"allOf": [
  {
    "if": {"properties": {"type": {"const": "function"}}},
    "then": {"required": ["function"]}
  }
]

// Draft 2020-12 (cleaner)
"dependentSchemas": {
  "type": {
    "properties": {
      "function": {...}
    },
    "required": ["function"]
  }
}
```

**Use case**: Validating that function args match function definitions.

#### 3. `unevaluatedProperties`
**Benefit**: Better than `additionalProperties: false`

```json
// Draft-07
"additionalProperties": false  // Strict, but limited

// Draft 2020-12
"unevaluatedProperties": false  // Considers all subschemas
```

**Use case**: Better error messages for unknown properties.

#### 4. `$dynamicRef` / `$dynamicAnchor`
**Benefit**: Dynamic schema resolution

**Use case**: Could help with recursive validation of nested structures.

### Analysis: Should We Upgrade?

#### Pros
- ✅ Better array validation with `prefixItems`
- ✅ Cleaner conditional validation with `dependentSchemas`
- ✅ Better error messages with `unevaluatedProperties`
- ✅ Library already supports it (no dependency changes)

#### Cons
- ❌ **Migration effort**: 12 schema versions to update
- ❌ **Complexity**: Schema is already complex; new features add cognitive load
- ❌ **Current solution works**: XUISemanticValidator already handles the complex cases cleanly
- ❌ **Diminishing returns**: Most complex validation is better in code than schema
- ❌ **No cascade improvement**: Still generates cascading errors for oneOf

#### Recommendation: **NO - Don't Upgrade**

**Reasoning**:
1. Our complex validation (function args, dynamic args, return types) is already handled cleanly in **XUISemanticValidator** as semantic validation, which is the **right architectural choice**
2. Draft 2020-12 features wouldn't eliminate ErrorCascadeFilter - we'd still need it
3. The schema is already complex; 2020-12 wouldn't simplify it significantly
4. Development effort better spent on features than schema migration
5. No user-facing benefit - validation already works correctly

**When to reconsider**:
- When creating a new major schema version (v3.0.0+)
- When library drops draft-07 support
- When we need features only in 2020-12 (unlikely given XUISemanticValidator)

---

## Option 2: Alternative JSON Schema Libraries

### Evaluation Criteria
1. **Error cascade handling**: Does it handle oneOf better?
2. **Performance**: Validation speed
3. **Maintenance**: Active development, community support
4. **Features**: Draft support, extensibility
5. **Migration cost**: API compatibility, effort required

### Library Comparison

#### 1. com.networknt:json-schema-validator ⭐ (CURRENT)
- **Version**: 1.0.87
- **Drafts**: draft-04, draft-06, draft-07, draft-2019-09, draft-2020-12
- **Maven**: `com.networknt:json-schema-validator`

**Pros**:
- ✅ Fast performance
- ✅ Actively maintained (last update: 2024)
- ✅ Supports latest drafts
- ✅ Good documentation
- ✅ We already have ErrorCascadeFilter optimized for it

**Cons**:
- ❌ Produces cascading errors for oneOf failures
- ❌ No built-in error filtering
- ❌ Shows "Unknown keyword" warnings for custom extensions

**Error Example** (typo: `cond2ition`):
```
Before ErrorCascadeFilter: 5 errors
After ErrorCascadeFilter:  2 errors (const + 1 cascade)
```

#### 2. everit-org/json-schema
- **Maven**: `org.everit.json:org.everit.json.schema`
- **Status**: ⚠️ Archived 2020 (no longer maintained)

**Pros**:
- ✅ Very strict validation
- ✅ Good error messages

**Cons**:
- ❌ No longer maintained
- ❌ Doesn't support draft 2020-12
- ❌ Also has cascading errors with oneOf
- ❌ Migration risk with no support

**Verdict**: ❌ **Do not use** - abandoned project

#### 3. leadpony/justify
- **Maven**: `org.leadpony.justify:justify`
- **Drafts**: draft-04, draft-06, draft-07

**Pros**:
- ✅ **Best error handling** among alternatives
- ✅ Built-in "fail-fast" mode
- ✅ Better oneOf error suppression
- ✅ Streaming validation support

**Cons**:
- ❌ More complex API
- ❌ Potentially slower
- ❌ Doesn't support draft 2020-12 yet
- ❌ Smaller community

**Error Handling**:
```java
// Justify's built-in filtering
JsonValidationService service = JsonValidation.newService();
ProblemHandler handler = ProblemHandler.throwing(); // Fail-fast mode
```

**Analysis**: Better built-in filtering, but:
- Would require full rewrite of RuleValidationService
- We'd likely still need domain-specific filtering (our ErrorCascadeFilter logic)
- No draft 2020-12 support
- Migration risk

**Verdict**: ⚠️ **Maybe consider** - but high migration cost for uncertain benefit

#### 4. vertx-json-schema
- **Maven**: `io.vertx:vertx-json-schema`
- **Focus**: Async validation

**Pros**:
- ✅ Async/non-blocking validation
- ✅ Good for high-performance scenarios

**Cons**:
- ❌ Tied to Vert.x ecosystem
- ❌ Still has oneOf cascading issues
- ❌ Overkill for our use case (REST API)
- ❌ Would require Vert.x dependencies

**Verdict**: ❌ **Not suitable** - we don't need async validation

#### 5. jsonschemafriend
- **Maven**: `net.jimblackler.jsonschemafriend:core`
- **Drafts**: draft-07, 2019-09, 2020-12

**Pros**:
- ✅ Simple API
- ✅ Good documentation
- ✅ Supports draft 2020-12

**Cons**:
- ❌ Newer/less mature (first release 2020)
- ❌ Smaller community
- ❌ Still has cascading errors
- ❌ Less battle-tested

**Verdict**: ⚠️ **Wait and see** - too new, no clear advantage

---

## The Cascading Error Problem

### Why All Validators Have This Issue

The JSON Schema specification **requires** validators to:
1. Try **all branches** of a `oneOf`
2. Report errors from **each failed branch**
3. Fail if more than one branch succeeds

This is **by design** - validators don't know which branch you "meant" to use.

### Example: Typo `cond2ition` Instead of `condition`

```json
{
  "type": "cond2ition",  // Typo!
  "left": {...},
  "operator": "equal",
  "right": {...}
}
```

**What happens**:
1. Schema has: `"oneOf": [condition_schema, conditionGroup_schema]`
2. Validator tries `condition_schema`:
   - ❌ `type` must be "condition" (const error)
   - ❌ Missing required field "id"
   - ❌ Missing required field "returnType"
3. Validator tries `conditionGroup_schema`:
   - ❌ `type` must be "conditionGroup" (const error)
   - ❌ Missing required field "conditions"

**Result**: 5 errors for a single typo!

### Our Solution: ErrorCascadeFilter

```java
// Identifies root cause errors
boolean isRootCause = "enum".equals(errorType) || 
                     "const".equals(errorType) ||
                     "pattern".equals(errorType) ||
                     "additionalProperties".equals(errorType);

// Priority: enum > const > pattern > additionalProperties > type > required

// Suppresses parent errors when child has root cause
// Suppresses cascading errors from failed oneOf branches
```

**Result**: 2 errors instead of 5:
1. `type` field has const error (shows typo)
2. One suppressed cascade error

### Why Our Solution is Better Than Library Features

1. **Domain-specific**: We understand our schema structure (condition vs expression vs case)
2. **Prioritization**: We know `enum` is more helpful than `additionalProperties`
3. **Context-aware**: We can suppress parent errors when child is the root cause
4. **Line numbers**: We add line number tracking for better UX
5. **Maintained**: We can evolve it as schema evolves

**Other libraries don't solve this fundamentally** - they just present it differently.

---

## Recommendation Summary

### Short Term (Current)
✅ **Keep using**:
- `com.networknt:json-schema-validator v1.0.87`
- JSON Schema draft-07
- ErrorCascadeFilter for cascade suppression
- XUISemanticValidator for business logic

**Rationale**: Working well, battle-tested, no compelling reason to change.

### Medium Term (6-12 months)
⚠️ **Monitor**:
- leadpony/justify for better error handling
- jsonschemafriend for maturity

🔍 **Consider** if:
- ErrorCascadeFilter becomes too complex to maintain
- Performance becomes an issue (unlikely)
- Draft 2020-12 becomes essential for a feature

### Long Term (Next Major Version)
📋 **When creating schema v3.0.0+**:
- Evaluate draft 2020-12 features for new schema design
- Consider justify if it has draft 2020-12 support
- Keep semantic validation in code (XUISemanticValidator pattern)

---

## Implementation Notes

### If We Ever Switch Libraries

**Migration checklist**:
1. ✅ Create parallel validation service (RuleValidationServiceV2)
2. ✅ Run both validators in parallel on test suite
3. ✅ Compare error outputs for equivalence
4. ✅ Adapt ErrorCascadeFilter for new error format
5. ✅ Update RuleSamplesValidationTest
6. ✅ Performance benchmark (validate 1000 rules)
7. ✅ Gradual rollout with feature flag

**Estimated effort**: 3-5 days

**Risk**: Medium - validation is critical, bugs affect all users

### If We Upgrade to Draft 2020-12

**Migration checklist**:
1. ✅ Update schema $schema reference
2. ✅ Replace `additionalProperties` with `unevaluatedProperties` where appropriate
3. ✅ Consider `prefixItems` for dynamic args arrays
4. ✅ Test with all sample rules
5. ✅ Update schema documentation
6. ✅ Bump schema version to v3.0.0

**Estimated effort**: 2-3 days per schema version (12 versions = 24-36 days)

**Risk**: Low - library supports both, can test thoroughly

---

## Conclusion

**Current stack is solid**. The combination of:
- networknt validator (fast, reliable)
- ErrorCascadeFilter (domain-optimized)
- XUISemanticValidator (business logic)

...provides excellent validation with good error messages.

**No compelling reason to change** unless:
1. Performance becomes an issue (hasn't)
2. New schema features are required (aren't)
3. Maintenance burden increases (hasn't)

**Focus development effort on features**, not validation stack changes.

---

## References

- networknt/json-schema-validator: https://github.com/networknt/json-schema-validator
- JSON Schema specifications: https://json-schema.org/specification
- leadpony/justify: https://github.com/leadpony/justify
- Error cascade filter implementation: `backend/src/main/java/com/rulebuilder/service/ErrorCascadeFilter.java`
- Semantic validator: `backend/src/main/java/com/rulebuilder/service/XUISemanticValidator.java`
