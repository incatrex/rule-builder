# Unify Discriminator Field Naming: Change "source" to "type"

## Issue

The current schema uses inconsistent naming for discriminator fields:
- `ConditionGroup` and `Condition` use `"type"` field
- `ExpressionGroup` and `BaseExpression` use `"source"` field

This creates confusion and inconsistency across the schema.

## Proposal

Standardize on `"type"` as the discriminator field name across ALL structures.

## Changes Required

### 1. Schema Updates (`rule-schema-v1.0.1.json`)

#### ExpressionGroup Definition
Change:
```json
"source": {
  "type": "string",
  "const": "expressionGroup",
  "description": "Source type identifier for expression groups"
}
```

To:
```json
"type": {
  "type": "string",
  "const": "expressionGroup",
  "description": "Type identifier for expression groups"
}
```

#### BaseExpression Definition
Change:
```json
"source": {
  "type": "string",
  "enum": ["value", "field", "function"],
  "description": "Source type of the expression"
}
```

To:
```json
"type": {
  "type": "string",
  "enum": ["value", "field", "function"],
  "description": "Type of the expression"
}
```

Update all schema validation logic that references `"source"` to reference `"type"` instead.

### 2. Sample Files Updates

Update all three sample files to use `"type"` instead of `"source"`:

- `COMPREHENSIVE_CONDITION[aaaaaaaa-1111-2222-3333-000000000001][1].json`
- `CASE_EXPRESSION[bbbbbbbb-2222-3333-4444-000000000002][1].json`
- `MATH_EXPRESSION[cccccccc-3333-4444-5555-000000000003][1].json`

Find and replace in all ExpressionGroup and BaseExpression objects:
- `"source": "expressionGroup"` → `"type": "expressionGroup"`
- `"source": "value"` → `"type": "value"`
- `"source": "field"` → `"type": "field"`
- `"source": "function"` → `"type": "function"`

### 3. Backend Code Updates

Search for references to `"source"` field in:
- `RuleBuilderService.java`
- Any DTOs or model classes that parse rule JSON
- Any validation or processing logic

Update to use `"type"` field instead.

### 4. Frontend Code Updates

Search for references to `"source"` field in:
- `App.jsx`
- `JsonEditor.jsx`
- Any component that reads or writes rule structures
- Any utility functions that process expressions

Update all code that checks `node.source === "expressionGroup"` to check `node.type === "expressionGroup"` (and similarly for other values).

### 5. Documentation Updates

Update `rule_schema.md` to reflect the change:
- Replace all mentions of `source` field with `type` field
- Update all example JSON snippets
- Add a note about this change in the implementation notes section

### 6. Testing

After making changes:
1. Validate all three sample files against the updated schema
2. Test frontend rule creation/editing to ensure it generates correct JSON
3. Test backend validation with the new field name
4. Verify that existing rules (if any) need migration or backward compatibility

## Benefits

- **Consistency**: Single discriminator field name across all structures
- **Clarity**: "type" is more semantic and widely understood
- **Maintainability**: Easier to understand and work with the schema

## Breaking Change Notice

This is a **breaking change** that will require:
- Schema version bump (suggest v1.1.0)
- Migration of any existing rule files
- Updates to all code that reads/writes rule structures

## Migration Path

If there are existing rule files in production:
1. Create a migration script that updates all JSON files
2. Support both "source" and "type" temporarily during transition
3. Update schema to accept both fields with deprecation warning
4. After migration period, remove "source" support

## Validation

After implementation, verify:
- [ ] Schema validates successfully with new field name
- [ ] All 3 sample files validate successfully
- [ ] Frontend generates rules with "type" field
- [ ] Backend validates rules with "type" field
- [ ] Documentation reflects the change
- [ ] No console errors in frontend
- [ ] No validation errors in backend
