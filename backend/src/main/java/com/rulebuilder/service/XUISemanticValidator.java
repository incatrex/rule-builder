package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

/**
 * Validates custom x-ui-* semantic rules that are not enforced by JSON Schema.
 * This validator is isolated from the core json-schema-validator and handles
 * business logic specific to the rule builder's custom schema extensions.
 * 
 * Validates:
 * - Expression operators per return type (x-ui-types.validExpressionOperators)
 * - Condition operators per return type (x-ui-types.validConditionOperators)
 * - Function return types (x-ui-functions.returnType)
 * - Operator cardinality (x-ui-operators.cardinality)
 * - Value source restrictions (x-ui-settings)
 */
@Component
public class XUISemanticValidator {
    
    // Expression operators mapped by return type (from x-ui-types.validExpressionOperators)
    private final Map<String, Set<String>> expressionOperatorsByReturnType = new HashMap<>();
    
    // Condition operators mapped by return type (from x-ui-types.validConditionOperators)
    private final Map<String, Set<String>> conditionOperatorsByReturnType = new HashMap<>();
    
    // Operator cardinality info from x-ui-operators
    private final Map<String, JsonNode> operatorCardinality = new HashMap<>();
    
    // Function definitions from x-ui-functions
    private final Map<String, JsonNode> functionDefinitions = new HashMap<>();
    
    private final Set<String> validReturnTypes = new HashSet<>();
    private final Set<String> defaultValueSources = new HashSet<>();
    
    public XUISemanticValidator() throws IOException {
        loadXUIMetadata();
    }
    
    /**
     * Load x-ui-* metadata from the schema file
     */
    private void loadXUIMetadata() throws IOException {
        try (InputStream is = getClass().getResourceAsStream("/static/schemas/rule-schema-current.json")) {
            if (is == null) {
                throw new IOException("Schema file not found");
            }
            
            ObjectMapper mapper = new ObjectMapper();
            JsonNode schema = mapper.readTree(is);
            
            // Navigate to Expression definition to find x-ui-types
            JsonNode definitions = schema.get("definitions");
            if (definitions != null && definitions.has("Expression")) {
                JsonNode expression = definitions.get("Expression");
                JsonNode properties = expression.get("properties");
                
                if (properties != null && properties.has("returnType")) {
                    JsonNode returnTypeNode = properties.get("returnType");
                    JsonNode xuiTypes = returnTypeNode.get("x-ui-types");
                    
                    if (xuiTypes != null && xuiTypes.isObject()) {
                        xuiTypes.fields().forEachRemaining(entry -> {
                            String returnType = entry.getKey();
                            JsonNode typeConfig = entry.getValue();
                            validReturnTypes.add(returnType);
                            
                            // Load valid expression operators for this return type
                            if (typeConfig.has("validExpressionOperators")) {
                                Set<String> operators = new HashSet<>();
                                typeConfig.get("validExpressionOperators").forEach(op -> 
                                    operators.add(op.asText())
                                );
                                expressionOperatorsByReturnType.put(returnType, operators);
                            }
                            
                            // Load valid condition operators for this return type
                            if (typeConfig.has("validConditionOperators")) {
                                Set<String> operators = new HashSet<>();
                                typeConfig.get("validConditionOperators").forEach(op -> 
                                    operators.add(op.asText())
                                );
                                conditionOperatorsByReturnType.put(returnType, operators);
                            }
                        });
                    }
                }
                
                // Load x-ui-functions
                if (properties != null && properties.has("function")) {
                    JsonNode functionNode = properties.get("function");
                    JsonNode functionProps = functionNode.get("properties");
                    if (functionProps != null && functionProps.has("name")) {
                        JsonNode nameNode = functionProps.get("name");
                        JsonNode xuiFunctions = nameNode.get("x-ui-functions");
                        if (xuiFunctions != null && xuiFunctions.isObject()) {
                            xuiFunctions.fields().forEachRemaining(entry -> {
                                functionDefinitions.put(entry.getKey(), entry.getValue());
                            });
                        }
                    }
                }
            }
            
            // Load x-ui-operators (from Condition definition)
            if (definitions != null && definitions.has("Condition")) {
                JsonNode condition = definitions.get("Condition");
                JsonNode properties = condition.get("properties");
                if (properties != null && properties.has("operator")) {
                    JsonNode operatorNode = properties.get("operator");
                    JsonNode xuiOperators = operatorNode.get("x-ui-operators");
                    if (xuiOperators != null && xuiOperators.isObject()) {
                        xuiOperators.fields().forEachRemaining(entry -> {
                            operatorCardinality.put(entry.getKey(), entry.getValue());
                        });
                    }
                }
            }
            
            // Load x-ui-settings
            JsonNode xuiSettings = schema.get("x-ui-settings");
            if (xuiSettings != null && xuiSettings.has("defaultValueSources")) {
                xuiSettings.get("defaultValueSources").forEach(source -> 
                    defaultValueSources.add(source.asText())
                );
            }
        }
    }
    
