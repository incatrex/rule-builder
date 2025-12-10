# Rule Type Update Script

## Overview

The [update-rule-types.js](./update-rule-types.js) script provides a centralized way to update rule type string values throughout the entire codebase. This ensures consistency across schema definitions, test configurations, sample data, and test files.

**IMPORTANT**: Due to the schema-driven architecture, you only need to change values in the schema and test files. The application code extracts rule type values from the schema at runtime.

## Purpose

This script was created to solve the problem of keeping rule type names synchronized across multiple files when they need to change (e.g., renaming 'GCondition' to 'Condition' or 'BusinessRule').

## Schema-Driven Architecture

The codebase uses a **schema-driven architecture** where:

1. **Schema file** (`rule-schema-current.json`) is the **single source of truth**
2. **Backend runtime code** extracts constraints from schema automatically:
   - `RuleBuilderConfigService.java` - Generates config from schema
   - `XUISemanticValidator.java` - Extracts validation rules from schema
3. **Frontend runtime code** receives config from backend API (no hardcoded values)
4. **Test code** uses separate config files that must be kept in sync with schema

### What Gets Updated Automatically (No Script Needed)

These files extract values from the schema at runtime, so NO changes needed:
- ✅ Backend validation logic (extracts from schema)
- ✅ Backend config API (generates from schema)
- ✅ Frontend components (get values from API)
- ✅ Frontend dropdowns (populated from API)

### What Needs Manual Update (This Script Updates)

These files contain hardcoded strings for tests and samples:
- ❌ Schema file (source of truth)
- ❌ Test configuration files
- ❌ Sample data JSON files
- ❌ Test file string literals
- ❌ E2E test console.log messages (for debugging output)

## How It Works

The script uses a mapping to transform rule type names:

```javascript
const RULE_TYPE_MAPPINGS = {
  'GCondition': 'Condition',           // Current → New
  'SCondition Group': 'Condition Group',
  'AList': 'List',
};
```

**Key Concept**: Left = current value in schema, Right = new value you want

## Usage

### Dry Run (Preview Changes)

```bash
# See what would change without modifying files
node scripts/update-rule-types.js --dry-run
```

### Basic Usage

```bash
# Apply changes
node scripts/update-rule-types.js
```

### Example: Reverting to Original Names

To change from `GCondition`/`SCondition Group`/`AList` back to `Condition`/`Condition Group`/`List`:

```javascript
// In update-rule-types.js, edit RULE_TYPE_MAPPINGS:
const RULE_TYPE_MAPPINGS = {
  'GCondition': 'Condition',              // Revert to original
  'SCondition Group': 'Condition Group',  // Revert to original
  'AList': 'List',                        // Revert to original
};
```

Then run:
```bash
# Preview changes
node scripts/update-rule-types.js --dry-run

# Apply if looks good
node scripts/update-rule-types.js
```

### Example: Changing to New Names

```javascript
const RULE_TYPE_MAPPINGS = {
  'GCondition': 'BusinessRule',
  'SCondition Group': 'RuleSet', 
  'AList': 'DataList',
};
```

## Files Updated

The script automatically updates these files:

1. **Schema file** (single source of truth)
   - `backend/src/main/resources/static/schemas/rule-schema-current.json`

2. **Frontend test configurations**
   - `frontend/tests/testConfig.js` (unit tests)
   - `frontend/e2e/testConfig.js` (E2E tests)

3. **Sample data files**
   - All `.json` files in `backend/src/main/resources/static/rules/samples/`

4. **Backend test files**
   - `backend/src/test/java/com/rulebuilder/service/RuleValidationServiceTest.java`
   - `backend/src/test/java/com/rulebuilder/testutil/TestRuleTypes.java` (documentation comments)

5. **E2E test files**
   - All `.spec.js` files in `frontend/e2e/` (console.log messages)

## Complete Workflow

1. **Edit the mappings** in `scripts/update-rule-types.js`:
   ```javascript
   const RULE_TYPE_MAPPINGS = {
     'GCondition': 'Condition',
     // ... other mappings
   };
   ```

2. **Preview changes** (optional but recommended):
   ```bash
   node scripts/update-rule-types.js --dry-run
   ```

3. **Apply changes**:
   ```bash
   node scripts/update-rule-types.js
   ```

4. **Review changes**:
   ```bash
   git diff
   ```

5. **Rebuild backend** (REQUIRED - backend must reload schema):
   ```bash
   cd backend
   mvn clean package -DskipTests
   ```

