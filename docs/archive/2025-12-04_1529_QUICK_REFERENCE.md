# Rule Type Renaming - Quick Reference

## TL;DR

```bash
# 1. Edit mappings in scripts/update-rule-types.js
# 2. Preview changes
node scripts/update-rule-types.js --dry-run

# 3. Apply changes
node scripts/update-rule-types.js

# 4. Rebuild backend (REQUIRED!)
cd backend && mvn clean package -DskipTests

# 5. Restart backend
./scripts/start-backend.sh

# 6. Run tests
mvn test
cd ../frontend && npm test
npm run test:e2e
```

## Edit the Mappings

File: `scripts/update-rule-types.js`

```javascript
const RULE_TYPE_MAPPINGS = {
  'GCondition': 'Condition',              // Current → New
  'SCondition Group': 'Condition Group',
  'AList': 'List',
};
```

## What Gets Updated

| File/Location | What Changes | Why |
|---------------|--------------|-----|
| Schema JSON | Rule type strings in enum/const | Source of truth |
| Test configs (2 files) | RULE_TYPES object values | Tests need hardcoded values |
| Sample data JSON | `"ruleType": "..."` values | Example data |
| Backend tests | String literals in test JSON | Test assertions |
| TestRuleTypes.java | Javadoc comments | Documentation accuracy |

## What Doesn't Need Updates

| File/Location | Why No Update Needed |
|---------------|----------------------|
| RuleBuilderConfigService.java | Extracts from schema at runtime |
| XUISemanticValidator.java | Extracts from schema at runtime |
| Frontend components | Get values from API |
| Dropdowns | Populated from API |
| TestRuleTypes.java (code) | Extracts from schema at test time |

## Common Mistakes

### ❌ Forgot to rebuild backend
**Symptom**: Frontend shows old rule type names in dropdowns
**Fix**: `cd backend && mvn clean package && ./scripts/start-backend.sh`

### ❌ Backend running but not restarted
**Symptom**: API returns old config values
**Fix**: Stop backend, then `./scripts/start-backend.sh`

### ❌ Mapping has same old and new value
**Symptom**: Script says "No changes configured"
**Fix**: Edit right side of mapping to be different from left

### ❌ Tests fail after update
**Symptom**: Tests can't find rules with new names
**Fix**: Verify test config values EXACTLY match schema enum values

## Verification Commands

```bash
# Check schema updated
jq '.definitions.Rule.properties.ruleType.enum' backend/src/main/resources/static/schemas/rule-schema-current.json

# Check API returns new values
curl http://localhost:8080/api/v1/rules/ui/config | jq .ruleTypes

# Search for old values (should find none)
grep -r "GCondition" backend/src/main/resources/static/ frontend/tests/ frontend/e2e/

# Check what changed
git diff
```

## File Paths

| Description | Path |
|-------------|------|
| **Update script** | `scripts/update-rule-types.js` |
| **Schema** | `backend/src/main/resources/static/schemas/rule-schema-current.json` |
| **Frontend unit tests** | `frontend/tests/testConfig.js` |
| **Frontend E2E tests** | `frontend/e2e/testConfig.js` |
| **Sample data** | `backend/src/main/resources/static/rules/samples/*.json` |
| **Backend tests** | `backend/src/test/java/com/rulebuilder/service/RuleValidationServiceTest.java` |
| **Test utilities** | `backend/src/test/java/com/rulebuilder/testutil/TestRuleTypes.java` |

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│ Schema (rule-schema-current.json)      │ ← UPDATE THIS via script
│ Source of truth for rule type names    │
└────────────┬────────────────────────────┘
             │
             ├─────────────────────────────┐
             │                             │
             ▼                             ▼
┌────────────────────────┐    ┌──────────────────────────┐
│ Backend (runtime)      │    │ Tests (hardcoded config) │ ← UPDATE via script
│ • RuleBuilderConfig    │    │ • testConfig.js          │
│ • XUISemanticValidator │    │ • Sample data JSON       │
│ Extracts at startup    │    │ • Test assertions        │
└────────────┬───────────┘    └──────────────────────────┘
             │
             ▼
┌────────────────────────┐
│ API Response           │
│ /api/v1/rules/ui/config│
└────────────┬───────────┘
             │
             ▼
┌────────────────────────┐
│ Frontend (runtime)     │
│ • Components           │
│ • Dropdowns            │
│ Uses API values        │
└────────────────────────┘
```

## Need More Help?

- Full docs: `scripts/README-update-rule-types.md`
- Validation: `scripts/SCRIPT_VALIDATION.md`
- Architecture: `docs/API_REFERENCE.md`
