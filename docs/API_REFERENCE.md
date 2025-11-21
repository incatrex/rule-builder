# Rule Builder API Reference

**Version:** v1  
**Base URL:** `/api/v1`  
**Date:** November 21, 2025

---

## Current API Architecture

| REST Endpoint | HTTP Method | Backend Controller | Backend Service | Frontend Service | Frontend Component(s) |
|--------------|-------------|-------------------|-----------------|------------------|----------------------|
| `/fields` | GET | `RuleBuilderController.getFields()` | `RuleBuilderService.getFields()` | `FieldService.getFields()` | `App.jsx` |
| `/rules/ui/config` | GET | `RuleBuilderController.getConfig()` | `SchemaConfigService.getConfig()` | `ConfigService.getConfig()` | `App.jsx`, `useRuleBuilder.js` |
| `/rules` | GET | `RuleBuilderController.getRules()` | `RuleBuilderService.getRules()` | `RuleService.getRules()`<br>`RuleService.getRuleIds()` | `App.jsx`, `RuleSearch.jsx`, `RuleSelector.jsx`, `ServiceExampleComponent.jsx` |
| `/rules` | POST | `RuleBuilderController.createRule()` | `RuleBuilderService.saveRule()` | `RuleService.createRule()` | `useRuleBuilder.js`, `ServiceExampleComponent.jsx` |
| `/rules/{uuid}` | PUT | `RuleBuilderController.updateRule()` | `RuleBuilderService.saveRule()` | `RuleService.updateRule()` | `useRuleBuilder.js`, `ServiceExampleComponent.jsx` |
| `/rules/{uuid}/versions/{version}` | GET | `RuleBuilderController.getRuleVersion()` | `RuleBuilderService.getRule()`<br>`RuleBuilderService.getRuleVersions()` | `RuleService.getRuleVersion()`<br>`RuleService.getRule()` | `App.jsx`, `RuleSearch.jsx`, `RuleSelector.jsx`, `useRuleBuilder.js` |
| `/rules/{uuid}/versions` | GET | `RuleBuilderController.getRuleVersions()` | `RuleBuilderService.getRuleVersions()` | `RuleService.getRuleVersions()` | `App.jsx`, `RuleHistory/Examples.jsx` |
| `/rules/{uuid}/restore/{version}` | POST | `RuleBuilderController.restoreRuleVersion()` | `RuleBuilderService.restoreRuleVersion()` | `RuleService.restoreRuleVersion()` | `App.jsx`, `RuleHistory/Examples.jsx` |
| `/rules/validate` | POST | `RuleBuilderController.validateRule()` | `RuleBuilderService.validateRule()` | `RuleService.validateRule()` | `JsonEditor.jsx` |
| `/rules/to-sql` | POST | `RuleBuilderController.convertRuleToSql()` | `OracleSqlGenerator.generateSql()` | `RuleService.convertToSql()` | `SqlViewer.jsx`, `ServiceExampleComponent.jsx` |

---

## Detailed Endpoint Specifications

### 1. GET `/fields`
**Purpose:** Retrieve available fields for rule building with pagination and search

**Parameters:**
- `page` (int, optional, default=0) - Page number (0-based)
- `size` (int, optional, default=20) - Page size
- `search` (string, optional) - Search filter for field label or value

