# Schema-Driven Configuration

This document explains the single source of truth approach for the Rule Builder configuration.

## 🎯 Problem Solved

Previously, rule structure and UI configuration were maintained in separate files:
- `rule-schema-v1.0.6.json` - Validation rules for rule output
- `config.json` - UI behavior and available options  
- `fields.json` - Available data fields and types

This required manual synchronization and could lead to inconsistencies.

## ✅ Solution: Schema-Driven Configuration

Now we have a **single source of truth** approach:

1. **Extended Schema** (`rule-schema-ui-extended.json`) contains both validation rules AND UI metadata
2. **Generator Script** (`scripts/generate-config.js`) automatically creates config files from the schema
3. **Automatic Sync** ensures UI always matches the schema definitions

## 📁 File Structure

```
backend/src/main/resources/static/schemas/
├── rule-schema-ui-extended.json    # ← SINGLE SOURCE OF TRUTH
├── rule-schema-v1.0.6.json        # ← Legacy validation-only schema
└── ...

backend/src/main/resources/static/
├── config.json                    # ← GENERATED from schema  
├── fields.json                    # ← GENERATED from schema
└── ...

scripts/
└── generate-config.js             # ← Generator script
```

## 🔧 How to Use

### 1. Modify the Schema (Source of Truth)

Edit `rule-schema-ui-extended.json` to add/modify:
- **Functions**: Add new functions in `_uiMetadata.functions`
- **Fields**: Add new fields in `_uiMetadata.fields`  
- **Operators**: Modify operators in `_uiMetadata.operators`
- **Types**: Update type configurations in `_uiMetadata.types`

### 2. Regenerate Configuration

```bash
# Run the generator script
node scripts/generate-config.js

# Or use npm script (once workspaces are fixed)
npm run generate-config
```

### 3. Configuration Files Update Automatically

The script generates:
- `config.json` - UI configuration for RuleBuilder component
- `fields.json` - Available data fields for field selection

## 📋 Schema Structure

### Validation Section (Standard JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["structure", "returnType", ...],
  "properties": { ... },
  "definitions": { ... }
}
```

### UI Metadata Section (Custom Extension)
```json
{
  "_uiMetadata": {
    "operators": { ... },      // Comparison operators with labels/cardinality
    "conjunctions": { ... },   // AND/OR logic operators  
    "types": { ... },          // Type configurations (text, number, etc.)
    "functions": { ... },      // Available functions organized by category
    "fields": { ... },         // Data fields organized by table
    "settings": { ... }        // General UI settings
  }
}
```

## 🎨 Adding New Functions

To add a new function, edit the schema:

```json
{
  "_uiMetadata": {
    "functions": {
      "MATH": {
        "label": "MATH Functions",
        "functions": {
          "NEW_FUNC": {
            "label": "New Function",
            "returnType": "number",
            "args": {
              "param1": {
                "label": "Parameter 1",
                "type": "number",
                "valueSources": ["value", "field", "function"]
              }
            }
          }
        }
      }
    }
  }
}
```

Then run `node scripts/generate-config.js` to update the UI configuration.

## 🏗️ Adding New Fields

To add new data fields:

```json
{
  "_uiMetadata": {
    "fields": {
      "TABLE1": {
        "label": "Table 1", 
        "fields": {
          "NEW_FIELD": {
            "label": "New Field",
            "type": "text"
          }
        }
      }
    }
  }
}
```

## 🔧 Custom Dropdowns

Custom dropdowns (like DATE.DIFF units) are defined in function arguments:

```json
{
  "units": {
    "label": "Units",
    "type": "text",
    "widget": "select",           // ← Custom dropdown
    "defaultValue": "DAY",
    "options": [                  // ← Dropdown options
      { "value": "DAY", "label": "Day" },
      { "value": "MONTH", "label": "Month" },
      { "value": "YEAR", "label": "Year" }
    ],
    "valueSources": ["value"]     // ← Only allow direct values
  }
}
```

## 🧪 Testing

After regenerating configuration:

```bash
# Test frontend with new config
cd frontend && npm test

# Test backend 
cd backend && mvn test

# Test the generator itself
node scripts/generate-config.js
```

## ✅ Benefits

1. **Single Source of Truth**: All rule structure in one place
2. **Automatic Sync**: UI always matches schema definitions  
3. **Type Safety**: Generated config follows schema constraints
4. **Easy Updates**: Change schema → regenerate → done!
5. **Version Control**: Schema changes are tracked in git
6. **Documentation**: Self-documenting through schema descriptions

## 🚀 Future Enhancements

- **CI/CD Integration**: Auto-regenerate config on schema changes
- **Schema Validation**: Validate extended schema structure
- **Hot Reload**: Auto-regenerate during development
- **Schema Editor**: Visual editor for schema modifications
- **Migration Tools**: Help migrate between schema versions

## 📖 Related Files

- `/backend/src/main/resources/static/schemas/rule-schema-ui-extended.json` - Extended schema (SOURCE)
- `/scripts/generate-config.js` - Generator script
- `/backend/src/main/resources/static/config.json` - Generated UI config
- `/backend/src/main/resources/static/fields.json` - Generated fields config
- `/frontend/src/Expression.jsx` - Uses generated config
- `/frontend/src/ExpressionGroup.jsx` - Uses generated config