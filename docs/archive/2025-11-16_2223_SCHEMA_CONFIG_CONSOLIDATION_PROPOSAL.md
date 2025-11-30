# Schema-Driven Configuration Proposal

## Executive Summary

This proposal outlines a strategy to consolidate the JSON Schema and UI configuration into a single source of truth, where the **JSON Schema becomes the authoritative specification** and the backend dynamically generates UI configuration from it.

**Key Benefits:**
- ✅ Single source of truth for types, operators, functions, and their constraints
- ✅ Schema validates argument names, order, types, and cardinality (via backend semantic validator)
- ✅ Backend auto-generates UI config from schema metadata
- ✅ Human-readable, succinct schema using JSON Schema + custom `x-ui-*` extensions
- ✅ No duplication between schema validation and UI configuration
- ✅ Data-driven validation - most changes require no code updates

---

## Current State Analysis

### Problem: Dual Maintenance Burden

Currently, we maintain **two separate sources of truth**:

1. **`rule-schema-v1.2.0.json`** - Validates JSON structure and syntax
   - ✅ Validates structure (case/condition/expression)
   - ✅ Validates operator enums
   - ✅ Validates function name enums
   - ❌ Does NOT validate function argument names, order, or types
   - ❌ Does NOT specify operator cardinality or UI labels
   - ❌ Does NOT specify type-to-operator mappings

2. **`config.json`** - Provides UI configuration
   - ✅ Defines operator labels, cardinality, separators
   - ✅ Defines function arguments, types, labels, defaults
   - ✅ Defines type-to-operator/expression-operator mappings
   - ❌ No validation - UI could accept invalid configurations
   - ❌ Duplicates type/operator/function definitions from schema

**Impact:** When adding a new function or operator, developers must:
1. Add it to the schema enum
2. Add full definition to config.json
3. Manually ensure consistency between both
4. Risk: Easy to have mismatches that cause runtime errors

---

## Proposed Solution: Schema-First Architecture

### Core Concept

**The JSON Schema becomes the complete specification** with three layers:

1. **Standard JSON Schema** - Structure validation (existing)
2. **Custom `x-ui-*` Extensions** - UI metadata embedded in schema
3. **Backend Config Service** - Reads schema, generates UI config dynamically

```
┌─────────────────────────────────────────┐
│   Enhanced JSON Schema (Single Source)  │
│  - Standard validation rules            │
│  - x-ui-* custom extensions for UI      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Backend: SchemaConfigService.java     │
│  - Reads schema on startup              │
│  - Extracts x-ui-* metadata             │
│  - Generates UI config dynamically      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Frontend receives generated config    │
│  - Same structure as current config.json│
│  - No changes to UI components          │
└─────────────────────────────────────────┘
```

---

## Enhanced Schema Structure

### Approach: Custom Extensions (x-ui-*)

JSON Schema allows custom properties starting with `x-` (extensions). We'll use:
- `x-ui-label` - Display name for UI
- `x-ui-symbol` - Symbol for operators
- `x-ui-cardinality` - Number of arguments
- `x-ui-separator` - Display separator
- `x-ui-applicable-types` - Which types support this operator/function
- `x-ui-widget` - UI widget type
- `x-ui-options` - Select dropdown options
- `x-ui-default` - Default value

### Example 1: Enhanced Condition Operators

```json
{
  "definitions": {
    "conditionOperatorEnum": {
      "type": "string",
      "enum": ["equal", "not_equal", "less", "greater", "contains", "between", "in"],
      "x-ui-operators": {
        "equal": {
          "label": "=",
          "cardinality": 1,
          "applicableTypes": ["number", "text", "date", "boolean"]
        },
        "not_equal": {
          "label": "!=",
          "cardinality": 1,
          "applicableTypes": ["number", "text", "date", "boolean"]
        },
        "less": {
          "label": "<",
          "cardinality": 1,
          "applicableTypes": ["number", "date"]
        },
        "contains": {
          "label": "Contains",
          "cardinality": 1,
          "applicableTypes": ["text"]
        },
        "between": {
          "label": "Between",
          "cardinality": 2,
          "separator": "AND",
          "applicableTypes": ["number", "date"]
        },
        "in": {
          "label": "IN",
          "minCardinality": 1,
          "maxCardinality": 10,
          "defaultCardinality": 3,
          "separator": ",",
          "applicableTypes": ["number", "text", "date"]
        }
      }
    }
  }
}
```

