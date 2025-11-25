package com.rulebuilder.validation;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Validates function definitions and arguments
 */
@Component
public class FunctionValidator {
    
    private final SchemaMetadataExtractor metadataExtractor;
    
    public FunctionValidator(SchemaMetadataExtractor metadataExtractor) {
        this.metadataExtractor = metadataExtractor;
    }
    
    /**
     * Validate a function definition
     */
    public List<ValidationError> validateFunction(
            JsonNode function,
            String expectedReturnType,
            PathContext context
    ) {
        List<ValidationError> errors = new ArrayList<>();
        
        if (!function.has("name") || !function.has("args")) {
            return errors; // Schema validation will catch this
        }
        
        String functionName = function.get("name").asText();
        JsonNode args = function.get("args");
        
        // Check if function exists
        if (!metadataExtractor.functionExists(functionName)) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("UNKNOWN_FUNCTION")
                    .message(String.format(
                        "Function '%s' is not defined in the schema",
                        functionName
                    ))
                    .path(context.getJsonPath() + ".name")
                    .humanPath(context.getHumanPath() + " → Function Name")
                    .field("name")
                    .actualValue(functionName)
                    .suggestion("Check the function name spelling or use a different function")
                    .build();
            errors.add(error);
            return errors;
        }
        
        Map<String, Object> funcMetadata = metadataExtractor.getFunctionMetadata(functionName);
        