**Response:**
```json
{
  "content": [
    { "label": "TABLE1.FIELD_01", "value": "TABLE1.FIELD_01", "type": "text" }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

**Backend Flow:**
1. Controller → RuleBuilderService.getFields()
2. Reads from `static/fields.json`
3. Controller applies pagination and filtering

**Frontend Usage:**
```javascript
const response = await fieldService.getFields({ page: 0, size: 20, search: 'TEXT' });
```

---

### 2. GET `/rules/ui/config`
**Purpose:** Get UI configuration generated from schema extensions

**Parameters:** None

**Response:**
```json
{
  "ruleTypes": ["Reporting", "Transformation", "Aggregation", "Validation"],
  "operators": { ... },
  "expressionOperators": { ... },
  "functions": { ... },
  "widgets": { ... },
  "types": { ... }
}
```

**Backend Flow:**
1. Controller → SchemaConfigService.getConfig()
2. Extracts configuration from `rule-schema-current.json` x-ui-* extensions
3. Returns compiled config object

**Frontend Usage:**
```javascript
const config = await configService.getConfig();
```

---

### 3. GET `/rules`
**Purpose:** Get all rules with metadata, pagination, and filtering

**Parameters:**
- `page` (int, optional, default=0) - Page number (0-based)
- `size` (int, optional, default=20) - Page size
- `search` (string, optional) - Search filter for ruleId
- `ruleType` (string, optional) - Filter by rule type

**Response:**
```json
{
  "content": [
    {
      "ruleId": "EXPRESSION_0557",
      "uuid": "c7f02eba-eb50-4933-a692-fe27f4eb8e7f",
      "latestVersion": 5,
      "folderPath": "",
      "returnType": "boolean",
      "ruleType": "Reporting"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 30,
  "totalPages": 2,
  "first": true,
  "last": false
}
```

**Backend Flow:**
1. Controller → RuleBuilderService.getRules(ruleType)
2. Scans `static/rules/` directory recursively
3. Controller applies pagination and search filtering

**Frontend Usage:**
```javascript
// Paginated
const response = await ruleService.getRules({ page: 0, size: 20, search: 'EXPR', ruleType: 'Reporting' });

// Get all (backward compatible)
const allRules = await ruleService.getRuleIds('Reporting');
```

---

### 4. POST `/rules`
**Purpose:** Create a new rule (server generates UUID, sets version=1)

**Request Body:**
```json
{
  "name": "My Rule",
  "ruleId": "MY_RULE_01",
  "returnType": "boolean",
  "ruleType": "Reporting",
  "definition": { ... }
}
```

**Response:**
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "version": 1,
  "ruleId": "MY_RULE_01",
  "rule": { ... },
  "message": "Rule created successfully",
  "createdAt": "2025-11-21T10:00:00Z"
}
```

**Backend Flow:**
1. Controller generates UUID
2. Sets version=1
3. Extracts ruleId from JSON (or generates from name/uuid)
4. Controller → RuleBuilderService.saveRule(ruleId, "1", rule)
5. Saves to `static/rules/{ruleId}[{uuid}][1].json`

**Frontend Usage:**
```javascript
const result = await ruleService.createRule(ruleData);
```

---

### 5. PUT `/rules/{uuid}`
**Purpose:** Update existing rule (auto-increments version)

**Request Body:**
```json
{
  "name": "My Updated Rule",
  "ruleId": "MY_RULE_01",
  "returnType": "boolean",
  "ruleType": "Reporting",
  "definition": { ... }
}
```

**Response:**
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "version": 2,
  "ruleId": "MY_RULE_01",
  "rule": { ... },
  "message": "Rule updated successfully",
  "updatedAt": "2025-11-21T10:05:00Z"
}
```

**Backend Flow:**
1. Controller → RuleBuilderService.getRuleVersions(uuid) to find max version
2. Increments version
3. Controller → RuleBuilderService.saveRule(ruleId, newVersion, rule)
4. Saves to `static/rules/{ruleId}[{uuid}][{newVersion}].json`

**Frontend Usage:**
```javascript
const result = await ruleService.updateRule(uuid, updatedRuleData);
```

---

### 6. GET `/rules/{uuid}/versions/{version}`
**Purpose:** Get specific rule version (or 'latest')

**Parameters:**
- `uuid` (path) - Rule UUID
- `version` (path) - Version number or 'latest' keyword

**Response:**
```json
{
  "uuId": "550e8400-e29b-41d4-a716-446655440000",
  "version": 2,
  "ruleId": "MY_RULE_01",
  "name": "My Rule",
  "returnType": "boolean",
  "ruleType": "Reporting",
  "definition": { ... }
}
```

**Backend Flow:**
1. If version='latest': Controller → RuleBuilderService.getRuleVersions(uuid), get max version
2. Controller → RuleBuilderService.getRule(ruleId, uuid, version)
3. Reads from `static/rules/{ruleId}[{uuid}][{version}].json`

**Frontend Usage:**
```javascript
const rule = await ruleService.getRule(uuid); // Gets latest
const specificVersion = await ruleService.getRuleVersion(uuid, 2);
```

---

### 7. GET `/rules/{uuid}/versions`
**Purpose:** Get all versions with metadata for a rule

**Parameters:**
- `uuid` (path) - Rule UUID

**Response:**
```json
[
  {
    "ruleId": "MY_RULE_01",
    "version": 2,
    "modifiedBy": "Lastname, Firstname",
    "modifiedOn": 1700000000000,
    "filePath": "/path/to/rule",
    "ruleSet": "Production"
  },
  {
    "ruleId": "MY_RULE_01",
    "version": 1,
    "modifiedBy": "Lastname, Firstname",
    "modifiedOn": 1699000000000,
    "filePath": "/path/to/rule"
  }
]
```

**Backend Flow:**
1. Controller → RuleBuilderService.getRuleVersions(uuid)
2. Scans directory for files matching pattern `*[{uuid}][*].json`
3. Returns sorted list (newest first)

**Frontend Usage:**
```javascript
const versions = await ruleService.getRuleVersions(uuid);
```

---

### 8. POST `/rules/{uuid}/restore/{version}`
**Purpose:** Restore a previous version (creates new version with old content)

**Parameters:**
- `uuid` (path) - Rule UUID
- `version` (path) - Version number to restore

**Response:**
```text
Rule version restored successfully
```

**Backend Flow:**
1. Controller → RuleBuilderService.restoreRuleVersion(uuid, version)
2. Reads version N content
3. Creates new version M (max+1) with version N content
4. Adds `metadata.restoredFromVersion: N`

**Frontend Usage:**
```javascript
await ruleService.restoreRuleVersion(uuid, 1);
```

---

### 9. POST `/rules/validate`
**Purpose:** Validate rule against JSON schema

**Request Body:**
```json
{
  "name": "Test Rule",
  "returnType": "boolean",
  "ruleType": "Reporting",
  "definition": { ... }
}
```

**Response:**
```json
{
  "valid": true,
  "schema": {
    "filename": "rule-schema-current.json",
    "id": "https://example.com/rule-schema",
    "title": "Rule Schema",
    "draft": "http://json-schema.org/draft-07/schema#"
  },
  "errors": []
}
```

**Backend Flow:**
1. Controller → RuleBuilderService.validateRule(rule)
2. Uses NetworkNT JSON Schema validator
3. Validates against `rule-schema-current.json`

**Frontend Usage:**
```javascript
const result = await ruleService.validateRule(ruleData);
```

---

### 10. POST `/rules/to-sql`
**Purpose:** Convert rule definition to Oracle SQL

**Request Body:**
```json
{
  "structure": "condition",
  "returnType": "boolean",
  "definition": { ... }
}
```

**Response:**
```json
{
  "sql": "SELECT CASE WHEN (age > 18) THEN 1 ELSE 0 END FROM dual",
  "errors": []
}
```

**Backend Flow:**
1. Controller → OracleSqlGenerator.generateSql(rule)
2. Parses rule structure
3. Generates Oracle-compatible SQL

**Frontend Usage:**
```javascript
const result = await ruleService.convertToSql(ruleData);
```

---

## Architectural Recommendations

### Table 1: Issues & Improvements

| Issue | Current State | Recommendation | Priority | Impact |
|-------|--------------|----------------|----------|--------|
| ~~**Service Naming**~~ | ~~`getRuleIds()` returns full metadata~~ | ✅ **DONE:** Renamed to `getRules()` | ~~Medium~~ | ✅ Improved clarity |
| ~~**Deprecated Methods**~~ | ~~`getRuleByVersion()` marked deprecated but still used~~ | ✅ **DONE:** Removed after migrating all usages | ~~Low~~ | ✅ Code cleanup |
| **Controller Responsibilities** | Pagination logic in controller | Move to service layer for reusability | Medium | Better separation of concerns |
| **Search Implementation** | Search done in controller after fetching all | Implement database/index search for better performance | High | Performance at scale |
| **Static File Storage** | Rules stored as JSON files in filesystem | Consider database (PostgreSQL + JSONB) for production | High | Scalability, concurrency, search |
| **Version History** | Relies on file scanning | Add database table for version metadata | High | Performance, queries |
| **Backward Compatibility** | Multiple frontend methods call same endpoint | Consolidate to single method per operation | Medium | Maintainability |
| **Error Handling** | Generic 500 errors | Return structured error responses with codes | Medium | Client error handling |
| **Response Consistency** | Some endpoints return primitives, others objects | Standardize all responses as objects | Low | API consistency |
| **SQL Generator Location** | Directly in controller/util | Consider separate microservice for complex SQL | Low | Separation of concerns |

---

### Table 2: Restructuring Recommendations

| Component | Current Structure | Recommended Structure | Rationale |
|-----------|------------------|----------------------|-----------|
| **Backend Services** | Single `RuleBuilderService` handles everything | Split into:<br>- `RuleService` (CRUD)<br>- `RuleVersionService` (versioning)<br>- `RuleSearchService` (search/filter)<br>- `FieldService`<br>- `ConfigService` | Single Responsibility Principle |
| **Frontend Services** | Separate service files with overlapping methods | Keep separate but remove deprecated methods:<br>- `RuleService` (main operations)<br>- `FieldService` (fields only)<br>- `ConfigService` (config only) | Clear boundaries |
| **Storage Layer** | Direct file I/O in service | Add repository pattern:<br>- `RuleRepository` (interface)<br>- `FileRuleRepository` (current impl)<br>- `DatabaseRuleRepository` (future) | Abstraction, testability |
| **API Versioning** | Single `/api/v1` | Add version-specific controllers:<br>- `/api/v1/*` → `RuleBuilderControllerV1`<br>- `/api/v2/*` → `RuleBuilderControllerV2` (future) | API evolution |
| **Validation** | Mixed in controller/service | Centralize:<br>- `RuleValidationService`<br>- Custom validators<br>- Schema-based validation | Consistency |
| **Configuration** | Schema-driven x-ui extensions | Add database config table with admin UI for runtime changes | Flexibility |
| **Frontend Components** | Direct service calls throughout | Add state management layer (Redux/Zustand):<br>- Centralized API state<br>- Caching<br>- Optimistic updates | Better UX, fewer API calls |
| **Testing** | Unit tests only | Add:<br>- Integration tests<br>- Contract tests (Pact)<br>- E2E tests (Playwright) | Quality assurance |

---

## Migration Path (Recommended)

### Phase 1: Quick Wins (1-2 weeks)
1. ✅ **DONE:** Add pagination to `/fields` and `/rules`
2. ✅ **DONE:** Standardize API to `/api/v1`
3. ✅ **DONE:** Remove deprecated `getRuleByVersion()` from frontend
4. ✅ **DONE:** Rename `getRuleIds()` to `getRules()` in backend
5. Standardize error responses

### Phase 2: Service Refactoring (2-3 weeks)
1. Split `RuleBuilderService` into focused services
2. Add repository pattern for data access
3. Implement proper logging (SLF4J)
4. Add request/response DTOs

### Phase 3: Database Migration (3-4 weeks)
1. Design database schema
2. Implement `DatabaseRuleRepository`
3. Add migration scripts
4. Parallel run file + database
5. Cutover to database

### Phase 4: Advanced Features (4-6 weeks)
1. Add full-text search (Elasticsearch)
2. Implement caching (Redis)
3. Add async processing (queues)
4. Implement audit trail
5. Add admin dashboard

---

## Notes

- All endpoints return JSON
- Authentication/Authorization not yet implemented
- Current system handles ~30 rules well, but will need optimization for 1000+
- File-based storage is acceptable for MVP, but database recommended for production
- Consider GraphQL for complex queries if frontend requirements grow