### Example 2: Enhanced Function Definitions

```json
{
  "definitions": {
    "functionNameEnum": {
      "type": "string",
      "enum": ["MATH.ADD", "MATH.SUBTRACT", "TEXT.CONCAT", "TEXT.MID"],
      "x-ui-functions": {
        "MATH.ADD": {
          "label": "ADD",
          "category": "MATH",
          "returnType": "number",
          "dynamicArgs": true,
          "argSpec": {
            "type": "number",
            "minArgs": 2,
            "maxArgs": 10,
            "defaultValue": 0,
            "valueSources": ["value", "field", "function"]
          }
        },
        "MATH.SUBTRACT": {
          "label": "SUBTRACT",
          "category": "MATH",
          "returnType": "number",
          "args": [
            {
              "name": "num1",
              "label": "Number 1",
              "type": "number",
              "required": true,
              "valueSources": ["value", "field", "function"]
            },
            {
              "name": "num2",
              "label": "Number 2",
              "type": "number",
              "required": true,
              "valueSources": ["value", "field", "function"]
            }
          ]
        },
        "TEXT.CONCAT": {
          "label": "CONCAT",
          "category": "TEXT",
          "returnType": "text",
          "args": [
            {
              "name": "text1",
              "label": "Text 1",
              "type": "text",
              "required": true,
              "defaultValue": "",
              "valueSources": ["value", "field", "function"]
            },
            {
              "name": "text2",
              "label": "Text 2",
              "type": "text",
              "required": true,
              "defaultValue": "",
              "valueSources": ["value", "field", "function"]
            }
          ]
        },
        "TEXT.MID": {
          "label": "MID",
          "category": "TEXT",
          "returnType": "text",
          "args": [
            {
              "name": "text",
              "label": "Text",
              "type": "text",
              "required": true,
              "valueSources": ["value", "field", "function"]
            },
            {
              "name": "start",
              "label": "Start Position",
              "type": "number",
              "required": true,
              "valueSources": ["value", "field", "function"]
            },
            {
              "name": "length",
              "label": "Length",
              "type": "number",
              "required": true,
              "valueSources": ["value", "field", "function"]
            }
          ]
        }
      }
    },
    "Function": {
      "type": "object",
      "required": ["name", "args"],
      "properties": {
        "name": {
          "$ref": "#/definitions/functionNameEnum"
        },
        "args": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "value"],
            "properties": {
              "name": {
                "type": "string",
                "description": "Must match function's defined argument names"
              },
              "value": {
                "oneOf": [
                  { "$ref": "#/definitions/Expression" },
                  { "$ref": "#/definitions/ExpressionGroup" }
                ]
              }
            }
          }
        }
      },
      "x-ui-validation": {
        "validateArgNames": true,
        "validateArgOrder": true,
        "validateArgTypes": true
      }
    }
  }
}
```

### Example 3: Enhanced Type System

```json
{
  "definitions": {
    "typeEnum": {
      "type": "string",
      "enum": ["number", "text", "date", "boolean"],
      "x-ui-types": {
        "number": {
          "defaultConditionOperator": "equal",
          "validConditionOperators": ["equal", "not_equal", "less", "less_or_equal", 
                                        "greater", "greater_or_equal", "between", 
                                        "not_between", "in", "not_in"],
          "defaultExpressionOperator": "add",
          "validExpressionOperators": ["add", "subtract", "multiply", "divide"]
        },
        "text": {
          "defaultConditionOperator": "equal",
          "validConditionOperators": ["equal", "not_equal", "contains", "not_contains",
                                        "starts_with", "ends_with", "is_empty", 
                                        "is_not_empty", "in", "not_in"],
          "defaultExpressionOperator": "concat",
          "validExpressionOperators": ["concat"]
        },
        "date": {
          "defaultConditionOperator": "equal",
          "validConditionOperators": ["equal", "not_equal", "less", "less_or_equal",
                                        "greater", "greater_or_equal", "between", 
                                        "not_between"],
          "defaultExpressionOperator": null,
          "validExpressionOperators": []
        },
        "boolean": {
          "defaultConditionOperator": "equal",
          "validConditionOperators": ["equal", "not_equal"],
          "defaultExpressionOperator": "and",
          "validExpressionOperators": ["and", "or"]
        }
      }
    }
  }
}
```

