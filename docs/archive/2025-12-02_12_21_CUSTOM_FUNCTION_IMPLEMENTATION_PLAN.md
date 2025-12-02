# Custom Function Arguments & UI Implementation Plan

## Overview
Add support for:
1. **Dynamic argument options** - Backend-provided option lists for function arguments
2. **Custom UI components** - Modal-based custom interfaces for complex functions

## Architecture Changes

### 1. Schema Extensions

#### 1.1 Dynamic Argument Options

**Schema Definition** (stays clean - no service endpoints):
```json
{
  "DATE.DAYS_TO_PAYMENT": {
    "label": "Days to Payment",
    "returnType": "date",
    "args": [
      {
        "name": "payday",
        "type": "number",
        "widget": "select",
        "optionsRef": "daysOfMonth"  // NEW: reference name only
      },
      {
        "name": "date",
        "type": "date"
      }
    ]
  }
}
```

**Frontend Service Configuration** (separate from schema):
```javascript
// frontend/src/config/argumentOptionsConfig.js
export const ARGUMENT_OPTIONS_SERVICES = {
  daysOfMonth: '/api/config/argument-options/days-of-month',
  currencies: '/api/config/argument-options/currencies',
  paymentTerms: '/api/config/argument-options/payment-terms'
};
```

#### 1.2 Custom UI Functions
```json
{
  "CURRENCY.CONVERT": {
    "label": "Currency Conversion",
    "returnType": "number",
    "customUI": true,  // NEW: flag for custom UI
    "customUIComponent": "CurrencyConversion",  // NEW: component identifier
    "args": [
      {
        "name": "amount",
        "type": "number"
      },
      {
        "name": "fromCurrency",
        "type": "text"
      },
      {
        "name": "toCurrency",
        "type": "text"
      },
      {
        "name": "rate",
        "type": "number"
      }
    ]
  }
}
```

### 2. Backend Changes

#### 2.1 New API Endpoints for Argument Options
**Purpose**: Provide dynamic option lists for function arguments via separate endpoints

**Individual Endpoints** (recommended approach):
- `GET /api/config/argument-options/days-of-month` - Returns days 1-31
- `GET /api/config/argument-options/currencies` - Returns currency list
- `GET /api/config/argument-options/payment-terms` - Returns payment terms
- `GET /api/config/argument-options/{optionsRef}?q={search}` - Generic endpoint with optional search

**Response Format** (all endpoints):
```json
[
  { "value": 1, "label": "1st" },
  { "value": 2, "label": "2nd" },
  ...
]
```

**For paginated/searchable options** (large datasets):
```json
{
  "items": [
    { "value": "CUST001", "label": "Acme Corp" },
    { "value": "CUST002", "label": "Tech Industries" }
  ],
  "total": 10523,
  "page": 1,
  "pageSize": 50
}
```

**Implementation**:
- New controller: `ArgumentOptionsController.java`
#### 3.1 New Service: `ArgumentOptionsService.js`
```javascript
import { ARGUMENT_OPTIONS_SERVICES } from '../config/argumentOptionsConfig';

class ArgumentOptionsService {
  constructor() {
    this.endpointMap = ARGUMENT_OPTIONS_SERVICES;
    this.cache = {};
  }
  
  async getOptionsForRef(optionsRef, searchTerm = '') {
    const config = this.endpointMap[optionsRef];
    
    if (!config) {
      console.warn(`No service configured for optionsRef: ${optionsRef}`);
      return [];
    }
    
    // Simple case: string endpoint, cache all results
    if (typeof config === 'string') {
      if (this.cache[optionsRef]) {
        return this.cache[optionsRef];
      }
      
      const response = await fetch(config);
#### 3.2 New Configuration File: `argumentOptionsConfig.js`
**Location**: `frontend/src/config/argumentOptionsConfig.js`

```javascript
// Maps optionsRef names to backend service endpoints
// Separate from schema - pure frontend service configuration

