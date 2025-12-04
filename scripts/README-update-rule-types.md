# Rule Type Update Script

## Overview

The `update-rule-types.js` script provides a centralized way to update rule type string values throughout the entire codebase. This ensures consistency across schema definitions, test configurations, sample data, and test files.

## Purpose

This script was created to solve the problem of hardcoded rule type names scattered across multiple files. When rule type names need to change (e.g., reverting 'GCondition' back to 'Condition'), this script handles all necessary updates in a single operation.

## How It Works

The script uses a mapping configuration to transform rule type names:

```javascript
const RULE_TYPE_MAPPINGS = {
  'Condition': 'GCondition',           // Left: semantic name, Right: current schema value
  'Condition Group': 'SCondition Group',
  'List': 'AList',
};
```

### Key Concept: Two-Way Naming

- **Left side (Original/SCondition Group names)**: What the rule type represents conceptually
  - `'Condition'` - Condition rules (boolean-returning, referenceable by Condition)
  - `'Condition Group'` - Condition group rules (boolean-returning, referenceable by ConditionGroup)
  - `'List'` - List rules (array-returning)

- **Right side (Current schema values)**: What it's currently called in the schema
  - `'GCondition'` - Current name in schema for Condition rules
  - `'SCondition Group'` - Current name in schema for Condition Group rules
  - `'AList'` - Current name in schema for List rules

## Files Updated

The script automatically updates:

1. **Schema file** (source of truth)
   - `backend/src/main/resources/static/schemas/rule-schema-current.json`

2. **Frontend test configuration**
   - `frontend/tests/testConfig.js`

3. **Sample data files**
   - All `.json` files in `backend/src/main/resources/static/rules/samples/`

4. **Backend test files**
   - `backend/src/test/java/com/rulebuilder/service/RuleValidationServiceTest.java`

## Usage

### Basic Usage

```bash
# From project root
node scripts/update-rule-types.js
```

### Example: Reverting to Original Names

To change from current values back to original names:

```javascript
// In update-rule-types.js, edit RULE_TYPE_MAPPINGS:
const RULE_TYPE_MAPPINGS = {
  'GCondition': 'Condition',           // Revert to original
  'SCondition Group': 'Condition Group',     // Revert to original
  'AList': 'List',        // Revert to original
};
```

Then run:
```bash
node scripts/update-rule-types.js
```

### Example: Changing to New Names

```javascript
const RULE_TYPE_MAPPINGS = {
  'Condition': 'BusinessRule',
  'Condition Group': 'RuleSet',
  'List': 'AccountList',
};
```

## Workflow

1. **Edit the mapping** in `scripts/update-rule-types.js`
2. **Run the script**: `node scripts/update-rule-types.js`
3. **Review changes**: `git diff`
4. **Run backend tests**: `cd backend && mvn test`
5. **Run frontend tests**: `cd frontend && npm test`
6. **Commit if all tests pass**: `git commit -am "Update rule type names"`

## What Gets Updated

### In Schema File
```json
// Before
"enum": ["Reporting", "Transformation", "GCondition", "SCondition Group", "AList"]

// After (if reverting to originals)
"enum": ["Reporting", "Transformation", "Condition", "Condition Group", "List"]
```

### In Frontend Test Config
```javascript
// Before
export const TEST_RULE_TYPES = {
  CONDITION: 'GCondition',
  CONDITION_GROUP: 'SCondition Group',
  LIST: 'AList',
}

// After (if reverting to originals)
export const TEST_RULE_TYPES = {
  CONDITION: 'Condition',
  CONDITION_GROUP: 'Condition Group',
  LIST: 'List',
}
```

### In Backend Tests
```java
// Before
"ruleType": "GCondition"

// After (if reverting to originals)
"ruleType": "Condition"
```

## Important Notes

### Schema-Driven Architecture

The codebase uses a **schema-driven architecture** where:
- The schema JSON file is the **single source of truth**
- Backend extracts constraints from schema at runtime
- Frontend receives config from backend API
- Tests use centralized constants

### What DOESN'T Change

The script only updates **rule type string values**. It does NOT change:

- **Variable names** in testConfig.js (CONDITION, CONDITION_GROUP, etc.)
- **Structure types** ('condition', 'conditionGroup', etc.) - these are different concepts
- **Code logic or algorithms**
- **API endpoints or service methods**

### Files Not Updated

Files that reference these values but extract them from other sources:
- `XUISemanticValidator.java` - Extracts from schema at runtime (schema-driven)
- `RuleBuilderConfigService.java` - Extracts from schema at runtime (schema-driven)
- Frontend components (`Condition.jsx`, `ConditionGroup.jsx`) - Use config from API (schema-driven)

## Verification

After running the script, verify the changes:

```bash
# Check what changed
git diff

# Look for the old values (should find none in actual code/data)
grep -r "GCondition" backend/src/main/resources/
grep -r "SCondition Group" backend/src/main/resources/
grep -r "AList" backend/src/main/resources/

# Run all tests
cd backend && mvn test
cd ../frontend && npm test
```

## Troubleshooting

### No Changes Applied
- Check that RULE_TYPE_MAPPINGS has different values for left and right sides
- Ensure file paths in FILES_TO_UPDATE are correct

### Tests Fail After Update
- Verify schema file updated correctly
- Check that test config values match schema
- Run `git diff` to see exactly what changed

### Partial Updates
- The script updates each file independently
- Check console output to see which files were updated
- Review failed files manually if needed

## Future Enhancements

Potential improvements:
- Add confirmation prompt before making changes
- Support for dry-run mode to preview changes
- Backup files before modifying
- Support for regex patterns in mappings
- Update documentation files automatically

## Related Files

- **Schema**: `backend/src/main/resources/static/schemas/rule-schema-current.json`
- **Frontend Config**: `frontend/tests/testConfig.js`
- **Backend Validator**: `backend/src/main/java/com/rulebuilder/service/XUISemanticValidator.java`
- **Config Service**: `backend/src/main/java/com/rulebuilder/service/RuleBuilderConfigService.java`

## See Also

- `docs/SCHEMA_RULE_TYPE_MIGRATION_COMPLETE.md` - Historical migration notes
- `frontend/tests/README.md` - Frontend test configuration guide
- `docs/API_REFERENCE.md` - API documentation