### Example 4: Expression Operators

```json
{
  "definitions": {
    "expressionOperatorEnum": {
      "type": "string",
      "enum": ["+", "-", "*", "/", "&", "&&", "||"],
      "x-ui-expression-operators": {
        "add": {
          "symbol": "+",
          "label": "Add",
          "applicableTypes": ["number"]
        },
        "subtract": {
          "symbol": "-",
          "label": "Subtract",
          "applicableTypes": ["number"]
        },
        "multiply": {
          "symbol": "*",
          "label": "Multiply",
          "applicableTypes": ["number"]
        },
        "divide": {
          "symbol": "/",
          "label": "Divide",
          "applicableTypes": ["number"]
        },
        "concat": {
          "symbol": "&",
          "label": "Concatenate",
          "applicableTypes": ["text"]
        },
        "and": {
          "symbol": "&&",
          "label": "AND",
          "applicableTypes": ["boolean"]
        },
        "or": {
          "symbol": "||",
          "label": "OR",
          "applicableTypes": ["boolean"]
        }
      }
    }
  }
}
```

---

## Backend Implementation

### New Java Service: SchemaConfigService

```java
package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.util.*;

@Service
public class SchemaConfigService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private JsonNode schema;
    private JsonNode generatedConfig;

    @PostConstruct
    public void initialize() throws IOException {
        // Load schema on startup
        ClassPathResource schemaResource = 
            new ClassPathResource("static/schemas/rule-schema-current.json");
        this.schema = objectMapper.readTree(schemaResource.getInputStream());
        
        // Generate UI config from schema
        this.generatedConfig = generateConfigFromSchema();
    }

    /**
     * Get the dynamically generated UI configuration
     */
    public JsonNode getConfig() {
        return generatedConfig;
    }

    /**
     * Generate full UI config from schema metadata
     */
    private JsonNode generateConfigFromSchema() {
        ObjectNode config = objectMapper.createObjectNode();
        
        // Extract and build each section
        config.set("conjunctions", extractConjunctions());
        config.set("conditionOperators", extractConditionOperators());
        config.set("expressionOperators", extractExpressionOperators());
        config.set("types", extractTypes());
        config.set("functions", extractFunctions());
        config.set("settings", extractSettings());
        
        return config;
    }

    /**
     * Extract condition operators from schema x-ui-operators extension
     */
    private JsonNode extractConditionOperators() {
        ObjectNode operators = objectMapper.createObjectNode();
        
        // Navigate to definitions.conditionOperatorEnum
        JsonNode opEnum = schema.at("/definitions/conditionOperatorEnum");
        if (opEnum.has("x-ui-operators")) {
            JsonNode uiOperators = opEnum.get("x-ui-operators");
            uiOperators.fields().forEachRemaining(entry -> {
                operators.set(entry.getKey(), entry.getValue());
            });
        }
        
        return operators;
    }

    /**
     * Extract expression operators from schema
     */
    private JsonNode extractExpressionOperators() {
        ObjectNode operators = objectMapper.createObjectNode();
        
        JsonNode opEnum = schema.at("/definitions/expressionOperatorEnum");
        if (opEnum.has("x-ui-expression-operators")) {
            JsonNode uiOps = opEnum.get("x-ui-expression-operators");
            uiOps.fields().forEachRemaining(entry -> {
                operators.set(entry.getKey(), entry.getValue());
            });
        }
        
        return operators;
    }

    /**
     * Extract type mappings from schema
     */
    private JsonNode extractTypes() {
        ObjectNode types = objectMapper.createObjectNode();
        
        JsonNode typeEnum = schema.at("/definitions/typeEnum");
        if (typeEnum.has("x-ui-types")) {
            JsonNode uiTypes = typeEnum.get("x-ui-types");
            uiTypes.fields().forEachRemaining(entry -> {
                types.set(entry.getKey(), entry.getValue());
            });
        }
        
        return types;
    }

    /**
     * Extract function definitions from schema and build hierarchical structure
     */
    private JsonNode extractFunctions() {
        ObjectNode functions = objectMapper.createObjectNode();
        
        JsonNode funcEnum = schema.at("/definitions/functionNameEnum");
        if (funcEnum.has("x-ui-functions")) {
            JsonNode uiFunctions = funcEnum.get("x-ui-functions");
            
            // Group by category (MATH, TEXT, DATE, etc.)
            Map<String, ObjectNode> categories = new HashMap<>();
            
            uiFunctions.fields().forEachRemaining(entry -> {
                String fullName = entry.getKey(); // e.g., "MATH.ADD"
                JsonNode funcDef = entry.getValue();
                
                String category = funcDef.get("category").asText();
                String funcName = fullName.substring(fullName.indexOf('.') + 1);
                
                // Create category if needed
                if (!categories.containsKey(category)) {
                    ObjectNode categoryNode = objectMapper.createObjectNode();
                    categoryNode.put("label", category + " Functions");
                    categoryNode.put("type", "!struct");
                    categoryNode.set("subfields", objectMapper.createObjectNode());
                    categories.put(category, categoryNode);
                }
                
                // Add function to category
                ObjectNode categoryNode = categories.get(category);
                ObjectNode subfields = (ObjectNode) categoryNode.get("subfields");
                
                // Build function definition for UI
                ObjectNode funcNode = objectMapper.createObjectNode();
                funcNode.put("label", funcDef.get("label").asText());
                funcNode.put("returnType", funcDef.get("returnType").asText());
                
                // Handle dynamic vs fixed args
                if (funcDef.has("dynamicArgs") && funcDef.get("dynamicArgs").asBoolean()) {
                    funcNode.set("dynamicArgs", funcDef.get("argSpec"));
                } else {
                    // Convert args array to args object keyed by name
                    ObjectNode argsNode = objectMapper.createObjectNode();
                    JsonNode argsArray = funcDef.get("args");
                    argsArray.forEach(arg -> {
                        String argName = arg.get("name").asText();
                        ObjectNode argDef = objectMapper.createObjectNode();
                        argDef.put("label", arg.get("label").asText());
                        argDef.put("type", arg.get("type").asText());
                        if (arg.has("defaultValue")) {
                            argDef.set("defaultValue", arg.get("defaultValue"));
                        }
                        if (arg.has("widget")) {
                            argDef.put("widget", arg.get("widget").asText());
                        }
                        if (arg.has("options")) {
                            argDef.set("options", arg.get("options"));
                        }
                        argDef.set("valueSources", arg.get("valueSources"));
                        argsNode.set(argName, argDef);
                    });
                    funcNode.set("args", argsNode);
                }
                
                subfields.set(funcName, funcNode);
            });
            
            // Add all categories to functions
            categories.forEach((category, node) -> {
                functions.set(category, node);
            });
        }
        
        return functions;
    }

    /**
     * Extract conjunctions
     */
    private JsonNode extractConjunctions() {
        ObjectNode conjunctions = objectMapper.createObjectNode();
        
        // Look for conjunction enum in schema
        JsonNode conjEnum = schema.at("/definitions/ConditionGroup/properties/conjunction");
        if (conjEnum.has("enum")) {
            JsonNode enumValues = conjEnum.get("enum");
            enumValues.forEach(value -> {
                String conj = value.asText();
                ObjectNode conjNode = objectMapper.createObjectNode();
                conjNode.put("label", conj);
                conjunctions.set(conj, conjNode);
            });
        }
        
        return conjunctions;
    }

    /**
     * Extract settings
     */
    private JsonNode extractSettings() {
        ObjectNode settings = objectMapper.createObjectNode();
        
        // Look for x-ui-settings in schema root
        if (schema.has("x-ui-settings")) {
            return schema.get("x-ui-settings");
        }
        
        // Default settings
        ArrayNode defaultSources = objectMapper.createArrayNode();
        defaultSources.add("value");
        defaultSources.add("field");
        defaultSources.add("function");
        defaultSources.add("ruleRef");
        settings.set("defaultValueSources", defaultSources);
        
        return settings;
    }

    /**
     * Validate function call against schema
     */
    public ValidationResult validateFunctionCall(String functionName, JsonNode args) {
        JsonNode funcDef = schema.at("/definitions/functionNameEnum/x-ui-functions/" + functionName);
        
        if (funcDef.isMissingNode()) {
            return ValidationResult.error("Function not defined: " + functionName);
        }
        
        List<String> errors = new ArrayList<>();
        
        // Check if dynamic args
        if (funcDef.has("dynamicArgs") && funcDef.get("dynamicArgs").asBoolean()) {
            JsonNode argSpec = funcDef.get("argSpec");
            int minArgs = argSpec.get("minArgs").asInt();
            int maxArgs = argSpec.get("maxArgs").asInt();
            int actualArgs = args.size();
            
            if (actualArgs < minArgs || actualArgs > maxArgs) {
                errors.add(String.format("Function %s expects %d-%d args, got %d", 
                    functionName, minArgs, maxArgs, actualArgs));
            }
            
            // Validate each arg type
            String expectedType = argSpec.get("type").asText();
            for (int i = 0; i < args.size(); i++) {
                JsonNode arg = args.get(i);
                String actualType = arg.has("value") ? 
                    arg.get("value").at("/returnType").asText("unknown") : "unknown";
                if (!actualType.equals(expectedType)) {
                    errors.add(String.format("Arg %d expects type %s, got %s", 
                        i, expectedType, actualType));
                }
            }
        } else {
            // Fixed args - validate names, order, and types
            JsonNode expectedArgs = funcDef.get("args");
            
            // Check arg count
            if (args.size() != expectedArgs.size()) {
                errors.add(String.format("Function %s expects %d args, got %d",
                    functionName, expectedArgs.size(), args.size()));
            }
            
            // Validate each arg
            for (int i = 0; i < expectedArgs.size(); i++) {
                JsonNode expectedArg = expectedArgs.get(i);
                String expectedName = expectedArg.get("name").asText();
                String expectedType = expectedArg.get("type").asText();
                
                if (i >= args.size()) break;
                
                JsonNode actualArg = args.get(i);
                String actualName = actualArg.get("name").asText();
                
                // Validate name
                if (!actualName.equals(expectedName)) {
                    errors.add(String.format("Arg %d: expected name '%s', got '%s'",
                        i, expectedName, actualName));
                }
                
                // Validate type
                JsonNode argValue = actualArg.get("value");
                if (argValue.has("returnType")) {
                    String actualType = argValue.get("returnType").asText();
                    if (!actualType.equals(expectedType)) {
                        errors.add(String.format("Arg '%s': expected type %s, got %s",
                            actualName, expectedType, actualType));
                    }
                }
            }
        }
        
        return errors.isEmpty() ? 
            ValidationResult.success() : 
            ValidationResult.error(String.join("; ", errors));
    }

    /**
     * Simple validation result class
     */
    public static class ValidationResult {
        private final boolean valid;
        private final String message;
        
        private ValidationResult(boolean valid, String message) {
            this.valid = valid;
            this.message = message;
        }
        
        public static ValidationResult success() {
            return new ValidationResult(true, null);
        }
        
        public static ValidationResult error(String message) {
            return new ValidationResult(false, message);
        }
        
        public boolean isValid() { return valid; }
        public String getMessage() { return message; }
    }
}
```

