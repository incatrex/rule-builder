# RuleBuilder Component

A fully reusable, themeable rule builder component for creating and managing business rules with three different structures: conditions, case expressions, and mathematical expressions.

## Features

- **Three Rule Structures**: Build simple conditions, complex case expressions, or mathematical expressions
- **Version Management**: Track and manage multiple versions of rules
- **Dependency Injection**: Use default services or inject your own
- **Headless Architecture**: Separate logic (hook) from presentation (UI)
- **Self-Contained Component**: All child components (Case, Condition, Expression, etc.) included
- **Fully Themeable**: Customize appearance using CSS variables
- **TypeScript Ready**: Well-documented props and methods
- **Backward Compatible**: Drop-in replacement for original RuleBuilder

## Component Structure

The RuleBuilder package includes:

**Main Components:**
- `RuleBuilder.jsx` - Combined component (hook + UI + services)
- `RuleBuilderUI.jsx` - Pure presentation component
- `useRuleBuilder.js` - Custom hook containing all logic

**Child Components (Internal):**
- `Case.jsx` - Case expression builder
- `Condition.jsx` - Individual condition component
- `ConditionGroup.jsx` - Grouped conditions with AND/OR
- `Expression.jsx` - Expression builder with `createDirectExpression` helper
- `ExpressionGroup.jsx` - Multi-expression with operators
- `RuleSelector.jsx` - Rule reference selector

**Other Files:**
- `Examples.jsx` - Usage examples
- `RuleBuilder.css` - Component styles
- `index.js` - Package exports

## External Dependencies

The component depends on two external services (not included in package):
- `../../services/RuleService.js` - Rule CRUD operations
- `../../services/ConfigService.js` - Configuration loading

These must be provided by the consuming application or injected via props.

## Architecture

The component is split into three parts:

1. **`useRuleBuilder.js`** - Custom hook containing all logic
2. **`RuleBuilderUI.jsx`** - Pure presentation component  
3. **`RuleBuilder.jsx`** - Combined component (hook + UI)

This separation allows you to:
- Use the component as-is
- Use just the hook with your own UI
- Use just the UI with your own logic
- Completely customize behavior

## Installation

```jsx
// Import main component
import RuleBuilder from './components/RuleBuilder';

// Or use individual parts
import { RuleBuilder, useRuleBuilder, RuleBuilderUI, RuleBuilderExamples } from './components/RuleBuilder';

// Note: Services must be available at ../../services/ or injected via props
import { RuleService, ConfigService } from './services';
```

## Basic Usage

```jsx
import React, { useRef } from 'react';
import RuleBuilder from './components/RuleBuilder/RuleBuilder';

function MyApp() {
  const ruleBuilderRef = useRef(null);
  const [config, setConfig] = useState(null);

  const handleRuleChange = (ruleData) => {
    console.log('Rule changed:', ruleData);
  };

  const handleSaveSuccess = (result) => {
    console.log('Rule saved:', result);
  };

  return (
    <RuleBuilder
      ref={ruleBuilderRef}
      config={config}
      darkMode={false}
      onRuleChange={handleRuleChange}
      onSaveSuccess={handleSaveSuccess}
    />
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `config` | Object | Yes | - | UI configuration with operators, fields, functions |
| `darkMode` | boolean | No | false | Enable dark mode styling |
| `onRuleChange` | Function | No | - | Callback when rule data changes |
| `selectedRuleUuid` | string | No | - | UUID of currently selected rule |
| `onSaveSuccess` | Function | No | - | Callback when rule saves successfully |
| `ruleService` | Object | No | RuleService | Custom rule service implementation |
| `configService` | Object | No | ConfigService | Custom config service implementation |

## Ref Methods

Access these methods by creating a ref:

```jsx
const ruleBuilderRef = useRef(null);
```

### `getRuleOutput()`

Returns the complete rule JSON, cleaned of UI state.

```jsx
const output = ruleBuilderRef.current.getRuleOutput();
console.log(output);
// {
//   structure: 'condition',
//   returnType: 'boolean',
//   ruleType: 'Reporting',
//   uuId: '...',
//   version: 1,
//   metadata: { id: 'MY_RULE', description: '...' },
//   definition: { ... }
// }
```

### `loadRuleData(data)`

Load an existing rule from JSON.

```jsx
ruleBuilderRef.current.loadRuleData({
  structure: 'case',
  returnType: 'number',
  ruleType: 'Calculation',
  metadata: {
    id: 'CALC_001',
    description: 'Calculate discount'
  },
  definition: {
    whenClauses: [...],
    elseClause: {...}
  }
});
```

### `newRule(data)`

Create a new rule with optional initial data.

```jsx
// New blank rule
ruleBuilderRef.current.newRule();

// New rule with initial structure
ruleBuilderRef.current.newRule({
  structure: 'expression',
  returnType: 'number',
  metadata: {
    id: 'NEW_RULE',
    description: 'My new rule'
  }
});
```

## Advanced Usage

### Custom Services

Inject your own service implementations:

```jsx
import { MyCustomRuleService } from './services/MyCustomRuleService';
import { MyCustomConfigService } from './services/MyCustomConfigService';

<RuleBuilder
  config={config}
  ruleService={new MyCustomRuleService()}
  configService={new MyCustomConfigService()}
  onRuleChange={handleRuleChange}
/>
```

### Headless Usage

Use just the hook with your own UI:

```jsx
import { useRuleBuilder } from './components/RuleBuilder/useRuleBuilder';
import { RuleService, ConfigService } from './services';

