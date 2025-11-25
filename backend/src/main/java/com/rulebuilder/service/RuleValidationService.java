package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.*;
import com.rulebuilder.validation.OperatorValidator;
import com.rulebuilder.validation.FunctionValidator;
import com.rulebuilder.validation.ExpressionOperatorValidator;
import com.rulebuilder.validation.SchemaMetadataExtractor;
import com.rulebuilder.validation.PathContext;
import com.rulebuilder.validation.ValidationConfig;
import com.rulebuilder.validation.ValidationError;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Enhanced service for comprehensive rule validation
 * Validates against JSON Schema and business logic rules
 */
@Service
public class RuleValidationService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SchemaMetadataExtractor metadataExtractor;
    private final OperatorValidator operatorValidator;
    private final FunctionValidator functionValidator;
    private final ExpressionOperatorValidator expressionOperatorValidator;
    private JsonSchema schema;

    public RuleValidationService(
            SchemaMetadataExtractor metadataExtractor,
            OperatorValidator operatorValidator,
            FunctionValidator functionValidator,
            ExpressionOperatorValidator expressionOperatorValidator
    ) {
        this.metadataExtractor = metadataExtractor;
        this.operatorValidator = operatorValidator;
        this.functionValidator = functionValidator;
        this.expressionOperatorValidator = expressionOperatorValidator;
        
        try {
            loadSchema();
        } catch (IOException e) {
            throw new RuntimeException("Failed to load validation schema", e);
        }
    }

    /**
     * Main validation entry point - validates rule with default configuration
     * 
     * @param rule The rule data to validate
     * @return ValidationResult containing errors, warnings, and metadata
     */
    public com.rulebuilder.validation.ValidationResult validateRule(JsonNode rule) {
        return validateRule(rule, ValidationConfig.defaultConfig());
    }

    /**
     * Validate a rule with custom configuration
     * 
     * @param rule The rule data to validate
     * @param config Validation configuration
     * @return ValidationResult containing errors, warnings, and metadata
     */
    public com.rulebuilder.validation.ValidationResult validateRule(JsonNode rule, ValidationConfig config) {
        long startTime = System.currentTimeMillis();
        com.rulebuilder.validation.ValidationResult result = 
                new com.rulebuilder.validation.ValidationResult(metadataExtractor.getSchemaVersion());
        PathContext context = new PathContext();
        
        // Layer 1: JSON Schema validation
        List<ValidationError> schemaErrors = performSchemaValidation(rule);
        result.addErrors(schemaErrors);
        
        if (config.isStopOnFirstError() && result.hasCriticalErrors()) {
            finishValidation(result, startTime, 0);
            return result;
        }
        
        // Layer 2: Business logic validation
        try {
            if (!rule.has("structure") || !rule.has("definition")) {
                finishValidation(result, startTime, 0);
                return result; // Schema errors will be reported
            }
            
            String structure = rule.get("structure").asText();
            JsonNode definition = rule.get("definition");
            
            context.push("definition", "Rule Definition");
            
            int fieldCount = 0;
            
            switch (structure) {
                case "condition":
                    fieldCount = validateConditionStructure(definition, context, result, config);
                    break;
                case "expression":
                    fieldCount = validateExpressionStructure(definition, context, result, config);
                    break;
                case "case":
                    fieldCount = validateCaseStructure(definition, context, result, config);
                    break;
            }
            
            context.pop();
            
            // Add line numbers to all errors that don't have them yet
            addLineNumbersToErrors(result, rule);
            
            finishValidation(result, startTime, fieldCount);
            
        } catch (Exception e) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("INTERNAL_VALIDATION_ERROR")
                    .message("Unexpected error during validation: " + e.getMessage())
                    .path(context.getJsonPath())
                    .humanPath(context.getHumanPath())
                    .build();
            result.addError(error);
            finishValidation(result, startTime, 0);
        }
        
        return result;
    }

    /**
     * Perform JSON Schema validation
     */
    private List<ValidationError> performSchemaValidation(JsonNode rule) {
        List<ValidationError> errors = new ArrayList<>();
        
        if (schema == null) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("SCHEMA_NOT_LOADED")
                    .message("Validation schema not loaded")
                    .path("")
                    .humanPath("Schema")
                    .build();
            errors.add(error);
            return errors;
        }

        Set<ValidationMessage> validationMessages = schema.validate(rule);
        
        // Convert to our error format with line numbers
        List<ValidationError> allErrors = new ArrayList<>();
        for (ValidationMessage message : validationMessages) {
            String errorCode = determineErrorCode(message);
            String path = message.getPath() != null ? message.getPath() : "";
            String[] pathParts = path.split("\\.");
            String field = pathParts.length > 0 ? pathParts[pathParts.length - 1] : "";
            
            // Calculate line number for this error
            Integer lineNumber = calculateLineNumber(rule, path);
            
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code(errorCode)
                    .message(message.getMessage())
                    .path(path)
                    .humanPath(path)
                    .field(field)
                    .lineNumber(lineNumber)
                    .build();
            allErrors.add(error);
        }
        
        // Filter out redundant oneOf errors - keep only the most informative ones
        List<ValidationError> filtered = filterRedundantErrors(allErrors);
        
        // Enhance error messages to be more user-friendly
        return enhanceErrorMessages(filtered, rule);
    }
    
    /**
     * Enhance error messages to be more user-friendly and actionable
     */
    private List<ValidationError> enhanceErrorMessages(List<ValidationError> errors, JsonNode rule) {
        List<ValidationError> enhanced = new ArrayList<>();
        
        for (ValidationError error : errors) {
            String message = error.getMessage();
            String path = error.getPath();
            
            // Enhance "should be valid to one and only one schema" errors
            if (message.contains("should be valid to one and only one schema")) {
                ValidationError enhancedError = enhanceOneOfError(error, path, rule);
                enhanced.add(enhancedError);
            } else {
                enhanced.add(error);
            }
        }
        
        return enhanced;
    }
    
    /**
     * Enhance oneOf validation errors with specific guidance
     */
    private ValidationError enhanceOneOfError(ValidationError error, String path, JsonNode rule) {
        // Get the node at this path
        JsonNode node = getNodeAtPath(rule, path);
        
        if (node == null || !node.isObject()) {
            return buildEnhancedError("INVALID_STRUCTURE",
                                    "Invalid structure at this location",
                                    error, path, null, null,
                                    "Expected an object but found something else.");
        }
        
        // Define expected fields for each type
        Map<String, List<String>> expectedFieldsByType = new HashMap<>();
        expectedFieldsByType.put("condition", Arrays.asList("type", "returnType", "name", "id", "left", "operator", "right"));
        expectedFieldsByType.put("conditionGroup", Arrays.asList("type", "returnType", "name", "conjunction", "not", "conditions"));
        expectedFieldsByType.put("field", Arrays.asList("type", "returnType", "field"));
        expectedFieldsByType.put("value", Arrays.asList("type", "returnType", "value"));
        expectedFieldsByType.put("function", Arrays.asList("type", "returnType", "function"));
        expectedFieldsByType.put("ruleRef", Arrays.asList("type", "returnType", "id", "uuid", "version"));
        expectedFieldsByType.put("expressionGroup", Arrays.asList("type", "returnType", "expressions", "operators"));
        
        String typeValue = node.has("type") ? node.get("type").asText() : null;
        
        // First, check for unexpected field names (typos)
        if (typeValue != null && expectedFieldsByType.containsKey(typeValue)) {
            List<String> expectedFields = expectedFieldsByType.get(typeValue);
            List<String> unexpectedFields = new ArrayList<>();
            List<String> actualFields = new ArrayList<>();
            
            node.fieldNames().forEachRemaining(actualFields::add);
            
            for (String actualField : actualFields) {
                if (!expectedFields.contains(actualField)) {
                    unexpectedFields.add(actualField);
                }
            }
            
            if (!unexpectedFields.isEmpty()) {
                String unexpectedField = unexpectedFields.get(0);
                String suggestion = findClosestMatch(unexpectedField, expectedFields);
                
                return buildEnhancedError("INVALID_FIELD_NAME",
                                        String.format("Unexpected field '%s' for type '%s'", unexpectedField, typeValue),
                                        error, path, unexpectedField, unexpectedField,
                                        suggestion != null ? 
                                            String.format("Did you mean '%s'? Valid fields for '%s': %s", 
                                                        suggestion, typeValue, String.join(", ", expectedFields)) :
                                            String.format("Valid fields for '%s': %s", typeValue, String.join(", ", expectedFields)));
            }
        }
        
        // Check for invalid type value
        if (typeValue != null) {
            List<String> validTypes = Arrays.asList("condition", "conditionGroup", "value", 
                                                   "field", "function", "ruleRef", "expressionGroup");
            
            if (!validTypes.contains(typeValue)) {
                String suggestion = findClosestMatch(typeValue, validTypes);
                
                return buildEnhancedError("INVALID_FIELD_VALUE", 
                                        String.format("Invalid value '%s' for field 'type'", typeValue),
                                        error, path, "type", typeValue, 
                                        suggestion != null ?
                                            String.format("Did you mean '%s'? Valid types: %s", suggestion, String.join(", ", validTypes)) :
                                            String.format("Valid types: %s", String.join(", ", validTypes)));
            }
            
            // Type is valid, check for missing required fields
            List<String> missingFields = new ArrayList<>();
            
            switch (typeValue) {
                case "condition":
                    if (!node.has("left")) missingFields.add("left");
                    if (!node.has("operator")) missingFields.add("operator");
                    if (!node.has("right")) missingFields.add("right");
                    break;
                    
                case "conditionGroup":
                    if (!node.has("conjunction")) missingFields.add("conjunction");
                    if (!node.has("not")) missingFields.add("not");
                    if (!node.has("conditions")) missingFields.add("conditions");
                    break;
                    
                case "field":
                    if (!node.has("field")) missingFields.add("field");
                    if (!node.has("returnType")) missingFields.add("returnType");
                    break;
                    
                case "value":
                    if (!node.has("value")) missingFields.add("value");
                    if (!node.has("returnType")) missingFields.add("returnType");
                    break;
                    
                case "function":
                    if (!node.has("function")) missingFields.add("function");
                    if (!node.has("returnType")) missingFields.add("returnType");
                    break;
                    
                case "expressionGroup":
                    if (!node.has("expressions")) missingFields.add("expressions");
                    if (!node.has("operators")) missingFields.add("operators");
                    if (!node.has("returnType")) missingFields.add("returnType");
                    break;
            }
            
            if (!missingFields.isEmpty()) {
                String fieldName = missingFields.get(0);
                
                return buildEnhancedError("MISSING_REQUIRED_FIELD",
                                        String.format("Missing required field '%s' for type '%s'", fieldName, typeValue),
                                        error, path, fieldName, null,
                                        String.format("A '%s' type requires: %s", typeValue, String.join(", ", missingFields)));
            }
        } else {
            // No type field at all
            return buildEnhancedError("MISSING_REQUIRED_FIELD",
                                    "Missing required field 'type'",
                                    error, path, "type", null,
                                    "Every condition, expression, or group must have a 'type' field");
        }
        
        // Fallback
        return buildEnhancedError("INVALID_STRUCTURE",
                                "Invalid structure - check for missing or invalid fields",
                                error, path, null, null,
                                "Use RuleBuilder UI to ensure correct structure.");
    }
    
    /**
     * Find the closest matching string using Levenshtein distance (simple typo detection)
     */
    private String findClosestMatch(String input, List<String> candidates) {
        if (input == null || candidates == null || candidates.isEmpty()) {
            return null;
        }
        
        String closest = null;
        int minDistance = Integer.MAX_VALUE;
        
        for (String candidate : candidates) {
            int distance = levenshteinDistance(input.toLowerCase(), candidate.toLowerCase());
            if (distance < minDistance && distance <= 3) { // Only suggest if within 3 edits
                minDistance = distance;
                closest = candidate;
            }
        }
        
        return closest;
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        
        for (int i = 0; i <= s1.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= s2.length(); j++) {
            dp[0][j] = j;
        }
        
        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(
                    dp[i - 1][j] + 1,      // deletion
                    dp[i][j - 1] + 1),     // insertion
                    dp[i - 1][j - 1] + cost // substitution
                );
            }
        }
        
        return dp[s1.length()][s2.length()];
    }
    
    /**
     * Helper to build enhanced error with consistent structure
     */
    private ValidationError buildEnhancedError(String code, String message, ValidationError originalError,
                                              String path, String fieldName, String actualValue, String suggestion) {
        String humanPath = makePathHumanReadable(path);
        Integer lineNumber = originalError.getLineNumber();
        
        // Add line number to message if available
        String enhancedMessage = message;
        if (lineNumber != null) {
            enhancedMessage = String.format("[Line %d] %s", lineNumber, message);
        }
        
        return ValidationError.builder()
                .severity(originalError.getSeverity())
                .code(code)
                .message(enhancedMessage)
                .path(originalError.getPath())
                .humanPath(humanPath)
                .field(fieldName)
                .actualValue(actualValue)
                .suggestion(suggestion)
                .lineNumber(lineNumber)
                .build();
    }
    
    /**
     * Make JSON path more human-readable
     */
    private String makePathHumanReadable(String path) {
        if (path == null || path.isEmpty()) {
            return "Root";
        }
        
        // Convert $.definition.conditions[0].left to "Definition → Condition 1 → Left"
        String readable = path.replace("$.", "")
                             .replace(".definition", "Definition")
                             .replace(".conditions[", " → Condition ")
                             .replace(".left", " → Left")
                             .replace(".right", " → Right")
                             .replace(".operator", " → Operator")
                             .replace("]", "");
        
        // Increment array indices by 1 for human readability
        StringBuilder result = new StringBuilder();
        int i = 0;
        while (i < readable.length()) {
            char c = readable.charAt(i);
            if (Character.isDigit(c)) {
                StringBuilder num = new StringBuilder();
                while (i < readable.length() && Character.isDigit(readable.charAt(i))) {
                    num.append(readable.charAt(i));
                    i++;
                }
                int value = Integer.parseInt(num.toString());
                result.append(value + 1);
            } else {
                result.append(c);
                i++;
            }
        }
        
        return result.toString();
    }
    
    /**
     * Get a JsonNode at a specific JSON path
     */
    private JsonNode getNodeAtPath(JsonNode root, String path) {
        if (root == null || path == null || path.isEmpty() || path.equals("$")) {
            return root;
        }
        
        // Remove leading $. if present
        String cleanPath = path.startsWith("$.") ? path.substring(2) : path;
        
        JsonNode current = root;
        String[] parts = cleanPath.split("\\.");
        
        for (String part : parts) {
            if (current == null) {
                return null;
            }
            
            // Handle array indices like "conditions[0]"
            if (part.contains("[")) {
                String fieldName = part.substring(0, part.indexOf("["));
                String indexStr = part.substring(part.indexOf("[") + 1, part.indexOf("]"));
                
                current = current.get(fieldName);
                if (current != null && current.isArray()) {
                    try {
                        int index = Integer.parseInt(indexStr);
                        current = current.get(index);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                }
            } else {
                current = current.get(part);
            }
        }
        
        return current;
    }
    
    /**
     * Filter redundant validation errors to show only root causes
     * 
     * When a field has an invalid value (e.g., type="field2"), the schema validator
     * tries all possible oneOf branches and reports failures for each. This creates
     * an error avalanche. We filter to show only the primary error.
     */
    private List<ValidationError> filterRedundantErrors(List<ValidationError> errors) {
        if (errors.isEmpty()) {
            return errors;
        }
        
        List<ValidationError> filtered = new ArrayList<>();
        
        // Group errors by path
        Map<String, List<ValidationError>> errorsByPath = new HashMap<>();
        for (ValidationError error : errors) {
            String path = error.getPath();
            errorsByPath.computeIfAbsent(path, k -> new ArrayList<>()).add(error);
        }
        
        for (List<ValidationError> pathErrors : errorsByPath.values()) {
            // If there's only one error for this path, keep it
            if (pathErrors.size() == 1) {
                filtered.add(pathErrors.get(0));
                continue;
            }
            
            // Look for the most specific/actionable error
            ValidationError bestError = findMostActionableError(pathErrors);
            
            // Check if this is part of a oneOf cascade
            boolean isOneOfCascade = pathErrors.stream()
                    .anyMatch(e -> e.getMessage().contains("should be valid to one and only one schema"));
            
            if (isOneOfCascade) {
                // For oneOf cascades, keep only:
                // 1. The invalid enum error (tells user what valid values are)
                // 2. OR the "does not have a value in enumeration" error
                // Skip all the "must be constant value X" and "missing required field" errors
                Optional<ValidationError> enumError = pathErrors.stream()
                        .filter(e -> e.getCode().equals("INVALID_ENUM_VALUE"))
                        .findFirst();
                
                if (enumError.isPresent()) {
                    filtered.add(enumError.get());
                } else {
                    // If no enum error, just keep the oneOf error itself
                    Optional<ValidationError> oneOfError = pathErrors.stream()
                            .filter(e -> e.getMessage().contains("should be valid to one and only one schema"))
                            .findFirst();
                    oneOfError.ifPresent(filtered::add);
                }
            } else {
                // Not a oneOf cascade, keep the best error
                filtered.add(bestError);
            }
        }
        
        // Remove parent-level oneOf errors if we have child-level errors
        // Example: If we report "$.definition.left.type: invalid enum", 
        // don't also report "$.definition.left: should be valid to one and only one"
        List<ValidationError> finalFiltered = new ArrayList<>();
        Set<String> childPaths = filtered.stream()
                .map(ValidationError::getPath)
                .collect(Collectors.toSet());
        
        for (ValidationError error : filtered) {
            if (error.getMessage().contains("should be valid to one and only one schema")) {
                // Check if we have a more specific child error
                String errorPath = error.getPath();
                boolean hasMoreSpecificChild = childPaths.stream()
                        .anyMatch(p -> p.startsWith(errorPath + ".") || p.startsWith(errorPath + "["));
                
                if (!hasMoreSpecificChild) {
                    finalFiltered.add(error);
                }
            } else {
                finalFiltered.add(error);
            }
        }
        
        return finalFiltered;
    }
    
    /**
     * Find the most actionable error from a list of errors for the same path
     */
    private ValidationError findMostActionableError(List<ValidationError> errors) {
        // Priority order: INVALID_ENUM_VALUE > PATTERN_MISMATCH > MISSING_REQUIRED_FIELD > others
        for (ValidationError error : errors) {
            if ("INVALID_ENUM_VALUE".equals(error.getCode())) {
                return error;
            }
        }
        
        for (ValidationError error : errors) {
            if ("PATTERN_MISMATCH".equals(error.getCode())) {
                return error;
            }
        }
        
        for (ValidationError error : errors) {
            if ("MISSING_REQUIRED_FIELD".equals(error.getCode())) {
                return error;
            }
        }
        
        return errors.get(0);
    }

    /**
     * Determine error code from schema validation message
     */
    private String determineErrorCode(ValidationMessage message) {
        String type = message.getType();
        
        if (type != null) {
            if (type.equals("required")) return "MISSING_REQUIRED_FIELD";
            if (type.equals("type")) return "INVALID_TYPE";
            if (type.equals("enum")) return "INVALID_ENUM_VALUE";
            if (type.equals("pattern")) return "PATTERN_MISMATCH";
            if (type.equals("minItems")) return "ARRAY_TOO_SHORT";
            if (type.equals("maxItems")) return "ARRAY_TOO_LONG";
            if (type.equals("minimum")) return "NUMBER_TOO_SMALL";
            if (type.equals("additionalProperties")) return "ADDITIONAL_PROPERTY";
        }
        
        return "SCHEMA_VALIDATION_ERROR";
    }

    /**
     * Validate condition structure (can be Condition or ConditionGroup)
     */
    private int validateConditionStructure(
            JsonNode definition,
            PathContext context,
            com.rulebuilder.validation.ValidationResult result,
            ValidationConfig config
    ) {
        if (isConditionGroup(definition)) {
            return validateConditionGroup(definition, context, result, config);
        } else {
            return validateCondition(definition, context, result, config);
        }
    }

    /**
     * Validate a condition group
     */
    private int validateConditionGroup(
            JsonNode group,
            PathContext context,
            com.rulebuilder.validation.ValidationResult result,
            ValidationConfig config
    ) {
        int fieldCount = 1;
        String name = group.has("name") ? group.get("name").asText() : "Unnamed Group";
        context.push("", String.format("Condition Group '%s'", name));
        
        if (!group.has("conditions")) {
            context.pop();
            return fieldCount;
        }
        
        JsonNode conditions = group.get("conditions");
        
        // Warning for empty condition groups
        if (conditions.size() == 0 && config.isIncludeWarnings()) {
            ValidationError warning = ValidationError.builder()
                    .severity("warning")
                    .code("EMPTY_CONDITION_GROUP")
                    .message(String.format("Condition group '%s' has no conditions", name))
                    .path(context.getJsonPath() + ".conditions")
                    .humanPath(context.getHumanPath() + " → Conditions")
                    .suggestion("Add at least one condition to the group")
                    .build();
            result.addWarning(warning);
        }
        
        // Validate each condition
        for (int i = 0; i < conditions.size(); i++) {
            JsonNode condition = conditions.get(i);
            context.push(
                    String.format("conditions[%d]", i),
                    String.format("Item %d of %d", i + 1, conditions.size())
            );
            
            if (isConditionGroup(condition)) {
                fieldCount += validateConditionGroup(condition, context, result, config);
            } else {
                fieldCount += validateCondition(condition, context, result, config);
            }
            
            context.pop();
        }
        
        context.pop();
        return fieldCount;
    }

    /**
     * Validate a single condition
     */
    private int validateCondition(
            JsonNode condition,
            PathContext context,
            com.rulebuilder.validation.ValidationResult result,
            ValidationConfig config
    ) {
        int fieldCount = 1;
        String name = condition.has("name") ? condition.get("name").asText() : "Unnamed Condition";
        context.push("", String.format("Condition '%s'", name));
        
        // Validate operator compatibility
        result.addErrors(operatorValidator.validateCondition(condition, context));
        
        // Validate left side
        if (condition.has("left")) {
            JsonNode left = condition.get("left");
            context.push("left", "Left Side");
            fieldCount += validateExpression(left, null, context, result, config);
            context.pop();
        }
        
        // Validate right side
        if (condition.has("right")) {
            JsonNode right = condition.get("right");
            if (right != null && !right.isNull()) {
                context.push("right", "Right Side");
                if (right.isArray()) {
                    for (int i = 0; i < right.size(); i++) {
                        context.push(
                                String.format("[%d]", i),
                                String.format("Expression %d of %d", i + 1, right.size())
                        );
                        fieldCount += validateExpression(right.get(i), null, context, result, config);
                        context.pop();
                    }
                } else {
                    fieldCount += validateExpression(right, null, context, result, config);
                }
                context.pop();
            }
        }
        
        context.pop();
        return fieldCount;
    }

    /**
     * Validate expression structure (can be Expression or ExpressionGroup)
     */
    private int validateExpressionStructure(
            JsonNode definition,
            PathContext context,
            com.rulebuilder.validation.ValidationResult result,
            ValidationConfig config
    ) {
        if (isExpressionGroup(definition)) {
            return validateExpressionGroup(definition, context, result, config);
        } else {
            return validateExpression(definition, null, context, result, config);
        }
    }

    /**
     * Validate a single expression
     */
    private int validateExpression(
            JsonNode expression,
            String expectedReturnType,
            PathContext context,
            com.rulebuilder.validation.ValidationResult result,
            ValidationConfig config
    ) {
        int fieldCount = 1;
        
        if (isExpressionGroup(expression)) {
            return validateExpressionGroup(expression, context, result, config);
        }
        
        if (!expression.has("type")) {
            return fieldCount;
        }
        
        String type = expression.get("type").asText();
        
        // Validate functions
        if ("function".equals(type) && expression.has("function")) {
            JsonNode function = expression.get("function");
            String returnType = expression.has("returnType") ? expression.get("returnType").asText() : null;
            
            String funcName = function.has("name") ? function.get("name").asText() : "Unknown";
            context.push("function", String.format("Function '%s'", funcName));
            result.addErrors(functionValidator.validateFunction(function, returnType, context));
            context.pop();
            
            fieldCount += function.has("args") ? function.get("args").size() : 0;
        }
        
        return fieldCount;
    }

    /**
     * Validate an expression group
     */
    private int validateExpressionGroup(
            JsonNode group,
            PathContext context,
            com.rulebuilder.validation.ValidationResult result,
            ValidationConfig config
    ) {
        int fieldCount = 1;
        context.push("", "Expression Group");
        
        result.addErrors(expressionOperatorValidator.validateExpressionGroup(group, context));
        
        if (group.has("expressions")) {
            JsonNode expressions = group.get("expressions");
            for (int i = 0; i < expressions.size(); i++) {
                context.push(
                        String.format("expressions[%d]", i),
                        String.format("Expression %d of %d", i + 1, expressions.size())
                );
                fieldCount += validateExpression(expressions.get(i), null, context, result, config);
                context.pop();
            }
        }
        
        context.pop();
        return fieldCount;
    }

    /**
     * Validate case structure
     */
    private int validateCaseStructure(
            JsonNode caseContent,
            PathContext context,
            com.rulebuilder.validation.ValidationResult result,
            ValidationConfig config
    ) {
        int fieldCount = 1;
        
        if (!caseContent.has("whenClauses")) {
            return fieldCount;
        }
        
        JsonNode whenClauses = caseContent.get("whenClauses");
        
        for (int i = 0; i < whenClauses.size(); i++) {
            JsonNode whenClause = whenClauses.get(i);
            context.push(
                    String.format("whenClauses[%d]", i),
                    String.format("WHEN Clause %d of %d", i + 1, whenClauses.size())
            );
            
            // Validate WHEN condition
            if (whenClause.has("when")) {
                context.push("when", "WHEN Condition");
                fieldCount += validateConditionStructure(whenClause.get("when"), context, result, config);
                context.pop();
            }
            
            // Validate THEN expression
            if (whenClause.has("then")) {
                context.push("then", "THEN Result");
                fieldCount += validateExpressionStructure(whenClause.get("then"), context, result, config);
                context.pop();
            }
            
            context.pop();
        }
        
        // Validate ELSE if present
        if (caseContent.has("elseClause")) {
            context.push("elseClause", "ELSE Result");
            fieldCount += validateExpressionStructure(caseContent.get("elseClause"), context, result, config);
            context.pop();
        }
        
        return fieldCount;
    }

    /**
     * Finish validation and set metadata
     */
    private void finishValidation(
            com.rulebuilder.validation.ValidationResult result,
            long startTime,
            int fieldCount
    ) {
        long duration = System.currentTimeMillis() - startTime;
        result.getMetadata().setValidatedFields(fieldCount);
        result.getMetadata().setValidationDurationMs(duration);
    }

    /**
     * Helper: Check if node is a condition group
     */
    private boolean isConditionGroup(JsonNode node) {
        return node.has("type") && "conditionGroup".equals(node.get("type").asText());
    }

    /**
     * Helper: Check if node is an expression group
     */
    private boolean isExpressionGroup(JsonNode node) {
        return node.has("type") && "expressionGroup".equals(node.get("type").asText());
    }

    /**
     * Add line numbers to all errors that don't have them yet
     * This is called after all validation to ensure business logic errors get line numbers too
     */
    private void addLineNumbersToErrors(com.rulebuilder.validation.ValidationResult result, JsonNode rule) {
        List<ValidationError> errorsWithLineNumbers = new ArrayList<>();
        
        for (ValidationError error : result.getErrors()) {
            if (error.getLineNumber() == null && error.getPath() != null) {
                // Calculate line number for this error
                Integer lineNumber = calculateLineNumber(rule, error.getPath());
                
                // Create new error with line number and updated message
                String enhancedMessage = error.getMessage();
                if (lineNumber != null) {
                    enhancedMessage = String.format("[Line %d] %s", lineNumber, error.getMessage());
                }
                
                ValidationError updatedError = ValidationError.builder()
                        .severity(error.getSeverity())
                        .code(error.getCode())
                        .message(enhancedMessage)
                        .path(error.getPath())
                        .humanPath(error.getHumanPath())
                        .field(error.getField())
                        .actualValue(error.getActualValue())
                        .suggestion(error.getSuggestion())
                        .lineNumber(lineNumber)
                        .columnNumber(error.getColumnNumber())
                        .build();
                
                errorsWithLineNumbers.add(updatedError);
            } else {
                errorsWithLineNumbers.add(error);
            }
        }
        
        // Replace errors in the result
        result.getErrors().clear();
        result.addErrors(errorsWithLineNumbers);
    }

    /**
     * Calculate line number for a JSON path by analyzing the formatted JSON
     * This provides approximate line numbers for error reporting
     * 
     * @param rule The JSON node representing the entire rule
     * @param path The JSON path (e.g., "$.definition.expressions[0].left")
     * @return Line number (1-indexed) or null if cannot be determined
     */
    private Integer calculateLineNumber(JsonNode rule, String path) {
        if (path == null || path.isEmpty() || path.equals("$")) {
            return 1; // Root is always line 1
        }
        
        try {
            // Convert JsonNode to pretty-printed JSON string
            String jsonString = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(rule);
            String[] lines = jsonString.split("\n");
            
            // For business logic errors, the path often doesn't start with $
            // Normalize it
            String normalizedPath = path.startsWith("$.") ? path : "$." + path;
            normalizedPath = normalizedPath.replace("$.", "/").replace("$", "");
            
            // Convert to JsonPointer format: expressions[0] becomes /expressions/0
            String jsonPointerPath = normalizedPath.replaceAll("\\[(\\d+)\\]", "/$1");
            
            if (jsonPointerPath.isEmpty()) {
                return 1;
            }
            
            // Navigate to the node using JsonPointer
            try {
                JsonNode targetNode = rule.at(jsonPointerPath);
                if (!targetNode.isMissingNode() && targetNode.isObject()) {
                    // Serialize just this node to get a unique snippet
                    String nodeJson = objectMapper.writeValueAsString(targetNode);
                    
                    // Get first meaningful line from the node (skip opening brace)
                    String[] nodeLines = nodeJson.split("\n");
                    String searchSnippet = null;
                    for (String nodeLine : nodeLines) {
                        String trimmed = nodeLine.trim();
                        if (!trimmed.equals("{") && !trimmed.isEmpty() && trimmed.startsWith("\"")) {
                            // Found a field line, use it as search snippet
                            searchSnippet = trimmed;
                            break;
                        }
                    }
                    
                    // Search for this snippet in the full JSON
                    if (searchSnippet != null) {
                        int occurrenceCount = 0;
                        // Count how many path segments we have to determine which occurrence
                        int pathDepth = jsonPointerPath.split("/").length - 1;
                        
                        for (int i = 0; i < lines.length; i++) {
                            if (lines[i].trim().equals(searchSnippet)) {
                                occurrenceCount++;
                                // Use path depth as a hint for which occurrence
                                if (occurrenceCount >= Math.max(1, pathDepth / 2)) {
                                    return i + 1;
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                // JsonPointer navigation failed, continue with fallback
            }
            
            // Fallback: try to find the last field name in the path
            String[] pathParts = jsonPointerPath.split("/");
            if (pathParts.length > 0) {
                String lastPart = pathParts[pathParts.length - 1];
                // If it's not a number (array index), search for it as a field
                if (!lastPart.matches("\\d+") && !lastPart.isEmpty()) {
                    String fieldPattern = "\"" + lastPart + "\":";
                    for (int i = 0; i < lines.length; i++) {
                        if (lines[i].trim().startsWith(fieldPattern)) {
                            return i + 1;
                        }
                    }
                }
            }
            
            return 1;
            
        } catch (Exception e) {
            return 1;
        }
    }

    /**
     * Load the JSON Schema from resources
     */
    private void loadSchema() throws IOException {
        ClassPathResource schemaResource = new ClassPathResource("static/schemas/rule-schema-current.json");
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
        this.schema = factory.getSchema(schemaResource.getInputStream());
    }

    /**
     * Reload schema from disk (useful for testing or hot-reload scenarios)
     */
    public void reloadSchema() throws IOException {
        loadSchema();
    }

    /**
     * Legacy method for backward compatibility - converts new format to old format
     * @deprecated Use validateRule(JsonNode) which returns ValidationResult
     */
    @Deprecated
    public JsonNode validateRuleLegacy(JsonNode rule) {
        com.rulebuilder.validation.ValidationResult result = validateRule(rule);
        
        var legacyResult = objectMapper.createObjectNode();
        var errorsArray = objectMapper.createArrayNode();
        
        for (ValidationError error : result.getErrors()) {
            errorsArray.add(error.getMessage());
        }
        
        legacyResult.set("errors", errorsArray);
        legacyResult.put("valid", result.isValid());
        
        return legacyResult;
    }
}