        // Validate return type matches expected
        if (expectedReturnType != null && funcMetadata.containsKey("returnType")) {
            String actualReturnType = (String) funcMetadata.get("returnType");
            if (!actualReturnType.equals(expectedReturnType)) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("FUNCTION_RETURN_TYPE_MISMATCH")
                        .message(String.format(
                            "Function '%s' returns '%s' but context expects '%s'",
                            functionName, actualReturnType, expectedReturnType
                        ))
                        .path(context.getJsonPath())
                        .humanPath(context.getHumanPath())
                        .expectedValues(expectedReturnType)
                        .actualValue(actualReturnType)
                        .suggestion(String.format(
                            "Use a function that returns '%s' or change the expected return type",
                            expectedReturnType
                        ))
                        .build();
                errors.add(error);
            }
        }
        
        // Validate arguments
        if (funcMetadata.containsKey("dynamicArgs") && (Boolean) funcMetadata.get("dynamicArgs")) {
            errors.addAll(validateDynamicArgs(functionName, args, funcMetadata, context));
        } else {
            errors.addAll(validateFixedArgs(functionName, args, funcMetadata, context));
        }
        
        return errors;
    }
    
    /**
     * Validate dynamic arguments (e.g., MATH.ADD, MATH.SUM)
     */
    private List<ValidationError> validateDynamicArgs(
            String functionName,
            JsonNode args,
            Map<String, Object> funcMetadata,
            PathContext context
    ) {
        List<ValidationError> errors = new ArrayList<>();
        
        @SuppressWarnings("unchecked")
        Map<String, Object> argSpec = (Map<String, Object>) funcMetadata.get("argSpec");
        
        int minArgs = (Integer) argSpec.get("minArgs");
        int maxArgs = (Integer) argSpec.get("maxArgs");
        String expectedType = (String) argSpec.get("type");
        @SuppressWarnings("unchecked")
        List<String> valueSources = (List<String>) argSpec.get("valueSources");
        
        int actualCount = args.size();
        
        // Validate argument count
        if (actualCount < minArgs || actualCount > maxArgs) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("INVALID_ARG_COUNT")
                    .message(String.format(
                        "Function '%s' requires %d-%d arguments, found %d",
                        functionName, minArgs, maxArgs, actualCount
                    ))
                    .path(context.getJsonPath() + ".args")
                    .humanPath(context.getHumanPath() + " → Arguments")
                    .field("args")
                    .expectedValues(String.format("%d-%d arguments", minArgs, maxArgs))
                    .actualValue(String.format("%d arguments", actualCount))
                    .suggestion(String.format(
                        "Adjust the number of arguments to between %d and %d", minArgs, maxArgs
                    ))
                    .build();
            errors.add(error);
        }
        
        // Validate each argument
        for (int i = 0; i < args.size(); i++) {
            JsonNode arg = args.get(i);
            
            if (!arg.has("value")) {
                continue; // Schema validation will catch this
            }
            
            JsonNode value = arg.get("value");
            String actualType = getReturnType(value);
            
            // Validate type
            if (actualType != null && !actualType.equals(expectedType)) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("INVALID_ARG_TYPE")
                        .message(String.format(
                            "Argument %d of function '%s' must return type '%s', found '%s'",
                            i + 1, functionName, expectedType, actualType
                        ))
                        .path(context.getJsonPath() + String.format(".args[%d].value", i))
                        .humanPath(context.getHumanPath() + String.format(" → Argument %d of %d", i + 1, args.size()))
                        .field("value")
                        .expectedValues(expectedType)
                        .actualValue(actualType)
                        .suggestion(String.format("Change the argument to return type '%s'", expectedType))
                        .build();
                errors.add(error);
            }
            
            // Validate value source
            if (value.has("type")) {
                String expressionType = value.get("type").asText();
                if (!valueSources.contains(expressionType)) {
                    ValidationError error = ValidationError.builder()
                            .severity("error")
                            .code("INVALID_ARG_VALUE_SOURCE")
                            .message(String.format(
                                "Argument %d of function '%s' cannot be type '%s'. Allowed: %s",
                                i + 1, functionName, expressionType, String.join(", ", valueSources)
                            ))
                            .path(context.getJsonPath() + String.format(".args[%d].value.type", i))
                            .humanPath(context.getHumanPath() + String.format(" → Argument %d Type", i + 1))
                            .field("type")
                            .expectedValues(valueSources)
                            .actualValue(expressionType)
                            .suggestion(String.format("Use one of: %s", String.join(", ", valueSources)))
                            .build();
                    errors.add(error);
                }
            }
        }
        
        return errors;
    }
    
    /**
     * Validate fixed arguments with specific names and order
     */
    private List<ValidationError> validateFixedArgs(
            String functionName,
            JsonNode args,
            Map<String, Object> funcMetadata,
            PathContext context
    ) {
        List<ValidationError> errors = new ArrayList<>();
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> expectedArgs = (List<Map<String, Object>>) funcMetadata.get("args");
        
        if (expectedArgs == null) {
            return errors;
        }
        
        // Count required arguments
        long requiredCount = expectedArgs.stream()
                .filter(arg -> (Boolean) arg.getOrDefault("required", true))
                .count();
        
        // Validate argument count
        if (args.size() < requiredCount) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("MISSING_REQUIRED_ARG")
                    .message(String.format(
                        "Function '%s' requires %d arguments, found %d",
                        functionName, requiredCount, args.size()
                    ))
                    .path(context.getJsonPath() + ".args")
                    .humanPath(context.getHumanPath() + " → Arguments")
                    .field("args")
                    .expectedValues(String.format("%d arguments", requiredCount))
                    .actualValue(String.format("%d arguments", args.size()))
                    .suggestion("Add the missing required arguments")
                    .build();
            errors.add(error);
        }
        
        if (args.size() > expectedArgs.size()) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("UNEXPECTED_FUNCTION_ARG")
                    .message(String.format(
                        "Function '%s' expects %d arguments, found %d",
                        functionName, expectedArgs.size(), args.size()
                    ))
                    .path(context.getJsonPath() + ".args")
                    .humanPath(context.getHumanPath() + " → Arguments")
                    .field("args")
                    .expectedValues(String.format("%d arguments", expectedArgs.size()))
                    .actualValue(String.format("%d arguments", args.size()))
                    .suggestion("Remove extra arguments")
                    .build();
            errors.add(error);
        }
        
        // Validate each argument
        for (int i = 0; i < Math.min(args.size(), expectedArgs.size()); i++) {
            JsonNode arg = args.get(i);
            Map<String, Object> expectedArg = expectedArgs.get(i);
            
            if (!arg.has("name") || !arg.has("value")) {
                continue; // Schema validation will catch this
            }
            
            String actualName = arg.get("name").asText();
            String expectedName = (String) expectedArg.get("name");
            JsonNode value = arg.get("value");
            
            // Validate argument name
            if (!actualName.equals(expectedName)) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("INVALID_ARG_NAME")
                        .message(String.format(
                            "Argument %d of function '%s' should be named '%s', found '%s'",
                            i + 1, functionName, expectedName, actualName
                        ))
                        .path(context.getJsonPath() + String.format(".args[%d].name", i))
                        .humanPath(context.getHumanPath() + String.format(" → Argument %d Name", i + 1))
                        .field("name")
                        .expectedValues(expectedName)
                        .actualValue(actualName)
                        .suggestion(String.format("Rename argument to '%s'", expectedName))
                        .build();
                errors.add(error);
            }
            
            // Validate argument type
            String expectedType = (String) expectedArg.get("type");
            String actualType = getReturnType(value);
            
            if (actualType != null && !actualType.equals(expectedType)) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("INVALID_ARG_TYPE")
                        .message(String.format(
                            "Argument '%s' of function '%s' must return type '%s', found '%s'",
                            expectedName, functionName, expectedType, actualType
                        ))
                        .path(context.getJsonPath() + String.format(".args[%d].value", i))
                        .humanPath(context.getHumanPath() + String.format(" → Argument '%s'", expectedName))
                        .field("value")
                        .expectedValues(expectedType)
                        .actualValue(actualType)
                        .suggestion(String.format("Change argument to return type '%s'", expectedType))
                        .build();
                errors.add(error);
            }
            
            // Validate value source
            if (expectedArg.containsKey("valueSources") && value.has("type")) {
                @SuppressWarnings("unchecked")
                List<String> valueSources = (List<String>) expectedArg.get("valueSources");
                String expressionType = value.get("type").asText();
                
                if (!valueSources.contains(expressionType)) {
                    ValidationError error = ValidationError.builder()
                            .severity("error")
                            .code("INVALID_ARG_VALUE_SOURCE")
                            .message(String.format(
                                "Argument '%s' of function '%s' cannot be type '%s'. Allowed: %s",
                                expectedName, functionName, expressionType, String.join(", ", valueSources)
                            ))
                            .path(context.getJsonPath() + String.format(".args[%d].value.type", i))
                            .humanPath(context.getHumanPath() + String.format(" → Argument '%s' Type", expectedName))
                            .field("type")
                            .expectedValues(valueSources)
                            .actualValue(expressionType)
                            .suggestion(String.format("Use one of: %s", String.join(", ", valueSources)))
                            .build();
                    errors.add(error);
                }
            }
        }
        
        return errors;
    }
    
    /**
     * Get return type from an expression or expression group
     */
    private String getReturnType(JsonNode expression) {
        if (expression == null || !expression.has("returnType")) {
            return null;
        }
        return expression.get("returnType").asText();
    }
}
