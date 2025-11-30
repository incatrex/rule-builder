# Test Coverage Summary & Redundancy Analysis

## Overview

The Rule Builder project uses two test scripts to provide comprehensive test coverage across different testing layers:

- **[test.sh](../scripts/test.sh)** - Unit & Integration Tests (197 tests, ~20 seconds)
- **[test-integration.sh](../scripts/test-integration.sh)** - End-to-End Tests (1 test, ~3 minutes)

---

## test.sh - Unit & Integration Tests

Runs all unit and integration tests without requiring running services. Fast feedback for developers.

### Backend Tests (97 tests)

#### 1. [RuleSamplesValidationTest](../backend/src/test/java/com/rulebuilder/integration/RuleSamplesValidationTest.java) (7 tests)
- Integration tests validating sample JSON rule files
- Tests rule files load and validate against schema
- Verifies real-world rule structures

#### 2. [RuleBuilderControllerTest](../backend/src/test/java/com/rulebuilder/controller/RuleBuilderControllerTest.java) (12 tests)
- REST API endpoint tests
- CRUD operations (create, read, update rules)
- Version management endpoints
- SQL generation endpoints
- Error handling

#### 3. [RuleValidationLineNumberTest](../backend/src/test/java/com/rulebuilder/service/RuleValidationLineNumberTest.java) (12 tests)
- Line number tracking in validation errors
- JSON path to line number mapping
- Error message formatting with line numbers
- Helps developers locate errors in JSON

#### 4. [RuleValidationServiceTest](../backend/src/test/java/com/rulebuilder/service/RuleValidationServiceTest.java) (21 tests)
- Schema validation logic
- Type checking (return types, field types)
- Required field validation
- Enum validation (operators, types)
- Structure validation (condition, case, expression)
- Error message generation

#### 5. [XUISemanticValidatorTest](../backend/src/test/java/com/rulebuilder/service/XUISemanticValidatorTest.java) (35 tests)
- Custom business logic validation (beyond schema)
- Type consistency checking
- Expression operator validation by type
- Function argument validation
- Rule reference validation
- Semantic rules enforcement

#### 6. [ErrorCascadeFilterTest](../backend/src/test/java/com/rulebuilder/service/ErrorCascadeFilterTest.java) (10 tests)
- Error deduplication logic
- Cascading error suppression
- Root cause identification
- Error priority handling

### Frontend Tests (100 tests)

#### 1. [json-roundtrip.test.js](../frontend/src/tests/json-roundtrip.test.js) (5 tests)
- JSON structure validation
- Nested structure handling
- Data integrity checks

#### 2. [useExpansionState.test.js](../frontend/src/components/RuleBuilder/hooks/__tests__/useExpansionState.test.js) (23 tests)
- Expand/collapse state management hook
- Path-based expansion tracking
- Bulk operations (expand all, collapse all)

#### 3. [useRuleHistory.test.js](../frontend/src/components/RuleHistory/__tests__/useRuleHistory.test.js) (5 tests)
- Version history loading
- Version restore logic
- Error handling for history operations

#### 4. [condition-operator.test.jsx](../frontend/src/tests/condition-operator.test.jsx) (8 tests)
- Operator selection by type
- Operator configuration
- Type-specific operators

#### 5. [useRuleBuilder.test.js](../frontend/src/components/RuleBuilder/__tests__/useRuleBuilder.test.js) (4 tests)
- Main rule builder hook logic
- State management
- Save/load operations

#### 6. [roundtrip-integration.test.jsx](../frontend/src/tests/roundtrip-integration.test.jsx) (8 tests)
- Load rule JSON → Render UI → Export JSON
- Verify JSON matches original
- Tests CASE, CONDITION, EXPRESSION structures
- Data integrity through UI rendering

#### 7. [condition-naming.test.js](../frontend/src/tests/condition-naming.test.js)
- Condition name generation
- Naming conventions

#### 8. [ui-creation.test.jsx](../frontend/src/tests/ui-creation.test.jsx) (6 tests)
- UI component creation workflows
- Feasibility studies for UI operations
- Documents limitations

#### 9. [ui-interaction.test.jsx](../frontend/src/tests/ui-interaction.test.jsx) (6 tests)
- User interactions (clicking, typing)
- Component behavior
- Operator addition/removal
- Default configurations

---

## test-integration.sh - E2E Playwright Tests

Requires both backend and frontend servers running. Tests complete user workflows through a real browser.

### [rule-versioning.spec.js](../frontend/e2e/rule-versioning.spec.js) (1 comprehensive test, 8 workflow steps)

Full end-to-end workflow testing the entire system:

