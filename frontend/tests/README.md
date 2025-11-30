# Test Organization

This document explains the test structure for the Rule Builder frontend.

## Structure Overview

```
frontend/
├── src/components/
│   ├── RuleBuilder/
│   │   ├── RuleBuilder.jsx
│   │   ├── RuleBuilder.test.js        # Co-located component unit tests
│   │   └── hooks/
│   │       ├── useExpansionState.js
│   │       └── useExpansionState.test.js
│   └── RuleHistory/
│       ├── useRuleHistory.js
│       └── useRuleHistory.test.js
│
├── tests/
│   ├── integration/                    # Vitest integration tests
│   │   ├── condition-naming.test.js
│   │   ├── condition-naming-scenarios.test.jsx
│   │   ├── condition-operator.test.jsx
│   │   ├── json-roundtrip.test.js
│   │   ├── roundtrip-integration.test.jsx
│   │   ├── ui-creation.test.jsx
│   │   └── ui-interaction.test.jsx
│   ├── fixtures/                       # Shared test data
│   │   ├── case-expression.json
│   │   ├── math-expression.json
│   │   └── simple-condition.json
│   ├── helpers/                        # Shared test utilities
│   │   └── expansionHelpers.js
│   ├── setup.js                        # Vitest global setup
│   ├── bug-reporter.js                 # Test utilities
│   ├── README-INTEGRATION.md
│   └── README-TESTING.md
│
├── e2e/                                 # Playwright E2E tests
│   ├── condition-naming-scenarios-sequential.spec.js
│   ├── condition-naming-scenarios.spec.js
│   ├── rule-versioning.spec.js
│   └── test-basic.spec.js
│
└── manual-tests/                        # Manual HTML test files
    ├── bug-report.html
    ├── jsoneditor-placeholder-uuid-demo.html
    ├── rulebuilder-migration-test.html
    ├── service-integration-test.html
    ├── test-condition-restructure.html
    ├── test-json-output.html
    └── three-way-selector-demo.html
```

## Test Types

### 1. Component Unit Tests (Co-located)
**Location**: `src/components/**/*.test.js`  
**Framework**: Vitest + React Testing Library  
**Purpose**: Test individual components and hooks in isolation

**Examples**:
- `src/components/RuleBuilder/useRuleBuilder.test.js`
- `src/components/RuleBuilder/hooks/useExpansionState.test.js`
- `src/components/RuleHistory/useRuleHistory.test.js`

**Run**: `npx vitest run`

### 2. Integration Tests
**Location**: `tests/integration/*.test.js|jsx`  
**Framework**: Vitest + React Testing Library  
**Purpose**: Test component interactions, data flow, and complex scenarios

**Key Tests**:
- `condition-naming.test.js` - Condition naming utility functions
- `condition-naming-scenarios.test.jsx` - Simple naming smoke tests
- `json-roundtrip.test.js` - JSON parsing/serialization integrity
- `roundtrip-integration.test.jsx` - Full UI→JSON→UI round-trip tests
- `ui-creation.test.jsx` - UI-based rule construction tests
- `ui-interaction.test.jsx` - Component interaction tests

**Run**: `npx vitest run`

### 3. End-to-End Tests
**Location**: `e2e/*.spec.js`  
**Framework**: Playwright  
**Purpose**: Test complete user workflows with real browser automation

**Key Tests**:
- `condition-naming-scenarios-sequential.spec.js` - 4 independent naming scenarios
- `rule-versioning.spec.js` - Complete versioning workflow
- `test-basic.spec.js` - Basic application smoke tests

**Run**: `npx playwright test`

**Note**: E2E tests require the frontend dev server running on `http://localhost:3004`

### 4. Manual Test Files
**Location**: `manual-tests/*.html`  
**Purpose**: Interactive debugging and visual testing during development

**Examples**:
- `bug-report.html` - Bug reporting interface
- `jsoneditor-placeholder-uuid-demo.html` - JSONEditor UUID enhancement demo
- `rulebuilder-migration-test.html` - Migration testing
- `service-integration-test.html` - Service layer testing

**Run**: Open files directly in browser or use `npm run dev`

## Shared Resources

### Fixtures (`tests/fixtures/`)
Shared JSON test data used across multiple test files:
- `case-expression.json` - Sample case expression structure
- `math-expression.json` - Complex math expression example
- `simple-condition.json` - Basic condition structure

### Helpers (`tests/helpers/`)
Reusable test utilities:
- `expansionHelpers.js` - Expansion state test helpers

### Setup (`tests/setup.js`)
Global Vitest configuration and mocks

## Running Tests

### All Unit + Integration Tests (Vitest)
```bash
npx vitest run
```

### Watch Mode (for development)
```bash
npx vitest
```

### E2E Tests (Playwright)
```bash
# Start dev server first
npm run dev

# In another terminal
npx playwright test

# Run specific test
npx playwright test condition-naming-scenarios-sequential

# Show browser (headed mode)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

### Run All Tests
```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Run all tests
npx vitest run && npx playwright test
```

## Test Coverage

Current coverage (102 tests):
- ✅ Component unit tests: 32 tests
- ✅ Integration tests: 70 tests  
- ✅ E2E tests: 8 scenarios (4 independent test files)

### What's Tested

**Unit Tests**:
- Hook behavior (expansion state, rule builder state, rule history)
- Component rendering and interactions

**Integration Tests**:
- Condition naming logic (35 tests)
- JSON round-trip integrity (5 tests)
- Operator selection and validation (8 tests)
- UI component interactions (6 tests)
- UI creation workflows (6 tests)
- Full round-trip scenarios (8 tests)
- Smoke tests (2 tests)

**E2E Tests**:
- Complete naming workflows (4 scenarios)
- Rule versioning lifecycle
- Basic application functionality

## Best Practices

### Component Unit Tests
- Co-locate test files with components (`Component.test.js` next to `Component.js`)
- Test component behavior, not implementation details
- Mock external dependencies

### Integration Tests
- Place in `tests/integration/`
- Use shared fixtures from `tests/fixtures/`
- Test realistic user scenarios
- Focus on component interactions

### E2E Tests
- Place in `e2e/`
- Test complete user workflows
- Minimize test brittleness (use test-ids, not text selectors)
- Keep tests independent (each test creates its own data)

### Manual Tests
- Place in `manual-tests/`
- Use for visual debugging and exploratory testing
- Document purpose in comments within HTML files

## Migration Notes

This structure was reorganized on 2025-11-30 from:
- Old: `src/tests/` → New: `tests/integration/`
- Old: `src/components/**/__tests__/` → New: Co-located `.test.js` files
- Old: `tests/e2e/` (empty) → Deleted
- Old: `*.html` at root → New: `manual-tests/*.html`

All import paths were updated automatically.
