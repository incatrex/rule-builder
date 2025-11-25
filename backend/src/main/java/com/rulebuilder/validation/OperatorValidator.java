package com.rulebuilder.validation;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Validates condition operators against return types and cardinality requirements
 */
@Component
public class OperatorValidator {
    
    private final SchemaMetadataExtractor metadataExtractor;
    
    public OperatorValidator(SchemaMetadataExtractor metadataExtractor) {
        this.metadataExtractor = metadataExtractor;
    }
    
    /**
     * Validate a condition node
     */
    public List<ValidationError> validateCondition(JsonNode condition, PathContext context) {
        List<ValidationError> errors = new ArrayList<>();
        
        if (!condition.has("operator") || !condition.has("left")) {
            return errors; // Schema validation will catch this
        }
        
        String operator = condition.get("operator").asText();
        JsonNode left = condition.get("left");
        JsonNode right = condition.has("right") ? condition.get("right") : null;
        
        // Get left side return type
        String leftReturnType = getReturnType(left);
        if (leftReturnType == null) {
            return errors; // Can't validate without type
        }
        
        // Validate operator is valid for the left side return type
        List<String> validOperators = metadataExtractor.getValidConditionOperators(leftReturnType);
        if (!validOperators.contains(operator)) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("INVALID_CONDITION_OPERATOR")
                    .message(String.format(
                        "Operator '%s' is not valid for return type '%s'. Valid operators: %s",
                        operator, leftReturnType, String.join(", ", validOperators)
                    ))
                    .path(context.getJsonPath() + ".operator")
                    .humanPath(context.getHumanPath() + " → Operator")
                    .field("operator")
                    .expectedValues(validOperators)
                    .actualValue(operator)
                    .suggestion(String.format(
                        "Change the operator to one of: %s, or change the left side to a different return type",
                        validOperators.isEmpty() ? "none available" : validOperators.get(0)
                    ))
                    .context(Map.of(
                        "leftReturnType", leftReturnType,
                        "operator", operator
                    ))
                    .build();
            errors.add(error);
        }
        
        // Validate cardinality
        errors.addAll(validateCardinality(operator, right, context));
        
        return errors;
    }
    
    /**
     * Validate operator cardinality (right-side expression count)
     */
    private List<ValidationError> validateCardinality(String operator, JsonNode right, PathContext context) {
        List<ValidationError> errors = new ArrayList<>();
        
        int cardinality = metadataExtractor.getOperatorCardinality(operator);
        
        // Cardinality 0 means no right side should exist
        if (cardinality == 0) {
            if (right != null && !right.isNull()) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("UNEXPECTED_RIGHT_EXPRESSION")
                        .message(String.format(
                            "Operator '%s' should not have a right side expression",
                            operator
                        ))
                        .path(context.getJsonPath() + ".right")
                        .humanPath(context.getHumanPath() + " → Right Side")
                        .field("right")
                        .expectedValues(null)
                        .actualValue("expression provided")
                        .suggestion(String.format("Remove the right side for operator '%s'", operator))
                        .build();
                errors.add(error);
            }
            return errors;
        }
        
        // Cardinality > 0 means right side is required
        if (right == null || right.isNull()) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("MISSING_RIGHT_EXPRESSION")
                    .message(String.format(
                        "Operator '%s' requires a right side expression, but it is null or missing",
                        operator
                    ))
                    .path(context.getJsonPath() + ".right")
                    .humanPath(context.getHumanPath() + " → Right Side")
                    .field("right")
                    .expectedValues("expression or array of expressions")
                    .actualValue(null)
                    .suggestion(String.format("Add a right side expression for operator '%s'", operator))
                    .build();
            errors.add(error);
            return errors;
        }
        
        // Variable cardinality (in/not_in)
        if (cardinality == -1) {
            int minCard = metadataExtractor.getOperatorMinCardinality(operator);
            int maxCard = metadataExtractor.getOperatorMaxCardinality(operator);
            
            if (!right.isArray()) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("RIGHT_SIDE_NOT_ARRAY")
                        .message(String.format(
                            "Operator '%s' requires an array of expressions on the right side",
                            operator
                        ))
                        .path(context.getJsonPath() + ".right")
                        .humanPath(context.getHumanPath() + " → Right Side")
                        .field("right")
                        .expectedValues(String.format("array of %d-%d expressions", minCard, maxCard))
                        .actualValue("single expression")
                        .suggestion(String.format("Wrap the expression in an array for operator '%s'", operator))
                        .build();
                errors.add(error);
            } else {
                int actualCount = right.size();
                if (actualCount < minCard || actualCount > maxCard) {
                    ValidationError error = ValidationError.builder()
                            .severity("error")
                            .code("RIGHT_SIDE_ARRAY_WRONG_SIZE")
                            .message(String.format(
                                "Operator '%s' requires %d-%d expressions on the right side, found %d",
                                operator, minCard, maxCard, actualCount
                            ))
                            .path(context.getJsonPath() + ".right")
                            .humanPath(context.getHumanPath() + " → Right Side")
                            .field("right")
                            .expectedValues(String.format("%d-%d expressions", minCard, maxCard))
                            .actualValue(String.format("%d expressions", actualCount))
                            .suggestion(String.format(
                                "Adjust the number of expressions to between %d and %d", minCard, maxCard
                            ))
                            .build();
                    errors.add(error);
                }
            }
            return errors;
        }
        
        // Fixed cardinality (1 for most, 2 for between/not_between)
        if (cardinality == 1) {
            if (right.isArray()) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("INVALID_OPERATOR_CARDINALITY")
                        .message(String.format(
                            "Operator '%s' requires a single expression, but found an array",
                            operator
                        ))
                        .path(context.getJsonPath() + ".right")
                        .humanPath(context.getHumanPath() + " → Right Side")
                        .field("right")
                        .expectedValues("single expression")
                        .actualValue(String.format("array of %d expressions", right.size()))
                        .suggestion("Use a single expression instead of an array")
                        .build();
                errors.add(error);
            }
        } else if (cardinality == 2) {
            if (!right.isArray()) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("INVALID_OPERATOR_CARDINALITY")
                        .message(String.format(
                            "Operator '%s' requires 2 expressions, but found a single expression",
                            operator
                        ))
                        .path(context.getJsonPath() + ".right")
                        .humanPath(context.getHumanPath() + " → Right Side")
                        .field("right")
                        .expectedValues("array of 2 expressions")
                        .actualValue("single expression")
                        .suggestion("Provide an array with 2 expressions (lower and upper bounds)")
                        .build();
                errors.add(error);
            } else if (right.size() != 2) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("INVALID_OPERATOR_CARDINALITY")
                        .message(String.format(
                            "Operator '%s' requires exactly 2 expressions, found %d",
                            operator, right.size()
                        ))
                        .path(context.getJsonPath() + ".right")
                        .humanPath(context.getHumanPath() + " → Right Side")
                        .field("right")
                        .expectedValues("array of 2 expressions")
                        .actualValue(String.format("array of %d expressions", right.size()))
                        .suggestion("Provide exactly 2 expressions (lower and upper bounds)")
                        .build();
                errors.add(error);
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