6. **Restart backend**:
   ```bash
   ./scripts/start-backend.sh
   ```

7. **Run tests**:
   ```bash
   # Backend tests
   cd backend && mvn test
   
   # Frontend tests  
   cd frontend && npm test
   
   # E2E tests
   npm run test:e2e --prefix frontend
   ```

8. **Commit if all tests pass**:
   ```bash
   git commit -am "Rename rule types: GCondition → Condition"
   ```

## What Gets Updated

### In Schema File
```json
// Before
"enum": ["Reporting", "Transformation", "GCondition", "SCondition Group", "AList"]

// After (example: reverting to originals)
"enum": ["Reporting", "Transformation", "Condition", "Condition Group", "List"]
```

### In Frontend Test Configs
```javascript
// frontend/tests/testConfig.js AND frontend/e2e/testConfig.js

// Before
export const RULE_TYPES = {
  CONDITION: 'GCondition',
  CONDITION_GROUP: 'SCondition Group',
  LIST: 'AList',
}

// After (example: reverting to originals)
export const RULE_TYPES = {
  CONDITION: 'Condition',
  CONDITION_GROUP: 'Condition Group',
  LIST: 'List',
}
```

### In Backend Tests
```java
// Before
"ruleType": "GCondition"

// After (example: reverting to originals)
"ruleType": "Condition"
```

### In Sample Data Files
```json
// Before
{
  "ruleType": "GCondition",
  "definition": {
    "ruleRef": {
      "ruleType": "SCondition Group"
    }
  }
}

// After
{
  "ruleType": "Condition",
  "definition": {
    "ruleRef": {
      "ruleType": "Condition Group"
    }
  }
}
```

### In E2E Test Console Logs
The script updates console.log messages in all `.spec.js` files in `frontend/e2e/` that reference rule types. This includes:
- Log messages showing rule type values: `ruleType="{Condition}"`
- Verification messages with rule type names: `"Condition Group --> Condition 1"`
- Any string (single quote, double quote, or template literal) containing rule type names

```javascript
// Before
console.log(`  - ${testRuleIdCondition} (ruleType="{Condition}")`);
console.log('✓ Verified: Condition Group --> Condition 1, Condition 2');
// Comment: Create test rule with ruleType="Condition Group"

// After (example: if renamed to Business Rule)
console.log(`  - ${testRuleIdCondition} (ruleType="Business Rule")`);
console.log('✓ Verified: Business Rule Group --> Business Rule 1, Business Rule 2');
// Comment: Create test rule with ruleType="Business Rule Group"
```

**Note**: The script intelligently updates rule type references within strings while preserving the surrounding text and code structure. It handles all JavaScript string formats (single quotes, double quotes, and template literals).

## Important Notes

### Why Backend Rebuild is Required

**After updating the schema**, you MUST rebuild and restart the backend because:

1. The schema file is packaged into the JAR during build
2. Backend services (`RuleBuilderConfigService`, `XUISemanticValidator`) load schema on startup
3. They extract rule type constraints from the schema at runtime
4. Frontend gets these values from the backend API

**Without rebuild**: Backend serves old schema values even though file changed.

### Schema-Driven Architecture Benefits

The system is designed so most code doesn't need changes when rule types are renamed:

- ✅ **Backend validation**: Reads constraints from schema at startup
- ✅ **Backend config API**: Generates config from schema on each request  
- ✅ **Frontend components**: Receive rule types from API, no hardcoded values
- ✅ **Dropdowns**: Populated from API data

Only test files need updates because they can't call the API during test setup.

### What DOESN'T Change

The script only updates **rule type string values**. It does NOT change:

- **Variable names** in testConfig.js (CONDITION, CONDITION_GROUP, LIST constants)
- **Structure type strings** ('condition', 'conditionGroup' in lowercase) - these are different concepts
- **Code logic, algorithms, or API methods**
- **Component props or function signatures**

### Files That Don't Need Updates

These files reference rule types but extract them from the schema dynamically:

- `backend/src/main/java/com/rulebuilder/service/XUISemanticValidator.java`
  - Extracts constraints from schema at runtime via `loadRuleTypeConstraints()`
  
- `backend/src/main/java/com/rulebuilder/service/RuleBuilderConfigService.java`
  - Generates config from schema via `generateConfigFromSchema()`
  - Exposes `conditionGroupRuleType` and `conditionAllowedRuleTypes` in API
  
- Frontend components (`Condition.jsx`, `ConditionGroup.jsx`, `RuleSelector.jsx`)
  - Receive rule type values from config prop (which comes from backend API)
  - No hardcoded fallback values (by design - show errors if config missing)