1. **Create new rule v1** - User creates rule via UI
2. **Save and verify** - Rule persists to database
3. **Load rule and modify to v2** - User loads and updates rule
4. **Save and verify history** - Both versions show in history table
5. **Clear and reload rule** - Verify persistence across sessions
6. **View version 1** - Load and display specific version
7. **View version 2** - Switch between versions
8. **Restore version 1 as v3** - Test restore functionality
9. **Verify all versions** - Complete version history maintained

---

## Test Layer Comparison

| Aspect | test.sh | test-integration.sh |
|--------|---------|---------------------|
| **Level** | Unit + Integration | End-to-End |
| **Scope** | Individual components/services | Full user workflow |
| **Backend** | Logic + API endpoints (mocked) | Real HTTP calls |
| **Frontend** | Component rendering (jsdom) | Real browser (Playwright) |
| **Database** | Mocked/In-memory | Real persistence |
| **Network** | No HTTP | Real HTTP requests |
| **Speed** | Fast (~20 sec) | Slow (~2-3 min) |
| **Run Frequency** | Every commit | Pre-deployment |
| **Setup Required** | None | Backend + Frontend servers |

---

## Redundancy Analysis

### ✅ No Significant Redundancy

The scripts test **different layers** of the application:

#### Intentional Overlap:
- **[roundtrip-integration.test.jsx](../frontend/src/tests/roundtrip-integration.test.jsx)** (in test.sh): Tests UI→JSON conversion **without HTTP**
- **[rule-versioning.spec.js](../frontend/e2e/rule-versioning.spec.js)** (in test-integration.sh): Tests same workflow **with real backend**

**Why both exist:**
- Frontend roundtrip tests = Fast feedback during development
- E2E Playwright tests = Catches integration issues (network, backend, database)

#### Unique to test.sh:
- Schema validation details
- Error handling edge cases
- Line number tracking
- Semantic validation rules
- Component-level behavior
- Hook logic in isolation

#### Unique to test-integration.sh:
- Real browser rendering (CSS, layout, user interactions)
- Actual HTTP requests (network errors, timeouts)
- Database persistence (transaction handling, constraints)
- Version management end-to-end (full CRUD lifecycle)
- Cross-component integration (navbar, panels, modals)

---

## Recommended Usage

### During Development (test.sh)
```bash
./scripts/test.sh
```
- Run on every code change
- Fast feedback (20 seconds)
- Catches logic bugs early
- No setup required

### Before Deployment (test-integration.sh)
```bash
./scripts/test-integration.sh
```
- Run before merging PRs
- Comprehensive validation (3 minutes)
- Catches integration issues
- Verifies full system works

### CI/CD Pipeline Strategy
```yaml
# On every push to feature branches
- run: ./scripts/test.sh

# On push to main branch or PR merge
- run: ./scripts/test-integration.sh
```

---

## Test Coverage Metrics

### Total Test Count
- **Unit Tests**: 197 tests
- **E2E Tests**: 1 comprehensive test (8 workflow steps)
- **Total**: 198 tests

### Coverage Areas
- ✅ Schema validation
- ✅ API endpoints
- ✅ Business logic
- ✅ UI components
- ✅ State management
- ✅ User workflows
- ✅ Version management
- ✅ Data persistence
- ✅ Error handling
- ✅ Type safety

### Quality Gates
All tests must pass before:
- Merging pull requests
- Deploying to production
- Creating new releases

---

## Running Tests

### Quick Test (Unit + Integration)
```bash
cd /workspaces/rule-builder
./scripts/test.sh
```

### Full E2E Test
```bash
cd /workspaces/rule-builder
./scripts/test-integration.sh
```

### Individual Test Suites

**Backend only:**
```bash
cd backend
mvn test
```

**Frontend only:**
```bash
cd frontend
npm test
```

**Specific Playwright test:**
```bash
cd frontend
npx playwright test e2e/rule-versioning.spec.js
```

**Playwright headed mode (watch test execute):**
```bash
cd frontend
npx playwright test e2e/rule-versioning.spec.js --headed
```

---

## Maintenance Notes

### When to Update Tests

1. **Add unit tests** when:
   - Adding new validation rules
   - Creating new components
   - Adding new API endpoints
   - Changing business logic

2. **Add E2E tests** when:
   - Adding major new features
   - Changing critical user workflows
   - Modifying version management
   - Adding new CRUD operations

### Test Naming Conventions
- Backend: `*Test.java` (JUnit)
- Frontend Unit: `*.test.js` or `*.test.jsx` (Vitest)
- Frontend E2E: `*.spec.js` (Playwright)

### Test Data Location
- Sample rules: `/backend/src/test/resources/sample-rules/`
- Frontend fixtures: `/frontend/src/tests/fixtures/`
- Test schemas: `/backend/src/main/resources/schemas/`