export const ARGUMENT_OPTIONS_SERVICES = {
  // Small lists: Load all and cache (string endpoint)
  daysOfMonth: '/api/config/argument-options/days-of-month',
  currencies: '/api/config/argument-options/currencies',
  paymentTerms: '/api/config/argument-options/payment-terms',
  
  // Large lists: Paginated with search (object config)
  customers: {
    endpoint: '/api/config/argument-options/customers',
    paginated: true,
    searchParam: 'q'
  },
  suppliers: {
    endpoint: '/api/config/argument-options/suppliers',
    paginated: true,
    searchParam: 'search'
  }
};
```
  
  isPaginated(optionsRef) {
    const config = this.endpointMap[optionsRef];
    return typeof config === 'object' && config.paginated === true;
  }
}

export default new ArgumentOptionsService();
```javascript
class ArgumentOptionsService {
  async getArgumentOptions() {
    // Fetch all option lists from backend
    // Cache results
  }
  
  getOptionsForRef(optionsRef) {
    // Return cached options for specific reference
  }
}
```

#### 3.2 Enhanced Config Loading
**ConfigService.js** modifications:
```javascript
async loadConfig() {
  const [schema, argumentOptions] = await Promise.all([
    this.getSchema(),
    argumentOptionsService.getArgumentOptions()
  ]);
  
  return {
    ...schema,
    argumentOptions
  };
}
```

#### 3.3 Function Component Updates
**Function.jsx** - Add custom UI support:
```javascript
const Function = ({ value, onChange, config, customFunctions }) => {
  const funcDef = getFuncDef(value.function?.name);
  
  // NEW: Check if function has custom UI
  if (funcDef?.customUI) {
    const CustomComponent = customFunctions?.[funcDef.customUIComponent];
    
    if (CustomComponent) {
      return (
        <CustomFunctionModal
          funcDef={funcDef}
          value={value}
          onChange={onChange}
          component={CustomComponent}
        />
      );
    }
  }
  
  // Existing inline argument rendering...
};
```

#### 3.4 New Component: `CustomFunctionModal.jsx`
```javascript
const CustomFunctionModal = ({ funcDef, value, onChange, component: CustomComponent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(extractFormData(value));
  
  const handleSave = (data) => {
    // Convert custom form data back to function args structure
    const updatedValue = convertToFunctionArgs(data, funcDef);
    onChange(updatedValue);
    setIsOpen(false);
  };
  
  return (
    <>
      {/* Collapsed view showing function summary */}
      <Card onClick={() => setIsOpen(true)}>
        <Text>{getFunctionSummary(value.function)}</Text>
        <Button icon={<EditOutlined />}>Edit</Button>
      </Card>
      
      {/* Modal with custom component */}
      <Modal open={isOpen} onCancel={() => setIsOpen(false)}>
#### 3.5 FunctionArgument Component Updates
**FunctionArgument.jsx** - Support dynamic options with lazy loading:
```javascript
import { useState, useEffect } from 'react';
import argumentOptionsService from '../../services/ArgumentOptionsService';

const FunctionArgument = ({ arg, argDef, onChange }) => {
  const [dynamicOptions, setDynamicOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load dynamic options if optionsRef specified
  useEffect(() => {
    if (argDef.optionsRef) {
      setIsLoading(true);
      argumentOptionsService.getOptionsForRef(argDef.optionsRef)
        .then(options => {
          setDynamicOptions(options);
          setIsLoading(false);
        })
        .catch(err => {
          console.error(`Failed to load options for ${argDef.optionsRef}:`, err);
          setIsLoading(false);
        });
    }
  }, [argDef.optionsRef]);
  
  // Determine final options: dynamic, static, or none
  const options = argDef.optionsRef ? dynamicOptions : argDef.options;
  const isPaginated = argDef.optionsRef && 
    argumentOptionsService.isPaginated(argDef.optionsRef);
  
  // Pass options to Expression component
  return (
    <Expression
      value={arg.value}
      onChange={onChange}
      propArgDef={{ 
        ...argDef, 
        options,
        isPaginated,
        onSearch: isPaginated ? (searchTerm) => {
          argumentOptionsService.getOptionsForRef(argDef.optionsRef, searchTerm)
            .then(setDynamicOptions);
        } : undefined,
#### 2.1 Argument Options API Tests
**File**: `ArgumentOptionsControllerTest.java`

```java
@Test
void shouldReturnDaysOfMonthOptions() {
    // Test GET /api/config/argument-options/days-of-month
    // Verify response contains 31 items
}

@Test
void shouldReturnCurrencyOptions() {
    // Test GET /api/config/argument-options/currencies
    // Verify currency list structure
}

@Test
void shouldReturn404ForInvalidOptionsRef() {
    // Test GET /api/config/argument-options/invalid
    // Should return 404 or empty array
}

@Test
void shouldSupportSearchParameter() {
    // Test GET /api/config/argument-options/customers?q=acme
    // Verify filtered results
}

@Test
void shouldSupportPagination() {
    // Test GET /api/config/argument-options/customers?q=&page=1&pageSize=50
    // Verify pagination metadata
}
```uleBuilder.jsx** - Accept custom function mappings:
```javascript
const RuleBuilder = ({ 
  config,
  customFunctions = {},  // NEW: Map of custom UI components
  ...props 
}) => {
  return (
    <RuleBuilderUI
      {...props}
      config={enhancedConfig}
      customFunctions={customFunctions}
    />
  );
};
```

## Test-Driven Development Plan

### Phase 1: Backend Tests (Week 1)

#### 1.1 Argument Options API Tests
**File**: `ArgumentOptionsControllerTest.java`

```java
@Test
void shouldReturnAllArgumentOptions() {
    // Test GET /api/config/argument-options
    // Verify response contains expected option lists
}

@Test
void shouldReturnEmptyMapWhenNoOptionsConfigured() {
    // Test behavior when argument-options.json doesn't exist
}

@Test
void shouldHandleInvalidOptionsConfiguration() {
    // Test malformed JSON handling
}
```

#### 1.2 Schema Validation Tests
**File**: `XUISemanticValidatorTest.java`

```java
@Test
void shouldValidateOptionsRefExists() {
    // Test that optionsRef references valid backend list
}

@Test
void shouldRejectInvalidOptionsRef() {
    // Test error when optionsRef references non-existent list
}
#### 2.2 ArgumentOptionsService Tests
**File**: `src/services/ArgumentOptionsService.test.js`

```javascript
describe('ArgumentOptionsService', () => {
  test('should fetch and cache simple options', async () => {
    // Mock fetch for daysOfMonth
    // Verify caching on second call
  });
  
  test('should handle paginated options with search', async () => {
    // Mock fetch for customers with search param
    // Verify no caching for paginated results
  });
  
  test('should return empty array for unconfigured optionsRef', async () => {
    // Test getOptionsForRef with invalid ref
  });
  
  test('should detect paginated configuration', () => {
    // Test isPaginated method
  });
  
  test('should handle API errors gracefully', async () => {
    // Test network error handling
  });
});
```javascript
describe('ArgumentOptionsService', () => {
  test('should fetch and cache argument options', async () => {
    // Test API call and caching
  });
  
  test('should return options for specific reference', () => {
    // Test getOptionsForRef method
  });
  
  test('should handle API errors gracefully', async () => {
    // Test error handling
  });
});
```

#### 2.2 Function Component Tests
**File**: `src/components/RuleBuilder/Function.test.jsx`

```javascript
describe('Function - Custom UI', () => {
  test('should render custom function modal for customUI functions', () => {
    // Test modal rendering instead of inline args
  });
  
  test('should render inline args for non-custom functions', () => {
    // Test existing behavior preserved
  });
  
  test('should handle missing custom component gracefully', () => {
    // Test fallback when custom component not provided
  });
});
```

#### 2.3 CustomFunctionModal Tests
**File**: `src/components/RuleBuilder/CustomFunctionModal.test.jsx`

```javascript
describe('CustomFunctionModal', () => {
  test('should open modal when collapsed view clicked', () => {
    // Test modal opening
  });
  
  test('should convert form data to function args on save', () => {
    // Test data transformation
  });
  
  test('should display function summary in collapsed view', () => {
    // Test summary display
  });
});
```

#### 2.4 FunctionArgument Tests
**File**: `src/components/RuleBuilder/FunctionArgument.test.jsx`

```javascript
describe('FunctionArgument - Dynamic Options', () => {
  test('should load dynamic options from service on mount', async () => {
    // Test useEffect with optionsRef
    // Verify ArgumentOptionsService.getOptionsForRef called
  });
  
  test('should use static options when no optionsRef', () => {
    // Test existing behavior with argDef.options
  });
  
  test('should show loading state while fetching options', () => {
    // Test loading prop passed to Expression
  });
  
  test('should handle paginated options with search', async () => {
    // Test isPaginated detection
    // Verify onSearch callback provided
  });
  
  test('should handle API errors gracefully', async () => {
    // Test error handling when service fails
  });
});
```

### Phase 3: Integration Tests (Week 2)

#### 3.1 Backend Integration Tests
**File**: `ArgumentOptionsIntegrationTest.java`

```java
@Test
void shouldLoadArgumentOptionsOnServerStart() {
    // Test configuration loading
}

@Test
void shouldValidateFunctionsWithDynamicOptions() {
    // Test end-to-end validation of functions using optionsRef
}
```

#### 3.2 Frontend Integration Tests
**File**: `tests/integration/custom-functions.test.jsx`

```javascript
describe('Custom Functions Integration', () => {
  test('should load argument options and populate dropdowns', async () => {
    // Test full flow: fetch options -> render dropdown -> select value
  });
  
  test('should open custom UI modal and save data', async () => {
    // Test: select custom function -> open modal -> fill form -> save
  });
  
  test('should preserve custom function data in JSON', async () => {
    // Test round-trip: create -> save -> load -> verify
  });
});
```

### Phase 4: E2E Tests (Week 2-3)

#### 4.1 Dynamic Options E2E Test
**File**: `e2e/test-dynamic-argument-options.spec.js`

```javascript
test('should create function with dynamic argument options', async ({ page }) => {
  // 1. Create new rule
  // 2. Select expression with function
  // 3. Choose function with dynamic options (e.g., DATE.DAYS_TO_PAYMENT)
  // 4. Verify dropdown populated from backend
  // 5. Select option and save
  // 6. Reload and verify value preserved
});
```

#### 4.2 Custom UI E2E Test
**File**: `e2e/test-custom-function-ui.spec.js`

```javascript
test('should use custom UI for complex functions', async ({ page }) => {
  // 1. Create new rule
  // 2. Select expression with function
### Week 1: Foundation
1. ✅ **Backend**: Create argument-options configuration files (days-of-month.json, currencies.json, etc.)
2. ✅ **Backend**: Implement ArgumentOptionsController with individual endpoints
3. ✅ **Backend**: Add schema validation for optionsRef and customUI
4. ✅ **Backend Tests**: Write and pass all backend tests
5. ✅ **Frontend**: Create argumentOptionsConfig.js service mapping
6. ✅ **Frontend**: Create ArgumentOptionsService with caching and pagination support

## Implementation Order

### Week 1: Foundation
1. ✅ **Backend**: Create argument-options.json configuration file
2. ✅ **Backend**: Implement ArgumentOptionsController and service
3. ✅ **Backend**: Add schema validation for optionsRef and customUI
4. ✅ **Backend Tests**: Write and pass all backend tests
5. ✅ **Frontend**: Create ArgumentOptionsService
6. ✅ **Frontend**: Update ConfigService to load argument options

### Week 2: Core Features
7. ✅ **Frontend**: Update FunctionArgument to use dynamic options
8. ✅ **Frontend**: Create CustomFunctionModal component
9. ✅ **Frontend**: Update Function component for custom UI support
10. ✅ **Frontend Tests**: Write and pass all component tests
11. ✅ **Integration Tests**: Backend and frontend integration tests

### Week 3: Polish & E2E
12. ✅ **Example Implementation**: Create sample custom component (CurrencyConversion)
13. ✅ **Documentation**: Update README with custom function guide
14. ✅ **E2E Tests**: Write and pass all E2E tests
15. ✅ **Code Review**: Review and refine implementation

## Custom Component Development Guide

### Overview
Custom function components are **just forms** - they don't need to worry about modal behavior, data conversion, or storage. The `CustomFunctionModal` wrapper handles all of that.

### Required Props Interface

Every custom component must accept these three props:

```typescript
interface CustomFunctionProps {
  initialData: object;      // Pre-populated form values (simple object)
  onSave: (data) => void;   // Callback with form data to save
  onCancel: () => void;     // Callback to close without saving
}
```

### Required Features

#### 1. Accept and Use `initialData`
Populate form fields with existing data when editing:

```javascript
const YourCustomFunction = ({ initialData, onSave, onCancel }) => {
  const [form] = Form.useForm();
  
  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
    }
  }, [initialData, form]);
```

#### 2. Call `onSave(data)` with Simple Object
Return a plain object - **not** the complex function args structure:

```javascript
const handleSubmit = (values) => {
  // Just return the form values - wrapper handles conversion
  onSave({
    amount: values.amount,
    from: values.from,
    to: values.to,
    rate: values.rate
  });
};
```

#### 3. Call `onCancel()` on Cancel
```javascript
<Button onClick={onCancel}>Cancel</Button>
```

#### 4. Return Valid Form UI
Use Ant Design components for consistency with rest of UI.

### Data Flow

The wrapper handles all data transformation:

```
┌─────────────────────────────────────────────────────────────┐
│ Function args in JSON (complex):                             │
│ {                                                            │
│   "name": "CURRENCY.CONVERT",                               │
│   "args": [                                                  │
│     { "name": "amount",                                      │
│       "value": { "type": "value", "returnType": "number",   │
│                  "value": 1000 } }                          │
│   ]                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
        CustomFunctionModal extracts to initialData
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Simple object your component receives:                      │
│ {                                                            │
│   amount: 1000,                                              │
│   from: "USD",                                               │
│   to: "EUR",                                                 │
│   rate: 1.2                                                  │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
              Your component renders form
                            ↓
         User edits → calls onSave(values)
                            ↓
        CustomFunctionModal converts back to args
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Function args saved to JSON                                  │
└─────────────────────────────────────────────────────────────┘
```

### Complete Template

Use this as starting point for new custom components:

```javascript
import React, { useEffect } from 'react';
import { Form, InputNumber, Input, Select, Button, Space } from 'antd';

/**
 * Custom function form component template
 * 
 * @param {object} initialData - Pre-populated form values
 * @param {function} onSave - Callback to save form data
 * @param {function} onCancel - Callback to cancel
 */
const YourCustomFunction = ({ initialData, onSave, onCancel }) => {
  const [form] = Form.useForm();
  
  // Initialize form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
    }
  }, [initialData, form]);
  
  const handleSubmit = (values) => {
    // Return simple object - wrapper handles conversion to function args
    onSave(values);
  };
  
  return (
    <Form 
      form={form} 
      onFinish={handleSubmit}
      layout="vertical"
      style={{ maxWidth: 600 }}
    >
      <Form.Item 
        name="field1" 
        label="Field 1" 
        rules={[{ required: true, message: 'Field 1 is required' }]}
      >
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      
      <Form.Item 
        name="field2" 
        label="Field 2"
        rules={[{ required: true }]}
      >
        <Select>
          <Select.Option value="A">Option A</Select.Option>
          <Select.Option value="B">Option B</Select.Option>
        </Select>
      </Form.Item>
      
      <Form.Item name="field3" label="Field 3">
        <Input placeholder="Optional field" />
      </Form.Item>
      
      <Space>
        <Button type="primary" htmlType="submit">Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Space>
    </Form>
  );
};

export default YourCustomFunction;
```

### Example Implementation: CurrencyConversion.jsx

```javascript
import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Button, Space, Typography } from 'antd';

const { Text } = Typography;

const CurrencyConversion = ({ initialData, onSave, onCancel }) => {
  const [form] = Form.useForm();
  
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
    }
  }, [initialData, form]);
  
  const handleSubmit = (values) => {
    // Return simple object - CustomFunctionModal handles conversion
    onSave(values);
  };
  
  return (
    <Form 
      form={form} 
      onFinish={handleSubmit}
      layout="vertical"
    >
      <Form.Item 
        name="amount" 
        label="Amount to Convert" 
        rules={[{ required: true, message: 'Amount is required' }]}
      >
        <InputNumber 
          style={{ width: '100%' }} 
          min={0}
          precision={2}
          placeholder="Enter amount"
        />
      </Form.Item>
      
      <Space size="large">
        <Form.Item 
          name="from" 
          label="From Currency" 
          rules={[{ required: true }]}
        >
          <Select style={{ width: 120 }}>
            <Select.Option value="USD">USD ($)</Select.Option>
            <Select.Option value="EUR">EUR (€)</Select.Option>
            <Select.Option value="GBP">GBP (£)</Select.Option>
            <Select.Option value="JPY">JPY (¥)</Select.Option>
          </Select>
        </Form.Item>
        
        <Text style={{ marginTop: 30 }}>→</Text>
        
        <Form.Item 
          name="to" 
          label="To Currency" 
          rules={[{ required: true }]}
        >
          <Select style={{ width: 120 }}>
            <Select.Option value="USD">USD ($)</Select.Option>
            <Select.Option value="EUR">EUR (€)</Select.Option>
            <Select.Option value="GBP">GBP (£)</Select.Option>
            <Select.Option value="JPY">JPY (¥)</Select.Option>
          </Select>
        </Form.Item>
      </Space>
      
      <Form.Item 
        name="rate" 
        label="Exchange Rate" 
        rules={[{ required: true, message: 'Rate is required' }]}
        tooltip="How many units of 'To Currency' per 1 unit of 'From Currency'"
      >
        <InputNumber 
          step={0.0001} 
          style={{ width: '100%' }}
          min={0}
          precision={4}
          placeholder="e.g., 1.2034"
        />
      </Form.Item>
      
      <Space>
        <Button type="primary" htmlType="submit">Save Conversion</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Space>
    </Form>
  );
};

export default CurrencyConversion;
```

### Component Registration

Register custom components in RuleBuilder props:

```javascript
import CurrencyConversion from './custom-functions/CurrencyConversion';
import DateRangeCalculator from './custom-functions/DateRangeCalculator';
import ComplexAggregation from './custom-functions/ComplexAggregation';

<RuleBuilder
  config={config}
  customFunctions={{
    'CurrencyConversion': CurrencyConversion,
    'DateRangeCalculator': DateRangeCalculator,
    'ComplexAggregation': ComplexAggregation
    // Component name must match funcDef.customUIComponent in schema
  }}
  // ... other props
/>
```

### Best Practices

1. **Keep it simple** - Custom components are just forms, don't add complex logic
2. **Use Ant Design** - Stay consistent with the rest of the UI
3. **Validate inputs** - Use Form.Item rules for validation
4. **Clear labels** - Make form fields self-explanatory
5. **Provide tooltips** - Use tooltip prop for complex fields
6. **Handle edge cases** - Validate currencies match, rates > 0, etc.
7. **Test thoroughly** - Test with initialData and without (new function)
8. **Document args** - Add JSDoc comments explaining what each field does

## Validation Error Messages

### Backend Validation Errors
```json
{
  "errors": [
    {
      "path": "/definition/function/args[0]/optionsRef",
      "message": "Options reference 'invalidRef' does not exist. Available references: daysOfMonth, currencies"
    },
    {
      "path": "/definition/function/customUI",
      "message": "Custom UI function must specify 'customUIComponent' property"
    },
    {
      "path": "/definition/function/args[0]",
      "message": "Custom UI functions cannot have 'widget' specified for arguments. Use custom component instead."
    }
  ]
}
```

## Configuration Files

### Backend: Individual Option Files
**Location**: `backend/src/main/resources/argument-options/`

**days-of-month.json**:
```json
[
  { "value": 1, "label": "1st" },
  { "value": 2, "label": "2nd" },
  { "value": 3, "label": "3rd" },
  { "value": 4, "label": "4th" },
  { "value": 5, "label": "5th" }
  // ... up to 31
]
```

**currencies.json**:
```json
[
  { "value": "USD", "label": "US Dollar ($)" },
  { "value": "EUR", "label": "Euro (€)" },
  { "value": "GBP", "label": "British Pound (£)" },
  { "value": "JPY", "label": "Japanese Yen (¥)" },
  { "value": "CHF", "label": "Swiss Franc (CHF)" }
]
```

**payment-terms.json**:
```json
[
  { "value": "NET30", "label": "Net 30 Days" },
  { "value": "NET60", "label": "Net 60 Days" },
  { "value": "COD", "label": "Cash on Delivery" },
  { "value": "PREPAID", "label": "Prepaid" }
]
```

### Frontend: Service Configuration
**Location**: `frontend/src/config/argumentOptionsConfig.js`

```javascript
export const ARGUMENT_OPTIONS_SERVICES = {
  // Static lists - cached after first load
  daysOfMonth: '/api/config/argument-options/days-of-month',
  currencies: '/api/config/argument-options/currencies',
  paymentTerms: '/api/config/argument-options/payment-terms',
  
  // Paginated lists - search-based, not cached
## Risk Mitigation

1. **Custom Component Missing**: Fallback to standard inline editor with warning message
2. **Backend Options Unavailable**: Show error message, allow manual entry, graceful degradation
3. **Invalid Options Data**: Validate on backend, show clear errors in JSONEditor
4. **Performance**: 
   - Cache small option lists after first load
   - Use pagination/search for large datasets (500+ items)
   - Lazy-load custom components
   - Debounce search inputs for paginated options
5. **Service Configuration**: Keep endpoint mapping separate from schema for environment flexibility
```

## Success Criteria

### Phase 1 Complete
- ✅ All backend tests passing
- ✅ Argument options API functional
- ✅ Schema validation working for new properties

### Phase 2 Complete  
- ✅ All frontend unit tests passing
- ✅ Dynamic options loading and displaying in dropdowns
- ✅ Custom UI modal system functional

### Phase 3 Complete
- ✅ All integration tests passing
- ✅ Example custom component implemented
- ✅ All E2E tests passing
- ✅ Documentation complete

## Migration Notes

Since we're not worrying about backward compatibility:
- Existing functions continue to work as-is
- New schema properties are optional
- Custom UI is opt-in per function
- No migration scripts needed

## Risk Mitigation

1. **Custom Component Missing**: Fallback to standard inline editor with warning message
2. **Backend Options Unavailable**: Show error message, allow manual entry
3. **Invalid Options Data**: Validate on backend, show clear errors in JSONEditor
4. **Performance**: Cache argument options, lazy-load custom components

## Future Enhancements (Out of Scope)

- Hot-reloading of argument options without restart
- Visual function builder for custom UI
- Plugin system for custom components
- Admin UI for managing argument options
