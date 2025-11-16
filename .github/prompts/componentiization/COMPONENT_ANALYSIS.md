# Component Analysis - Rule Builder Application

**Date:** November 12, 2025  
**Components Analyzed:** RuleSearch, RuleBuilder, JsonEditor

---

## 1. RuleSearch Component

### 1.1 Inputs Required to Initialize/Update

**Props:**
- `onRuleSelect` (function, required) - Callback when a rule is selected
- `onNewRule` (function, required) - Callback when "New Rule" button is clicked
- `darkMode` (boolean, optional, default: false) - Dark mode styling flag
- `onCollapse` (function, optional, default: null) - Callback for collapse button

**Internal State:**
- `ruleList` - Array of available rules (populated from API)
- `selectedRuleKey` - Currently selected rule identifier
- `loading` - Loading state for API calls

**No external data props required** - component self-initializes on mount

### 1.2 Events That Impact External Components

**Callbacks Triggered:**

1. **`onRuleSelect(ruleData, uuid)`**
   - Triggered when: User selects a rule from dropdown
   - Parameters:
     - `ruleData`: Full rule object from API
     - `uuid`: Rule UUID string
   - Impact: Parent component receives rule data to load into RuleBuilder

2. **`onNewRule()`**
   - Triggered when: User clicks "New Rule" button
   - Parameters: None
   - Impact: Parent should clear/reset RuleBuilder and create new blank rule

3. **`onCollapse()`**
   - Triggered when: User clicks collapse icon in header
   - Parameters: None
   - Impact: Parent should collapse/hide the search panel

**Internal Events:**
- Selection changes update local state
- Refresh button reloads rule list

### 1.3 API Calls

**GET `/api/rules/ids`**
- **When:** Component mount and when refresh button clicked
- **Input:** None
- **Output:** Array of rule metadata objects
  ```json
  [
    {
      "ruleId": "string",
      "uuid": "string",
      "latestVersion": number,
      "folderPath": "string" (optional)
    }
  ]
  ```
- **Purpose:** Populate searchable dropdown with available rules

**GET `/api/rules/{ruleId}/{uuid}/{version}`**
- **When:** User selects a rule from dropdown
- **Input:** URL parameters (ruleId, uuid, version extracted from selection)
- **Output:** Complete rule object
  ```json
  {
    "structure": "case|condition|expression",
    "returnType": "boolean|number|text|date",
    "ruleType": "string",
    "uuId": "string",
    "version": number,
    "metadata": {
      "id": "string",
      "description": "string"
    },
    "definition": { /* rule-specific content */ }
  }
  ```
- **Purpose:** Load full rule data for editing

### 1.4 Packageability Assessment

**Dependencies:**
- `react` - Standard dependency
- `antd` (Ant Design) - UI library dependency
  - Components used: Card, Button, Select, Space, message
  - Icons: PlusOutlined, SearchOutlined, MenuFoldOutlined
- `axios` - HTTP client

**Blocking Issues for Standalone Package:**

❌ **Hard-coded API endpoints**
- `/api/rules/ids` and `/api/rules/{ruleId}/{uuid}/{version}` are hard-coded
- **Solution:** Accept `apiConfig` prop with endpoint URLs
  ```javascript
  apiConfig: {
    getRulesEndpoint: string,
    getRuleDetailsEndpoint: (ruleId, uuid, version) => string
  }
  ```

❌ **Ant Design dependency**
- Requires consumer to install and configure `antd`
- **Solution:** Document peer dependency requirement

✅ **No internal dependencies on other app components**

✅ **Clean prop interface**

**Packageability Score: 7/10**
- Requires API endpoint configuration to be truly portable
- Otherwise well-isolated and reusable

---

## 2. RuleBuilder Component

### 2.1 Inputs Required to Initialize/Update

**Props:**
- `config` (object, required) - Configuration object with:
  ```javascript
  {
    operators: { /* operator definitions */ },
    fields: { /* available field definitions */ },
    funcs: { /* available function definitions */ },
    types: { /* type definitions */ }
  }
  ```
- `darkMode` (boolean, optional, default: false) - Dark mode styling
- `onRuleChange` (function, optional) - Callback when rule data changes
- `selectedRuleUuid` (string, optional) - UUID of currently loaded rule

**Exposed Methods (via forwardRef):**
- `getRuleOutput()` - Returns complete rule JSON with UI state removed
- `loadRuleData(data)` - Loads rule from JSON object
- `newRule(data)` - Creates new blank rule with optional defaults