    /**
     * Validate a rule against x-ui semantic rules
     * 
     * @param ruleJson The rule to validate
     * @return List of validation errors (empty if valid)
     */
    public List<ValidationError> validate(JsonNode ruleJson) {
        List<ValidationError> errors = new ArrayList<>();
        
        if (ruleJson == null || !ruleJson.isObject()) {
            return errors;
        }
        
        // Get structure type to determine validation path
        JsonNode structureNode = ruleJson.get("structure");
        if (structureNode == null) {
            return errors; // Let JSON Schema handle this
        }
        
        String structure = structureNode.asText();
        JsonNode definition = ruleJson.get("definition");
        
        if (definition == null) {
            return errors; // Let JSON Schema handle this
        }
        
        // Validate based on structure type
        switch (structure) {
            case "expression":
                // Can be a single Expression or ExpressionGroup
                if (definition.has("type")) {
                    String defType = definition.get("type").asText();
                    if ("expressionGroup".equals(defType)) {
                        validateExpressionGroup(definition, "$.definition", errors);
                    } else {
                        // Single expression
                        validateExpression(definition, "$.definition", errors);
                    }
                } else if (definition.has("expressions")) {
                    // Array of expressions (legacy structure?)
                    validateExpressions(definition.get("expressions"), "$.definition.expressions", errors);
                }
                break;
            case "condition":
                // Can be either a single Condition, a ConditionGroup, or array of whenClauses
                if (definition.has("conditions")) {
                    // It's a ConditionGroup - validate the conditions array directly
                    validateConditionGroup(definition, "$.definition", errors);
                } else if (definition.has("whenClauses")) {
                    // It's a condition structure with whenClauses (case-like structure)
                    validateConditions(definition.get("whenClauses"), "$.definition.whenClauses", errors);
                } else if (definition.has("ruleRef")) {
                    // It's a single Condition or ConditionGroup backed by ruleRef
                    String defType = definition.has("type") ? definition.get("type").asText() : "condition";
                    validateConditionRuleRef(definition.get("ruleRef"), "$.definition.ruleRef", defType, errors);
                    
                    // Check mutual exclusivity
                    if (definition.has("left") || definition.has("operator") || definition.has("right")) {
                        errors.add(createError(
                            "x-ui-validation",
                            "$.definition",
                            "Condition cannot have both ruleRef and left/operator/right properties",
                            Map.of()
                        ));
                    }
                    if (definition.has("conjunction") || definition.has("conditions")) {
                        errors.add(createError(
                            "x-ui-validation",
                            "$.definition",
                            "ConditionGroup cannot have both ruleRef and conjunction/conditions properties",
                            Map.of()
                        ));
                    }
                } else if (definition.has("left") && definition.has("operator")) {
                    // It's a single Condition
                    validateConditionOperatorAndCardinality(definition, "$.definition", errors);
                    if (definition.has("left")) {
                        validateExpression(definition.get("left"), "$.definition.left", errors);
                    }
                    if (definition.has("right")) {
                        JsonNode right = definition.get("right");
                        if (right != null && !right.isNull()) {
                            if (right.isArray()) {
                                for (int j = 0; j < right.size(); j++) {
                                    validateExpression(right.get(j), "$.definition.right[" + j + "]", errors);
                                }
                            } else if (right.isObject()) {
                                validateExpression(right, "$.definition.right", errors);
                            }
                        }
                    }
                }
                break;
            case "case":
                validateCases(definition.get("whenClauses"), "$.definition.whenClauses", errors);
                break;
        }
        
        return errors;
    }
    
    /**
     * Validate expressions array
     */
    private void validateExpressions(JsonNode expressions, String path, List<ValidationError> errors) {
        if (expressions == null || !expressions.isArray()) {
            return;
        }
        
        for (int i = 0; i < expressions.size(); i++) {
            JsonNode expr = expressions.get(i);
            validateExpression(expr, path + "[" + i + "]", errors);
        }
    }
    