### Update RuleBuilderController

```java
@RestController
@RequestMapping("/api")
public class RuleBuilderController {
    
    @Autowired
    private SchemaConfigService schemaConfigService;  // NEW
    
    @Autowired
    private RuleBuilderService ruleBuilderService;
    
    /**
     * Get UI config - now generated from schema
     */
    @GetMapping("/config")
    public ResponseEntity<JsonNode> getConfig() {
        try {
            // Config now comes from schema, not static file
            JsonNode config = schemaConfigService.getConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Enhanced validation endpoint - validates structure + function semantics
     */
    @PostMapping("/rules/validate")
    public ResponseEntity<JsonNode> validateRule(@RequestBody JsonNode rule) {
        try {
            // First validate against schema structure
            JsonNode structureValidation = ruleBuilderService.validateRule(rule);
            
            // Then validate function calls semantically
            List<String> semanticErrors = new ArrayList<>();
            validateFunctionCallsRecursively(rule, semanticErrors);
            
            // Combine results
            ObjectNode result = (ObjectNode) structureValidation;
            if (!semanticErrors.isEmpty()) {
                result.put("valid", false);
                ArrayNode errors = (ArrayNode) result.get("errors");
                semanticErrors.forEach(errors::add);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    private void validateFunctionCallsRecursively(JsonNode node, List<String> errors) {
        // Recursively find and validate all function calls in the rule
        if (node.has("type") && "function".equals(node.get("type").asText())) {
            JsonNode func = node.get("function");
            String name = func.get("name").asText();
            JsonNode args = func.get("args");
            
            SchemaConfigService.ValidationResult result = 
                schemaConfigService.validateFunctionCall(name, args);
            
            if (!result.isValid()) {
                errors.add(result.getMessage());
            }
        }
        
        // Recurse into child nodes
        node.forEach(child -> {
            if (child.isObject() || child.isArray()) {
                validateFunctionCallsRecursively(child, errors);
            }
        });
    }
}
```