function MyCustomRuleBuilder() {
  const {
    ruleData,
    handleChange,
    handleSaveRule,
    getRuleOutput
  } = useRuleBuilder({
    ruleService: new RuleService(),
    configService: new ConfigService(),
    onRuleChange: (data) => console.log(data)
  });

  return (
    <div>
      <h1>{ruleData.metadata.id}</h1>
      {/* Your custom UI here */}
    </div>
  );
}
```

### Presentation Only

Use just the UI component with your own logic:

```jsx
import { RuleBuilderUI } from './components/RuleBuilder/RuleBuilderUI';

function MyRuleBuilder() {
  const [ruleData, setRuleData] = useState({...});
  // ... your custom logic ...

  return (
    <RuleBuilderUI
      ruleData={ruleData}
      availableVersions={versions}
      ruleTypes={types}
      config={config}
      onMetadataChange={(metadata) => setRuleData({...ruleData, metadata})}
      onSave={handleSave}
      // ... other props
    />
  );
}
```

## Theming

Customize appearance using CSS variables:

```css
:root {
  /* Container */
  --rule-builder-padding: 20px;
  
  /* Card */
  --rule-builder-card-bg: #f5f5f5;
  --rule-builder-card-border: #cccccc;
  
  /* Labels */
  --rule-builder-label-color: #333333;
  --rule-builder-label-font-weight: 700;
  
  /* Save Button */
  --rule-builder-save-btn-bg: #4CAF50;
  --rule-builder-save-btn-hover-bg: #45a049;
}
```

Or use inline styles for dark mode:

```jsx
<div data-theme="dark">
  <RuleBuilder darkMode={true} {...props} />
</div>
```

## Rule Structures

### Condition

Simple boolean condition or condition group:

```json
{
  "structure": "condition",
  "returnType": "boolean",
  "definition": {
    "type": "conditionGroup",
    "conjunction": "AND",
    "conditions": [...]
  }
}
```

### Case Expression

Multiple conditions with different results:

```json
{
  "structure": "case",
  "returnType": "number",
  "definition": {
    "whenClauses": [
      {
        "when": {...},
        "then": {...}
      }
    ],
    "elseClause": {...}
  }
}
```

### Expression

Single value, field, function call, or mathematical expression:

```json
{
  "structure": "expression",
  "returnType": "number",
  "definition": {
    "type": "value",
    "returnType": "number",
    "value": 42
  }
}
```

Or a mathematical expression:

```json
{
  "structure": "expression",
  "returnType": "number",
  "definition": {
    "type": "expressionGroup",
    "returnType": "number",
    "expressions": [
      { "type": "field", "returnType": "number", "field": "TABLE1.AMOUNT" },
      { "type": "value", "returnType": "number", "value": 100 }
    ],
    "operators": ["+"]
  }
}
```

## Service Requirements

If you provide custom services, they must implement these methods:

### RuleService

```javascript
class CustomRuleService {
  async getRuleVersions(uuid) {
    // Return array of version numbers
    return [1, 2, 3];
  }

  async getRuleVersion(uuid, version) {
    // Return rule data for specific version
    return { structure: '...', ... };
  }

  async createRule(ruleData) {
    // Create new rule, return result with uuid and version
    return { uuid: '...', version: 1, ruleId: '...' };
  }

  async updateRule(uuid, ruleData) {
    // Update rule, return result with new version
    return { uuid: '...', version: 2, ruleId: '...' };
  }
}
```

### ConfigService

```javascript
class CustomConfigService {
  async getConfig() {
    // Return config with ruleTypes array
    return {
      ruleTypes: ['Reporting', 'Validation', ...],
      operators: [...],
      functions: [...],
      fields: [...]
    };
  }
}
```

## Events

### onRuleChange

Called whenever rule data changes:

```jsx
const handleRuleChange = (ruleData) => {
  console.log('Structure:', ruleData.structure);
  console.log('Return Type:', ruleData.returnType);
  console.log('Metadata:', ruleData.metadata);
  console.log('Definition:', ruleData.definition);
};
```

### onSaveSuccess

Called after successful save:

```jsx
const handleSaveSuccess = (result) => {
  console.log('Saved UUID:', result.uuid);
  console.log('New Version:', result.version);
  console.log('Rule ID:', result.ruleId);
};
```

## Best Practices

1. **Always provide a config**: The component needs operators, fields, and functions to work
2. **Provide external services**: Ensure RuleService and ConfigService are available or injected
3. **Use refs for imperative actions**: Don't try to control the component via props
4. **Handle onSaveSuccess**: Refresh your rule list or navigate after save
5. **Validate before save**: The component will warn if metadata.id is missing
6. **Theme consistently**: Use CSS variables instead of inline styles when possible

## Packaging for Reuse

To use this component in another project:

1. **Copy the entire `/components/RuleBuilder/` directory**
2. **Ensure services are available**: The component imports from `../../services/`
   - Provide RuleService and ConfigService at that path, OR
   - Inject them via props: `ruleService={myService}` and `configService={myConfig}`
3. **Import the component**: `import RuleBuilder from './components/RuleBuilder'`
4. **Styles**: Make sure to import or bundle `RuleBuilder.css`

## Troubleshooting

### Rule doesn't save

- Check that `metadata.id` is provided
- Verify your `ruleService` is properly configured
- Check browser console for error messages

### Versions don't load

- Ensure `selectedRuleUuid` is provided
- Verify `ruleService.getRuleVersions()` returns an array

### Custom theme not applying

- Make sure CSS is imported: `import './RuleBuilder.css'`
- Check that CSS variables are defined in `:root` or on parent element
- Use browser dev tools to inspect computed styles

## Examples

See `Examples.jsx` for complete working examples including:
- Basic usage
- Custom services
- Headless usage
- Themed instances
- Multiple builders on one page

## License

Part of the Rule Builder application.