    /**
     * Validate a single expression
     */
    private void validateExpression(JsonNode expr, String path, List<ValidationError> errors) {
        if (expr == null || !expr.isObject()) {
            return;
        }
        
        String type = expr.has("type") ? expr.get("type").asText() : null;
        
        if (type == null) {
            return; // Let JSON Schema handle this
        }
        
        switch (type) {
            case "value":
                validateValueExpression(expr, path, errors);
                break;
            case "field":
                // Field references don't need x-ui validation
                break;
            case "function":
                validateFunctionExpression(expr, path, errors);
                break;
            case "ruleRef":
                // Rule references don't need x-ui validation
                break;
            case "expressionGroup":
                validateExpressionGroup(expr, path, errors);
                break;
        }
    }
    
    /**
     * Validate value expression
     */
    private void validateValueExpression(JsonNode expr, String path, List<ValidationError> errors) {
        // Check if valueSource is valid
        if (expr.has("valueSource")) {
            String valueSource = expr.get("valueSource").asText();
            if (!defaultValueSources.isEmpty() && !defaultValueSources.contains(valueSource)) {
                errors.add(createError(
                    "x-ui-validation",
                    path + ".valueSource",
                    "Invalid value source '" + valueSource + "'. Must be one of: " + defaultValueSources,
                    Map.of("valueSource", valueSource, "allowed", defaultValueSources)
                ));
            }
        }
    }
    