---

## Migration Strategy

### Phase 1: Add x-ui Extensions to Schema (1-2 days)

1. **Update `rule-schema-current.json`**
   - Add `x-ui-operators` to condition operator enum
   - Add `x-ui-expression-operators` to expression operator enum
   - Add `x-ui-types` to type enum
   - Add `x-ui-functions` to function enum with full argument specs
   - Add `x-ui-settings` to schema root

2. **Test schema validation** - Ensure schema still validates correctly

### Phase 2: Implement SchemaConfigService (2-3 days)

1. **Create `SchemaConfigService.java`**
   - Implement schema reading
   - Implement config generation methods
   - Add validation methods for function calls

2. **Update `RuleBuilderController.java`**
   - Wire in `SchemaConfigService`
   - Update `/api/config` endpoint
   - Enhance `/api/rules/validate` endpoint

3. **Test generated config** - Verify output matches current config.json structure

### Phase 3: Frontend Testing (1-2 days)

1. **No frontend code changes needed** - Config structure remains identical
2. **Integration testing** - Verify all UI components work with generated config
3. **Regression testing** - Test all existing sample rules

### Phase 4: Deprecate config.json (1 day)

1. **Move `config.json` to `config.json.deprecated`**
2. **Update documentation**
3. **Add comments in schema explaining x-ui extensions**