**Internal State:**
- `ruleData` - Complete rule structure
- `availableVersions` - Array of versions for current rule
- `loadingVersions` - Loading state
- `ruleTypes` - Array of available rule types
- `isLoadedRule` - Flag indicating if rule was loaded vs created new

### 2.2 Events That Impact External Components

**Callbacks Triggered:**

1. **`onRuleChange(ruleData)`**
   - Triggered when: Any change to rule data (metadata, content, structure)
   - Parameters: Complete ruleData object
   - Impact: Parent receives updated rule state continuously
   - Frequency: High - every user interaction

**Side Effects:**
- Saves rule to API when "Save Rule" button clicked
- Loads version data when `selectedRuleUuid` prop changes
- Generates success/error messages via `antd.message`

### 2.3 API Calls

**GET `/api/ruleTypes`**
- **When:** Component mount
- **Input:** None
- **Output:** Array of strings (rule type names)
  ```json
  ["Reporting", "Validation", "Calculation", "Business"]
  ```
- **Purpose:** Populate Rule Type dropdown
- **Fallback:** Uses default array if API fails

**GET `/api/rules/versions/{uuid}`**
- **When:** `selectedRuleUuid` prop changes
- **Input:** UUID in URL parameter
- **Output:** Array of version numbers
  ```json
  [1, 2, 3, 4]
  ```
- **Purpose:** Populate version dropdown for rule history

**GET `/api/rules/{ruleId}/{uuid}/{version}`**
- **When:** User changes version in dropdown
- **Input:** URL parameters
- **Output:** Complete rule object (same as RuleSearch output)
- **Purpose:** Load specific version of rule

**POST `/api/rules/{ruleId}/{version}`**
- **When:** User clicks "Save Rule" button
- **Input:** 
  - URL parameters: ruleId, version (incremented)
  - Body: Complete rule object (cleaned of UI state)
- **Output:** Success/error response
- **Purpose:** Persist rule changes

### 2.4 Packageability Assessment

**Dependencies:**
- `react` - Standard
- `antd` - Card, Space, Input, Select, Typography, Button, message
- `axios` - HTTP client
- **Internal component dependencies:**
  - `Case` component
  - `ConditionGroup` component
  - `ExpressionGroup` component
  - All their nested dependencies

❌ **Multiple hard-coded API endpoints**
- `/api/ruleTypes`, `/api/rules/versions/{uuid}`, `/api/rules/{ruleId}/{uuid}/{version}`, `/api/rules/{ruleId}/{version}`
- **Solution:** Accept comprehensive `apiConfig` prop

❌ **Tightly coupled to child components**
- `Case`, `ConditionGroup`, `ExpressionGroup` must be included in package
- These components have their own dependencies (Condition, ExpressionGroup, BaseExpression, etc.)
- **Solution:** Package as a component suite, not standalone

❌ **Complex config object structure**
- `config` prop structure is implicit and not validated
- **Solution:** Add PropTypes or TypeScript types, document structure

⚠️ **UUID generation logic**
- Uses simple random UUID generator
- May conflict with backend expectations
- **Solution:** Accept optional `generateUuid` prop for custom implementation

✅ **Good separation via forwardRef**
- Clean imperative API via ref methods

✅ **No direct DOM manipulation**

**Packageability Score: 4/10**
- Core of the application with many dependencies
- Would require packaging entire rule-building component tree
- API configuration needs major refactoring
- Best suited as "feature module" rather than standalone component

---

## 3. JsonEditor Component

### 3.1 Inputs Required to Initialize/Update

**Props:**
- `data` (object, required) - JSON object to display/edit
- `onChange` (function, optional) - Callback when JSON is successfully updated
- `darkMode` (boolean, optional, default: false) - Dark mode styling
- `title` (string, optional, default: "JSON Output") - Card title
- `onCollapse` (function, optional, default: null) - Collapse button callback

**Internal State:**
- `jsonText` - Current text in textarea (editing state)
- `displayText` - Saved/validated text (display state)
- `isEditing` - Edit mode flag
- `isValid` - JSON syntax validation flag
- `isValidating` - API validation in progress flag
- `validationErrors` - Array of schema validation errors
- `schemaInfo` - Information about validation schema

### 3.2 Events That Impact External Components

**Callbacks Triggered:**

1. **`onChange(parsedData)`**
   - Triggered when: User clicks "Update" and JSON is valid
   - Parameters: Parsed JavaScript object from JSON text
   - Impact: Parent receives updated data object
   - Validation: Only called after successful JSON parse AND schema validation

2. **`onCollapse()`**
   - Triggered when: User clicks collapse icon in header
   - Parameters: None
   - Impact: Parent should collapse/hide the JSON panel