- `backend/src/test/java/com/rulebuilder/testutil/TestRuleTypes.java`
  - Extracts from schema at test runtime
  - Only javadoc comments are updated (for documentation accuracy)

## Verification

After running the script:

```bash
# Check what changed
git diff

# Verify schema updated
grep -A 5 '"enum"' backend/src/main/resources/static/schemas/rule-schema-current.json

# Verify frontend test config
grep "CONDITION:" frontend/tests/testConfig.js
grep "CONDITION:" frontend/e2e/testConfig.js

# Check for any remaining old values in test/sample files
grep -r "GCondition" backend/src/main/resources/ frontend/tests/ frontend/e2e/

# Rebuild and test
cd backend && mvn clean package
mvn test
cd ../frontend && npm test
```

## Troubleshooting

### Script Says "No changes configured"

The mappings have identical old and new values. Edit `RULE_TYPE_MAPPINGS` so left side (current) differs from right side (desired).

### Tests Fail After Update

**Most common cause**: Backend not rebuilt after schema change.

**Solution**:
```bash
cd backend
mvn clean package -DskipTests  # Rebuild to include new schema
./scripts/start-backend.sh      # Restart backend
mvn test                        # Run tests
```

**Other checks**:
- Verify schema file syntax is valid JSON
- Check that test config values exactly match schema enum values
- Review git diff to ensure all expected files changed

### Frontend Shows Old Rule Types

Backend is serving cached/old config because it wasn't rebuilt:
1. Stop backend
2. `cd backend && mvn clean package -DskipTests`
3. Restart backend with `./scripts/start-backend.sh`
4. Clear browser cache and refresh

### E2E Tests Timeout

If tests timeout looking for dropdowns:
1. Check browser console for config errors
2. Verify backend is returning new values: `curl http://localhost:8080/api/v1/rules/ui/config | jq .conditionAllowedRuleTypes`
3. Ensure frontend test config matches backend schema

### Partial Updates Only

The script updates each file independently. If some files fail:
1. Check console output to see which succeeded/failed
2. Review file paths in `FILES_TO_UPDATE`
3. Manually inspect and fix failed files if needed

## Command Line Options

### Dry Run Mode

Preview changes without modifying any files:

```bash
node scripts/update-rule-types.js --dry-run
# or
node scripts/update-rule-types.js -n
```

This shows what would be changed without actually writing to files. Useful for:
- Verifying mappings are correct
- Checking which files will be affected
- Testing regex patterns match correctly

## Advanced Usage

### Escaping Special Characters

The script automatically escapes regex special characters in rule type names. Names with spaces, parentheses, or other special chars work correctly:

```javascript
const RULE_TYPE_MAPPINGS = {
  'Condition (Old)': 'Condition (New)',  // Parentheses handled
  'List+Array': 'List_Array',            // Plus signs handled
};
```

### Adding New Rule Types

If you add entirely new rule types to the schema, no script changes needed. The schema-driven architecture will automatically:
1. Extract them via `RuleBuilderConfigService`
2. Expose them in the `/api/v1/rules/ui/config` endpoint
3. Show them in frontend dropdowns

You only need this script when **renaming existing** rule types.

## Related Files

- **Schema** (source of truth): `backend/src/main/resources/static/schemas/rule-schema-current.json`
- **Frontend unit test config**: `frontend/tests/testConfig.js`
- **Frontend E2E test config**: `frontend/e2e/testConfig.js`
- **Backend validator** (extracts at runtime): `backend/src/main/java/com/rulebuilder/service/XUISemanticValidator.java`
- **Config service** (extracts at runtime): `backend/src/main/java/com/rulebuilder/service/RuleBuilderConfigService.java`
- **Test utilities** (extracts at runtime): `backend/src/test/java/com/rulebuilder/testutil/TestRuleTypes.java`

## See Also

- Main README: `README.md`
- API documentation: `docs/API_REFERENCE.md`
- Frontend test guide: `frontend/tests/README.md`

## Key Takeaway

**The schema is the single source of truth**. Most application code extracts rule type values dynamically from the schema at runtime. This script exists only to keep test files and sample data synchronized with schema changes.

When you rename a rule type:
1. Update the schema (via this script)
2. Rebuild backend (so it loads new schema)
3. Tests automatically get new values from schema
4. Application automatically serves new values via API
5. Frontend automatically displays new values from API

This architecture ensures **one change propagates everywhere automatically**.