### Phase 5: Enhanced Validation (2-3 days)

1. **Implement semantic function validation**
2. **Add validation for operator cardinality**
3. **Add validation for type compatibility**

**Total Estimated Time: 7-11 days**

---

## Benefits Summary

### ✅ Single Source of Truth
- Schema defines everything: types, operators, functions, arguments
- No duplication or sync issues
- Easy to add new functions/operators - just update schema

### ✅ Enhanced Validation
- Validates function argument names match specification
- Validates argument order
- Validates argument types
- Validates operator cardinality (between needs 2, in needs 1-10, etc.)
- Validates type compatibility

### ✅ Maintainability
- One place to update when adding features
- Less code to maintain (remove static config.json)
- Self-documenting - schema shows all capabilities

### ✅ Human Readable
- Uses standard JSON Schema format
- Custom extensions clearly marked with `x-ui-` prefix
- Comments can be added as `description` fields
- Succinct - no duplication

### ✅ No Breaking Changes
- Frontend receives exact same config structure
- No UI component changes needed
- Backward compatible

---

## Example: Adding a New Function

### Current Process (Before)

**Step 1:** Update schema enum
```json
"enum": ["MATH.ADD", "MATH.NEW_FUNC"]
```

**Step 2:** Update config.json
```json
"MATH": {
  "subfields": {
    "NEW_FUNC": {
      "label": "New Function",
      "returnType": "number",
      "args": { /* ... */ }
    }
  }
}
```

