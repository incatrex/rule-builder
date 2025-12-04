package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.*;

/**
 * Service that generates UI configuration from JSON Schema x-ui-* extensions.
 * This provides a single source of truth - the schema defines both validation rules
 * and UI configuration metadata.
 */
@Service
public class RuleBuilderConfigService {

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
     * Get the loaded schema (for validation or inspection)
     */
    public JsonNode getSchema() {
        return schema;
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
        config.set("ruleTypes", extractRuleTypes());
        
        // Extract rule type constraints for ruleRef contexts
        extractRuleTypeConstraints(config);
        
        return config;
    }
    
    /**
     * Extract rule type constraints from schema for ruleRef contexts
     * Adds conditionGroupRuleType and conditionAllowedRuleTypes to config
     */
    private void extractRuleTypeConstraints(ObjectNode config) {
        JsonNode definitions = schema.get("definitions");
        if (definitions == null) return;
        
        // Extract Condition ruleType constraint (enum) -> conditionAllowedRuleTypes
        if (definitions.has("Condition")) {
            JsonNode condition = definitions.get("Condition");
            JsonNode oneOf = condition.get("oneOf");
            if (oneOf != null && oneOf.isArray() && oneOf.size() > 1) {
                JsonNode ruleRefSchema = oneOf.get(1);
                JsonNode ruleTypeNode = ruleRefSchema.at("/properties/ruleRef/properties/ruleType");
                if (ruleTypeNode.has("enum")) {
                    ArrayNode allowedTypes = objectMapper.createArrayNode();
                    ruleTypeNode.get("enum").forEach(allowedTypes::add);
                    config.set("conditionAllowedRuleTypes", allowedTypes);
                }
            }
        }
        
        // Extract ConditionGroup ruleType constraint (const) -> conditionGroupRuleType
        if (definitions.has("ConditionGroup")) {
            JsonNode conditionGroup = definitions.get("ConditionGroup");
            JsonNode oneOf = conditionGroup.get("oneOf");
            if (oneOf != null && oneOf.isArray() && oneOf.size() > 1) {
                JsonNode ruleRefSchema = oneOf.get(1);
                JsonNode ruleTypeNode = ruleRefSchema.at("/properties/ruleRef/properties/ruleType");
                if (ruleTypeNode.has("const")) {
                    config.put("conditionGroupRuleType", ruleTypeNode.get("const").asText());
                }
            }
        }
    }
    
    /**
     * Extract rule types from schema
     */
    private JsonNode extractRuleTypes() {
        ArrayNode ruleTypes = objectMapper.createArrayNode();
        
        // Look for ruleType definition - could be inline or referenced
        JsonNode ruleTypeNode = schema.at("/properties/ruleType");
        
        // Check if it's a $ref
        if (ruleTypeNode.has("$ref")) {
            String ref = ruleTypeNode.get("$ref").asText();
            // Resolve the reference (e.g., "#/definitions/RuleType")
            if (ref.startsWith("#/")) {
                String path = ref.substring(1); // Remove leading #
                ruleTypeNode = schema.at(path);
            }
        }
        
        // Now get the enum values
        if (ruleTypeNode.has("enum")) {
            JsonNode enumValues = ruleTypeNode.get("enum");
            if (enumValues.isArray()) {
                enumValues.forEach(ruleTypes::add);
            }
        }
        
        return ruleTypes;
    }

    /**
     * Extract conjunctions from schema
     */
    private JsonNode extractConjunctions() {
        ObjectNode conjunctions = objectMapper.createObjectNode();
        
        // Look for x-ui-conjunctions in ConditionGroup definition
        JsonNode conjNode = schema.at("/definitions/ConditionGroup/properties/conjunction");
        if (conjNode.has("x-ui-conjunctions")) {
            JsonNode uiConj = conjNode.get("x-ui-conjunctions");
            uiConj.fields().forEachRemaining(entry -> {
                conjunctions.set(entry.getKey(), entry.getValue());
            });
        }
        
        return conjunctions;
    }