**Side Effects:**
- Displays validation messages via `antd.message`
- Updates automatically when `data` prop changes (only when not editing)

### 3.3 API Calls

**POST `/api/rules/validate`**
- **When:** User clicks "Update" button after editing
- **Input:** Parsed JSON object in request body
  ```json
  {
    "structure": "case|condition|expression",
    /* ... complete rule object ... */
  }
  ```
- **Output:** Validation result object
  ```json
  {
    "valid": boolean,
    "errors": [
      {
        "path": "string",
        "message": "string"
      }
    ],
    "schema": {
      "filename": "string",
      "title": "string",
      "id": "string",
      "draft": "string"
    }
  }
  ```
- **Purpose:** Validate rule against JSON Schema before accepting changes

### 3.4 Packageability Assessment

**Dependencies:**
- `react` - Standard
- `antd` - Card, Button, Space, message, Input, Alert
- `axios` - HTTP client

❌ **Hard-coded validation endpoint**
- `/api/rules/validate` is hard-coded
- **Solution:** Accept `validationEndpoint` or `apiConfig` prop
- Could also accept optional `onValidate` callback for custom validation

⚠️ **Validation is tightly coupled to rule schema**
- Expects specific validation response format
- **Solution:** Make validation optional or accept custom validator function
  ```javascript
  onValidate: async (data) => ({ 
    valid: boolean, 
    errors: array 
  })
  ```

✅ **Relatively self-contained**
- No internal component dependencies

✅ **Generic JSON editing capability**
- Could work with any JSON structure

✅ **Clean prop interface**

**Packageability Score: 8/10**
- Most portable of the three components
- Main blocker is hard-coded validation endpoint
- With minor refactoring (configurable validation), could be a standalone package
- Could be useful as general-purpose JSON editor with validation

---

## Summary Matrix

| Component | Complexity | External Deps | API Calls | Packageability | Recommended Approach |
|-----------|-----------|---------------|-----------|----------------|---------------------|
| **RuleSearch** | Low | 2 APIs | 2 GET | 7/10 | Standalone package with config |
| **RuleBuilder** | Very High | 4 APIs + many components | 3 GET, 1 POST | 4/10 | Feature module / component suite |
| **JsonEditor** | Low-Medium | 1 API | 1 POST | 8/10 | Standalone package (easiest) |

## Recommendations for Packaging

### Phase 1: Quick Wins (JsonEditor)
1. Extract JsonEditor as standalone package
2. Add `validationConfig` prop:
   ```javascript
   {
     endpoint?: string,
     onValidate?: (data) => Promise<ValidationResult>,
     enabled?: boolean
   }
   ```
3. Make validation optional
4. Publish as `@yourorg/json-editor-with-validation`

### Phase 2: RuleSearch
1. Add `apiConfig` prop for endpoints
2. Make component work with any API that matches interface
3. Document required response formats
4. Publish as `@yourorg/rule-search`

### Phase 3: RuleBuilder Suite
1. Package entire component tree together:
   - RuleBuilder (main)
   - Case, ConditionGroup, ExpressionGroup
   - Condition, BaseExpression
   - All utilities
2. Add comprehensive `apiConfig` for all endpoints
3. Add TypeScript definitions for `config` object structure
4. Publish as `@yourorg/rule-builder` (monolithic package)

### Alternative: Monorepo Approach
Create workspace with three packages:
- `@yourorg/json-editor`
- `@yourorg/rule-search`
- `@yourorg/rule-builder` (depends on above)

## Critical Refactoring Needed

### All Components
- [ ] Replace hard-coded API endpoints with configuration
- [ ] Add PropTypes or TypeScript definitions
- [ ] Remove Ant Design message globals (use callback props instead)
- [ ] Add comprehensive documentation
- [ ] Add Storybook stories for testing
- [ ] Add unit tests

### RuleBuilder Specific
- [ ] Document `config` object structure
- [ ] Extract API layer to separate module
- [ ] Make child components independently packageable
- [ ] Add error boundaries
- [ ] Support custom UUID generator

### JsonEditor Specific
- [ ] Make validation optional/configurable
- [ ] Support custom validation functions
- [ ] Consider removing Ant Design dependency (or make pluggable)

## API Interface Contracts

All components expect REST APIs with these characteristics:
- JSON request/response format
- Standard HTTP status codes
- CORS enabled (for browser usage)
- Consistent error response format

Missing from current implementation:
- API versioning strategy
- Authentication/authorization handling
- Rate limiting considerations
- Retry logic for failed requests
- Offline/cached data support

---

**End of Analysis**