**Step 3:** Hope they match! ❌

### New Process (After)

**Single Step:** Update schema with x-ui metadata
```json
"enum": ["MATH.ADD", "MATH.NEW_FUNC"],
"x-ui-functions": {
  "MATH.NEW_FUNC": {
    "label": "New Function",
    "category": "MATH",
    "returnType": "number",
    "args": [
      {
        "name": "input",
        "label": "Input",
        "type": "number",
        "required": true,
        "valueSources": ["value", "field", "function"]
      }
    ]
  }
}
```

✅ Schema validates the enum
✅ Schema provides UI metadata
✅ Backend auto-generates UI config
✅ Validation ensures correct usage

---

## Alternative Considered: Separate Metadata File

**Approach:** Keep schema minimal, create `schema-metadata.json` with UI details

**Pros:**
- Cleaner separation of concerns
- Schema remains "pure" JSON Schema

**Cons:**
- Still two files to maintain
- Harder to ensure they stay in sync
- Extra complexity in build/deployment

**Decision:** ❌ Rejected in favor of x-ui extensions approach

---

## Questions & Answers

### Q: Won't x-ui extensions make the schema messy?

**A:** No - extensions are clearly marked and can be collapsed in editors. They're co-located with the definitions they describe, making them easier to maintain.

### Q: What if we need different UI configs for different frontends?

**A:** The `x-ui-*` extensions define the "full" capabilities. Different frontends can filter/subset as needed. We could also add query parameters like `/api/config?profile=basic` to generate different configs.

### Q: Does this impact schema validation performance?

**A:** No - the validation library ignores `x-*` properties. They're only read during config generation at startup.

### Q: Can we version the schema and generated configs separately?

**A:** Yes - the schema file name determines the version. Generated config includes schema version metadata. We can maintain multiple schema versions simultaneously.

### Q: What about fields.json and ruleTypes.json?

**A:** Phase 2 extension: These could also be embedded in schema as `x-ui-fields` and `x-ui-rule-types`, but that's optional. Start with config.json consolidation.

---

## Recommendation

**✅ Proceed with Schema-First Architecture using x-ui Extensions**

This approach provides:
- Immediate value with manageable effort (7-11 days)
- No breaking changes to frontend
- Foundation for enhanced validation
- Clear path forward for maintenance

**Next Steps:**
1. Review and approve proposal
2. Create detailed technical specification
3. Update schema with x-ui extensions
4. Implement SchemaConfigService
5. Test and deploy

---

## Validation Architecture: Two-Layer Approach

### Layer 1: Structural Validation (Standard JSON Schema)

**What it validates:**
- ✅ JSON structure is correct (objects, arrays, required fields)
- ✅ Data types are correct (string, number, boolean)
- ✅ Enum values are valid (function names, operator names)
- ✅ Patterns match (UUIDs, field paths)
- ✅ Array constraints (minItems, maxItems)

**What it does NOT validate:**
- ❌ Function argument names match the function's specification
- ❌ Function argument order is correct
- ❌ Function argument types are compatible
- ❌ Correct number of arguments for each function
- ❌ Operator cardinality matches usage

**Example:** These invalid rules would **PASS** standard schema validation:
```json
// Wrong argument names - standard validator says ✅ (but it's wrong)
{
  "type": "function",
  "function": {
    "name": "TEXT.MID",
    "args": [
      {"name": "pizza", "value": {...}},      // Should be "text"
      {"name": "taco", "value": {...}},       // Should be "start"
      {"name": "burrito", "value": {...}}     // Should be "length"
    ]
  }
}

// Wrong argument types - standard validator says ✅ (but it's wrong)
{
  "type": "function",
  "function": {
    "name": "TEXT.MID",
    "args": [
      {"name": "text", "value": {"returnType": "text", ...}},
      {"name": "start", "value": {"returnType": "text", ...}},  // Should be number!
      {"name": "length", "value": {"returnType": "number", ...}}
    ]
  }
}
```

### Layer 2: Semantic Validation (Backend Java Service)