    /**
     * Extract condition operators from schema x-ui-operators extension
     */
    private JsonNode extractConditionOperators() {
        ObjectNode operators = objectMapper.createObjectNode();
        
        // Navigate to Condition.properties.operator
        JsonNode opNode = schema.at("/definitions/Condition/properties/operator");
        if (opNode.has("x-ui-operators")) {
            JsonNode uiOperators = opNode.get("x-ui-operators");
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
        
        // Navigate to ExpressionGroup.properties.operators
        JsonNode opNode = schema.at("/definitions/ExpressionGroup/properties/operators");
        if (opNode.has("x-ui-expression-operators")) {
            JsonNode uiOps = opNode.get("x-ui-expression-operators");
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
        
        // Navigate to Expression.properties.returnType
        JsonNode typeNode = schema.at("/definitions/Expression/properties/returnType");
        if (typeNode.has("x-ui-types")) {
            JsonNode uiTypes = typeNode.get("x-ui-types");
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
        
        // Navigate to function.properties.name
        JsonNode funcNode = schema.at("/definitions/Expression/properties/function/properties/name");
        if (funcNode.has("x-ui-functions")) {
            JsonNode uiFunctions = funcNode.get("x-ui-functions");
            
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
                ObjectNode funcDefNode = objectMapper.createObjectNode();
                funcDefNode.put("label", funcDef.get("label").asText());
                funcDefNode.put("returnType", funcDef.get("returnType").asText());
                
                // Add customUI flag if present
                if (funcDef.has("customUI")) {
                    JsonNode customUINode = funcDef.get("customUI");
                    if (customUINode.isBoolean()) {
                        funcDefNode.put("customUI", customUINode.asBoolean());
                    }
                }
                
                // Add customUIComponent if present
                if (funcDef.has("customUIComponent")) {
                    JsonNode customUIComponentNode = funcDef.get("customUIComponent");
                    if (customUIComponentNode.isTextual()) {
                        funcDefNode.put("customUIComponent", customUIComponentNode.asText());
                    }
                }
                
                // Handle dynamic vs fixed args
                if (funcDef.has("dynamicArgs") && funcDef.get("dynamicArgs").asBoolean()) {
                    funcDefNode.set("dynamicArgs", funcDef.get("argSpec"));
                } else {
                    // Convert args array to args object keyed by name
                    ObjectNode argsNode = objectMapper.createObjectNode();
                    JsonNode argsArray = funcDef.get("args");
                    if (argsArray != null && argsArray.isArray()) {
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
                            if (arg.has("optionsRef")) {
                                JsonNode optionsRefNode = arg.get("optionsRef");
                                if (optionsRefNode.isTextual()) {
                                    argDef.put("optionsRef", optionsRefNode.asText());
                                }
                            }
                            if (arg.has("valueSources")) {
                                argDef.set("valueSources", arg.get("valueSources"));
                            }
                            argsNode.set(argName, argDef);
                        });
                    }
                    funcDefNode.set("args", argsNode);
                }
                
                subfields.set(funcName, funcDefNode);
            });
            
            // Add all categories to functions
            categories.forEach((category, node) -> {
                functions.set(category, node);
            });
        }
        
        return functions;
    }

    /**
     * Extract settings from schema
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
     * Get function specification for validation
     */
    public JsonNode getFunctionSpec(String functionName) {
        JsonNode funcNode = schema.at("/definitions/Expression/properties/function/properties/name");
        if (funcNode.has("x-ui-functions")) {
            JsonNode uiFunctions = funcNode.get("x-ui-functions");
            return uiFunctions.get(functionName);
        }
        return null;
    }

    /**
     * Validate function call against schema specification
     */
    public ValidationResult validateFunctionCall(String functionName, JsonNode args) {
        JsonNode funcDef = getFunctionSpec(functionName);
        
        if (funcDef == null || funcDef.isMissingNode()) {
            return ValidationResult.error("Function not defined: " + functionName);
        }
        
        List<String> errors = new ArrayList<>();
        
        // Check if dynamic args
        if (funcDef.has("dynamicArgs") && funcDef.get("dynamicArgs").asBoolean()) {
            validateDynamicArgs(functionName, args, funcDef.get("argSpec"), errors);
        } else {
            validateFixedArgs(functionName, args, funcDef.get("args"), errors);
        }
        
        return errors.isEmpty() ? 
            ValidationResult.success() : 
            ValidationResult.error(String.join("; ", errors));
    }

    /**
     * Validate dynamic args function
     */
    private void validateDynamicArgs(String functionName, JsonNode args, 
                                     JsonNode argSpec, List<String> errors) {
        int minArgs = argSpec.get("minArgs").asInt();
        int maxArgs = argSpec.get("maxArgs").asInt();
        int actualArgs = args.size();
        
        if (actualArgs < minArgs || actualArgs > maxArgs) {
            errors.add(String.format("Function %s expects %d-%d arguments, got %d", 
                functionName, minArgs, maxArgs, actualArgs));
        }
        
        // Validate each arg type if specified
        if (argSpec.has("type")) {
            String expectedType = argSpec.get("type").asText();
            for (int i = 0; i < args.size(); i++) {
                JsonNode arg = args.get(i);
                JsonNode value = arg.get("value");
                if (value != null && value.has("returnType")) {
                    String actualType = value.get("returnType").asText();
                    if (!actualType.equals(expectedType)) {
                        errors.add(String.format("Function %s argument %d expects type %s, got %s",
                            functionName, i + 1, expectedType, actualType));
                    }
                }
            }
        }
    }

    /**
     * Validate fixed args function
     */
    private void validateFixedArgs(String functionName, JsonNode args, 
                                   JsonNode argsArray, List<String> errors) {
        if (argsArray == null || !argsArray.isArray()) {
            return;
        }
        
        // Build expected arg list
        List<JsonNode> expectedArgs = new ArrayList<>();
        argsArray.forEach(expectedArgs::add);
        
        // Check arg count
        if (args.size() != expectedArgs.size()) {
            errors.add(String.format("Function %s expects %d arguments, got %d",
                functionName, expectedArgs.size(), args.size()));
            return;
        }
        
        // Validate each argument
        for (int i = 0; i < expectedArgs.size(); i++) {
            JsonNode expectedArg = expectedArgs.get(i);
            String expectedName = expectedArg.get("name").asText();
            String expectedType = expectedArg.get("type").asText();
            
            if (i >= args.size()) break;
            
            JsonNode actualArg = args.get(i);
            String actualName = actualArg.get("name").asText();
            
            // Validate name
            if (!actualName.equals(expectedName)) {
                errors.add(String.format("Function %s argument %d: expected name '%s', got '%s'",
                    functionName, i + 1, expectedName, actualName));
            }
            
            // Validate type
            JsonNode argValue = actualArg.get("value");
            if (argValue != null && argValue.has("returnType")) {
                String actualType = argValue.get("returnType").asText();
                if (!actualType.equals(expectedType)) {
                    errors.add(String.format("Function %s argument '%s' expects type %s, got %s",
                        functionName, actualName, expectedType, actualType));
                }
            }
        }
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