    /**
     * Validate function expression
     */
    private void validateFunctionExpression(JsonNode expr, String path, List<ValidationError> errors) {
        // Get the function node (the actual function definition)
        JsonNode functionNode = expr.get("function");
        if (functionNode == null || !functionNode.isObject()) {
            return; // Let JSON Schema handle this
        }
        
        String functionName = functionNode.has("name") ? functionNode.get("name").asText() : null;
        
        if (functionName == null) {
            return; // Let JSON Schema handle this
        }
        
        JsonNode functionDef = functionDefinitions.get(functionName);
        
        if (functionDef == null) {
            errors.add(createError(
                "x-ui-validation",
                path + ".function.name",
                "Unknown function '" + functionName + "'",
                Map.of("function", functionName)
            ));
            return;
        }
        
        // Validate declared returnType matches function's actual return type
        if (expr.has("returnType") && functionDef.has("returnType")) {
            String declaredReturnType = expr.get("returnType").asText();
            String actualReturnType = functionDef.get("returnType").asText();
            if (!declaredReturnType.equals(actualReturnType)) {
                errors.add(createError(
                    "x-ui-validation",
                    path + ".returnType",
                    "Function '" + functionName + "' returns '" + actualReturnType + 
                    "' but expression declares '" + declaredReturnType + "'",
                    Map.of("function", functionName, "declaredReturnType", declaredReturnType, 
                           "actualReturnType", actualReturnType)
                ));
            }
        }
        
        // Validate arguments structure matches definition
        JsonNode args = functionNode.get("args");
        
        // Check if function uses dynamicArgs (like MATH.ADD)
        if (functionDef.has("dynamicArgs") && functionDef.get("dynamicArgs").asBoolean()) {
            // Validate against argSpec
            if (functionDef.has("argSpec")) {
                JsonNode argSpec = functionDef.get("argSpec");
                int minArgs = argSpec.has("minArgs") ? argSpec.get("minArgs").asInt() : 0;
                int maxArgs = argSpec.has("maxArgs") ? argSpec.get("maxArgs").asInt() : Integer.MAX_VALUE;
                
                if (args == null || !args.isArray()) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".function.args",
                        "Function '" + functionName + "' requires " + minArgs + " to " + maxArgs + " arguments",
                        Map.of("function", functionName, "minArgs", minArgs, "maxArgs", maxArgs)
                    ));
                } else {
                    int actualArgs = args.size();
                    if (actualArgs < minArgs || actualArgs > maxArgs) {
                        errors.add(createError(
                            "x-ui-validation",
                            path + ".function.args",
                            "Function '" + functionName + "' requires " + minArgs + " to " + maxArgs + 
                            " arguments but got " + actualArgs,
                            Map.of("function", functionName, "minArgs", minArgs, "maxArgs", maxArgs, 
                                   "actualArgs", actualArgs)
                        ));
                    }
                    // Note: Dynamic args functions don't validate argument names or order
                }
            }
        } else {
            // Fixed args - validate exact count, names, and order
            JsonNode requiredArgs = functionDef.get("args");
            
            if (requiredArgs != null && requiredArgs.isArray()) {
                if (args == null || !args.isArray()) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".function.args",
                        "Function '" + functionName + "' requires " + requiredArgs.size() + " arguments",
                        Map.of("function", functionName, "expectedArgs", requiredArgs.size())
                    ));
                } else if (args.size() != requiredArgs.size()) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".function.args",
                        "Function '" + functionName + "' requires " + requiredArgs.size() + 
                        " arguments but got " + args.size(),
                        Map.of("function", functionName, "expectedArgs", requiredArgs.size(), 
                               "actualArgs", args.size())
                    ));
                } else {
                    // Validate argument names and order
                    for (int i = 0; i < requiredArgs.size(); i++) {
                        JsonNode expectedArg = requiredArgs.get(i);
                        JsonNode actualArg = args.get(i);
                        
                        String expectedName = expectedArg.has("name") ? expectedArg.get("name").asText() : null;
                        String actualName = actualArg.has("name") ? actualArg.get("name").asText() : null;
                        
                        if (expectedName != null && actualName != null) {
                            // Check if the name matches
                            if (!expectedName.equals(actualName)) {
                                errors.add(createError(
                                    "x-ui-validation",
                                    path + ".function.args[" + i + "].name",
                                    "Argument at position " + i + " should be named '" + expectedName + 
                                    "' but got '" + actualName + "'",
                                    Map.of("function", functionName, "position", i, 
                                           "expectedName", expectedName, "actualName", actualName)
                                ));
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Validate expression group
     */
    private void validateExpressionGroup(JsonNode expr, String path, List<ValidationError> errors) {
        String returnType = expr.has("returnType") ? expr.get("returnType").asText() : null;
        JsonNode expressions = expr.get("expressions");
        JsonNode operators = expr.get("operators");
        
        if (returnType == null) {
            return; // Let JSON Schema handle this
        }
        
        // Validate operators in the operators array against return type
        if (operators != null && operators.isArray()) {
            Set<String> validOps = expressionOperatorsByReturnType.get(returnType);
            
            // Check if this return type even allows expression operators
            if (validOps == null) {
                // Return type not found in x-ui-types
                errors.add(createError(
                    "x-ui-validation",
                    path + ".returnType",
                    "Unknown return type '" + returnType + "' for expression validation",
                    Map.of("returnType", returnType)
                ));
                return; // Can't validate operators without knowing valid ones
            }
            
            if (validOps.isEmpty()) {
                // Return type exists but has no valid expression operators (e.g., date)
                errors.add(createError(
                    "x-ui-validation",
                    path + ".operators",
                    "Return type '" + returnType + "' does not support expression operators",
                    Map.of("returnType", returnType)
                ));
            } else {
                // Validate each operator
                for (int i = 0; i < operators.size(); i++) {
                    String op = operators.get(i).asText();
                    if (!validOps.contains(op) && !isValidExpressionOperatorSymbol(op, validOps)) {
                        errors.add(createError(
                            "x-ui-validation",
                            path + ".operators[" + i + "]",
                            "Operator '" + op + "' is not valid for return type '" + returnType + "'",
                            Map.of("operator", op, "returnType", returnType, "validOperators", validOps)
                        ));
                    }
                }
            }
        }
        
        // Recursively validate nested expressions
        validateExpressions(expressions, path + ".expressions", errors);
    }
    
    /**
     * Check if an operator symbol matches valid expression operators
     * Maps symbols like "+", "-", "*", "/" to operator names like "add", "subtract", etc.
     */
    private boolean isValidExpressionOperatorSymbol(String symbol, Set<String> validOperators) {
        Map<String, String> symbolToName = Map.of(
            "+", "add",
            "-", "subtract", 
            "*", "multiply",
            "/", "divide",
            "&", "concat",
            "&&", "and",
            "||", "or"
        );
        
        String operatorName = symbolToName.get(symbol);
        return operatorName != null && validOperators.contains(operatorName);
    }
    
    /**
     * Validate conditions array
     */
    private void validateConditions(JsonNode whenClauses, String path, List<ValidationError> errors) {
        if (whenClauses == null || !whenClauses.isArray()) {
            return;
        }
        
        for (int i = 0; i < whenClauses.size(); i++) {
            JsonNode clause = whenClauses.get(i);
            if (clause.has("when")) {
                validateConditionGroup(clause.get("when"), path + "[" + i + "].when", errors);
            }
            if (clause.has("then")) {
                validateExpressions(clause.get("then"), path + "[" + i + "].then", errors);
            }
        }
    }
    
    /**
     * Validate condition group
     */
    private void validateConditionGroup(JsonNode conditionGroup, String path, List<ValidationError> errors) {
        if (conditionGroup == null || !conditionGroup.isObject()) {
            return;
        }
        
        // Check if using ruleRef
        if (conditionGroup.has("ruleRef")) {
            validateConditionRuleRef(conditionGroup.get("ruleRef"), path + ".ruleRef", "conditionGroup", errors);
            
            // Ensure mutual exclusivity
            if (conditionGroup.has("conjunction") || conditionGroup.has("conditions")) {
                errors.add(createError(
                    "x-ui-validation",
                    path,
                    "ConditionGroup cannot have both ruleRef and conjunction/conditions properties",
                    Map.of()
                ));
            }
            return; // Don't validate manual properties if using ruleRef
        }
        
        JsonNode conditions = conditionGroup.get("conditions");
        if (conditions != null && conditions.isArray()) {
            for (int i = 0; i < conditions.size(); i++) {
                JsonNode condition = conditions.get(i);
                String condPath = path + ".conditions[" + i + "]";
                
                // Check if this condition/group uses ruleRef
                if (condition.has("ruleRef")) {
                    String condType = condition.has("type") ? condition.get("type").asText() : "unknown";
                    validateConditionRuleRef(condition.get("ruleRef"), condPath + ".ruleRef", condType, errors);
                    
                    // Check mutual exclusivity
                    if (condition.has("left") || condition.has("operator") || condition.has("right")) {
                        errors.add(createError(
                            "x-ui-validation",
                            condPath,
                            "Condition cannot have both ruleRef and left/operator/right properties",
                            Map.of()
                        ));
                    }
                    if (condition.has("conjunction") || condition.has("conditions")) {
                        errors.add(createError(
                            "x-ui-validation",
                            condPath,
                            "ConditionGroup cannot have both ruleRef and conjunction/conditions properties",
                            Map.of()
                        ));
                    }
                    // Skip manual validation for this condition/group
                    continue;
                }
                
                // Check if it's a nested condition group
                if (condition.has("conditions")) {
                    validateConditionGroup(condition, condPath, errors);
                } else {
                    // Validate operator and cardinality
                    validateConditionOperatorAndCardinality(condition, condPath, errors);
                    
                    // Validate nested expressions
                    if (condition.has("left")) {
                        validateExpression(condition.get("left"), condPath + ".left", errors);
                    }
                    if (condition.has("right")) {
                        JsonNode right = condition.get("right");
                        // right can be a single expression, array of expressions, or null
                        if (right != null && !right.isNull()) {
                            if (right.isArray()) {
                                for (int j = 0; j < right.size(); j++) {
                                    validateExpression(right.get(j), condPath + ".right[" + j + "]", errors);
                                }
                            } else if (right.isObject()) {
                                validateExpression(right, condPath + ".right", errors);
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Validate rule reference in condition context
     */
    private void validateConditionRuleRef(JsonNode ruleRef, String path, String context, List<ValidationError> errors) {
        if (ruleRef == null || !ruleRef.isObject()) {
            return;
        }
        
        // Check return type is boolean
        if (!ruleRef.has("returnType")) {
            errors.add(createError(
                "x-ui-validation",
                path + ".returnType",
                "Rule reference in " + context + " context must have returnType property",
                Map.of("context", context)
            ));
            return;
        }
        
        String returnType = ruleRef.get("returnType").asText();
        if (!"boolean".equals(returnType)) {
            errors.add(createError(
                "x-ui-validation",
                path + ".returnType",
                "Rule references in " + context + " context must return boolean, got: " + returnType,
                Map.of("expectedType", "boolean", "actualType", returnType, "context", context)
            ));
        }
    }
    
    /**
     * Validate condition operator and cardinality
     */
    private void validateConditionOperatorAndCardinality(JsonNode condition, String path, List<ValidationError> errors) {
        if (!condition.has("operator")) {
            return;
        }
        
        String operator = condition.get("operator").asText();
        JsonNode right = condition.get("right");
        
        // Get cardinality info for this operator
        JsonNode cardinalityInfo = operatorCardinality.get(operator);
        if (cardinalityInfo == null) {
            return; // Unknown operator, let JSON Schema handle it
        }
        
        // Check cardinality
        if (cardinalityInfo.has("cardinality")) {
            int expectedCardinality = cardinalityInfo.get("cardinality").asInt();
            
            if (expectedCardinality == 0) {
                // Operators like is_empty, is_not_empty - right should be null
                if (right != null && !right.isNull()) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".right",
                        "Operator '" + operator + "' should have null as right operand (no value expected)",
                        Map.of("operator", operator)
                    ));
                }
            } else if (expectedCardinality == 1) {
                // Single value operators - right should be a single expression
                if (right == null || right.isNull()) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".right",
                        "Operator '" + operator + "' requires a right operand",
                        Map.of("operator", operator)
                    ));
                } else if (right.isArray()) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".right",
                        "Operator '" + operator + "' requires a single value, not an array",
                        Map.of("operator", operator)
                    ));
                }
            } else if (expectedCardinality == 2) {
                // Operators like between, not_between - right should be array of 2
                if (right == null || !right.isArray()) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".right",
                        "Operator '" + operator + "' requires an array of 2 values",
                        Map.of("operator", operator, "expectedCardinality", 2)
                    ));
                } else if (right.size() != 2) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".right",
                        "Operator '" + operator + "' requires exactly 2 values but got " + right.size(),
                        Map.of("operator", operator, "expectedCardinality", 2, "actualCardinality", right.size())
                    ));
                }
            }
        }
        
        // Check min/max cardinality for operators like 'in', 'not_in'
        if (cardinalityInfo.has("minCardinality") || cardinalityInfo.has("maxCardinality")) {
            int minCard = cardinalityInfo.has("minCardinality") ? cardinalityInfo.get("minCardinality").asInt() : 0;
            int maxCard = cardinalityInfo.has("maxCardinality") ? cardinalityInfo.get("maxCardinality").asInt() : Integer.MAX_VALUE;
            
            if (right == null || !right.isArray()) {
                errors.add(createError(
                    "x-ui-validation",
                    path + ".right",
                    "Operator '" + operator + "' requires an array of " + minCard + " to " + maxCard + " values",
                    Map.of("operator", operator, "minCardinality", minCard, "maxCardinality", maxCard)
                ));
            } else {
                int actualSize = right.size();
                if (actualSize < minCard || actualSize > maxCard) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".right",
                        "Operator '" + operator + "' requires " + minCard + " to " + maxCard + 
                        " values but got " + actualSize,
                        Map.of("operator", operator, "minCardinality", minCard, "maxCardinality", maxCard, 
                               "actualCardinality", actualSize)
                    ));
                }
            }
        }
        
        // Validate operator is valid for the left expression's return type
        if (condition.has("left")) {
            JsonNode left = condition.get("left");
            String returnType = getExpressionReturnType(left);
            if (returnType != null) {
                Set<String> validOps = conditionOperatorsByReturnType.get(returnType);
                if (validOps != null && !validOps.contains(operator)) {
                    errors.add(createError(
                        "x-ui-validation",
                        path + ".operator",
                        "Operator '" + operator + "' is not valid for return type '" + returnType + "'",
                        Map.of("operator", operator, "returnType", returnType, "validOperators", validOps)
                    ));
                }
            }
        }
    }
    
    /**
     * Get the return type of an expression
     */
    private String getExpressionReturnType(JsonNode expr) {
        if (expr == null || !expr.isObject()) {
            return null;
        }
        
        if (expr.has("returnType")) {
            return expr.get("returnType").asText();
        }
        
        // Try to infer from type
        String type = expr.has("type") ? expr.get("type").asText() : null;
        if ("function".equals(type) && expr.has("function")) {
            JsonNode funcNode = expr.get("function");
            if (funcNode.has("name")) {
                String functionName = funcNode.get("name").asText();
                JsonNode funcDef = functionDefinitions.get(functionName);
                if (funcDef != null && funcDef.has("returnType")) {
                    return funcDef.get("returnType").asText();
                }
            }
        }
        
        return null;
    }
    
    /**
     * Validate cases array (similar to conditions but different structure)
     */
    private void validateCases(JsonNode whenClauses, String path, List<ValidationError> errors) {
        // Cases have same structure as conditions for validation purposes
        validateConditions(whenClauses, path, errors);
    }
    
    /**
     * Create a validation error
     */
    private ValidationError createError(String type, String path, String message, Map<String, Object> details) {
        ValidationError error = new ValidationError();
        error.setType(type);
        error.setPath(path);
        error.setMessage(message);
        error.setDetails(details);
        return error;
    }
}