**What it validates:**
- ✅ Function argument names match specification from `x-ui-functions`
- ✅ Function argument order is correct
- ✅ Function argument types are compatible (`returnType` matches expected type)
- ✅ Correct number of arguments (respects `minArgs`/`maxArgs` for dynamic args)
- ✅ Required vs optional arguments
- ✅ Operator cardinality (future enhancement)

**Implementation:** Reads function specifications from `x-ui-functions` metadata and validates actual usage against specification.

**Tool Compatibility:**
- Python `jsonschema` library: ✅ Layer 1 only (structural)
- JavaScript validators: ✅ Layer 1 only (structural)  
- Backend `/api/rules/validate`: ✅ Layer 1 + Layer 2 (structural + semantic)

**Example errors caught by semantic validation:**
```
"Function TEXT.MID argument 1: expected name 'text', got 'pizza'"
"Function TEXT.MID argument 'start' expects type number, got text"
"Function MATH.ADD expects 2-10 arguments, got 1"
```

---

## Data-Driven Validation Design

### Schema Changes That DON'T Require Code Changes ✅

The validator is designed to be **data-driven** - most changes to function/operator definitions require NO code changes:

| Change Type | Example | Code Change? |
|------------|---------|--------------|
| Add/remove function | Add `MATH.POWER` to schema | ✅ No |
| Change function arg names | Rename `start` to `startPos` | ✅ No |
| Change function arg types | Change arg from `text` to `number` | ✅ No |
| Change arg count limits | Change `minArgs` from 2 to 1 | ✅ No |
| Add/remove data types | Add `currency` type | ✅ No |
| Change operator cardinality | Change IN from max 10 to max 50 | ✅ No |
| Add optional arguments | Add optional `locale` arg | ✅ No |

**How it works:** The validator reads function/operator specifications from the schema's `x-ui-*` extensions at runtime and applies validation rules dynamically.

### Schema Changes That REQUIRE Code Changes ❌

These introduce **new validation logic** that the validator doesn't know about:

| Change Type | Example | Why Code Change Needed |
|------------|---------|----------------------|
| New expression type | Add `variable` or `lambda` type | New validation logic required |
| New validation rule type | "Function X only accepts field refs, not values" | New constraint type |
| Cross-field dependencies | "If operator is 'between', right must be array of 2" | New dependency logic |
| New operator category | Add `aggregateOperators` (SUM, AVG) | New operator type handling |
| Recursive constraints | "ExpressionGroups nest max 3 levels" | Depth tracking logic |
| Argument polymorphism | Arg accepts multiple types based on another arg | Conditional type logic |
| Inter-rule validation | "RuleRef must reference compatible returnType" | Cross-rule lookups |

**Design Principle:** Parameter changes (names, counts, types) = no code change. Structural changes (new concepts, new logic) = code change needed.

---

## Appendix: Full Schema Example Snippet

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Rule Builder Schema",
  "description": "Single source of truth for rule validation and UI configuration",
  
  "x-ui-settings": {
    "defaultValueSources": ["value", "field", "function", "ruleRef"]
  },
  
  "definitions": {
    "conditionOperatorEnum": {
      "type": "string",
      "enum": [
        "equal", "not_equal", "less", "less_or_equal", 
        "greater", "greater_or_equal", "contains", "not_contains",
        "starts_with", "ends_with", "is_empty", "is_not_empty",
        "between", "not_between", "in", "not_in"
      ],
      "x-ui-operators": {
        "equal": {
          "label": "=",
          "cardinality": 1,
          "applicableTypes": ["number", "text", "date", "boolean"]
        },
        "between": {
          "label": "Between",
          "cardinality": 2,
          "separator": "AND",
          "applicableTypes": ["number", "date"]
        }
        // ... etc
      }
    },
    
    "functionNameEnum": {
      "type": "string",
      "enum": ["MATH.ADD", "TEXT.CONCAT"],
      "x-ui-functions": {
        "MATH.ADD": {
          "label": "ADD",
          "category": "MATH",
          "returnType": "number",
          "dynamicArgs": true,
          "argSpec": {
            "type": "number",
            "minArgs": 2,
            "maxArgs": 10
          }
        }
        // ... etc
      }
    }
  }
}
```
