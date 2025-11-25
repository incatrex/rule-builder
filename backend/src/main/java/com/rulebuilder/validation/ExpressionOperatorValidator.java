package com.rulebuilder.validation;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Validates expression group operators
 */
@Component
public class ExpressionOperatorValidator {
    
    private final SchemaMetadataExtractor metadataExtractor;
    
    public ExpressionOperatorValidator(SchemaMetadataExtractor metadataExtractor) {
        this.metadataExtractor = metadataExtractor;
    }
    
    /**
     * Validate an expression group
     */
    public List<ValidationError> validateExpressionGroup(JsonNode expressionGroup, PathContext context) {
        List<ValidationError> errors = new ArrayList<>();
        
        if (!expressionGroup.has("expressions") || !expressionGroup.has("operators") || !expressionGroup.has("returnType")) {
            return errors; // Schema validation will catch this
        }
        
        JsonNode expressions = expressionGroup.get("expressions");
        JsonNode operators = expressionGroup.get("operators");
        String returnType = expressionGroup.get("returnType").asText();
        
        // Validate operator count matches expression count
        int expectedOperatorCount = expressions.size() - 1;
        int actualOperatorCount = operators.size();
        
        if (actualOperatorCount != expectedOperatorCount) {
            ValidationError error = ValidationError.builder()
                    .severity("error")
                    .code("OPERATOR_COUNT_MISMATCH")
                    .message(String.format(
                        "Expression group must have exactly %d operators (expressions.length - 1), found %d",
                        expectedOperatorCount, actualOperatorCount
                    ))
                    .path(context.getJsonPath() + ".operators")
                    .humanPath(context.getHumanPath() + " → Operators")
                    .field("operators")
                    .expectedValues(String.format("%d operators", expectedOperatorCount))
                    .actualValue(String.format("%d operators", actualOperatorCount))
                    .suggestion(String.format(
                        "%s %d operator%s to match %d expressions",
                        actualOperatorCount < expectedOperatorCount ? "Add" : "Remove",
                        Math.abs(expectedOperatorCount - actualOperatorCount),
                        Math.abs(expectedOperatorCount - actualOperatorCount) == 1 ? "" : "s",
                        expressions.size()
                    ))
                    .build();
            errors.add(error);
        }
        
        // Get valid operators for this return type
        List<String> validOperatorNames = metadataExtractor.getValidExpressionOperators(returnType);
        Set<String> validSymbols = new HashSet<>();
        for (String opName : validOperatorNames) {
            String symbol = metadataExtractor.getExpressionOperatorSymbol(opName);
            if (symbol != null) {
                validSymbols.add(symbol);
            }
        }
        
        // Validate each operator
        for (int i = 0; i < operators.size(); i++) {
            String operator = operators.get(i).asText();
            
            if (!validSymbols.contains(operator)) {
                // Try to find the operator name from symbol
                String operatorName = metadataExtractor.getOperatorNameFromSymbol(operator);
                
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("INVALID_EXPRESSION_OPERATOR")
                        .message(String.format(
                            "Operator '%s' is not valid for return type '%s'. Valid operators: %s",
                            operator, returnType, String.join(", ", new ArrayList<>(validSymbols))
                        ))
                        .path(context.getJsonPath() + String.format(".operators[%d]", i))
                        .humanPath(context.getHumanPath() + String.format(" → Operator %d", i + 1))
                        .field("operators")
                        .expectedValues(new ArrayList<>(validSymbols))
                        .actualValue(operator)
                        .suggestion(String.format(
                            "Use one of: %s for return type '%s'",
                            String.join(", ", new ArrayList<>(validSymbols)), returnType
                        ))
                        .context(Map.of(
                            "returnType", returnType,
                            "operatorPosition", i + 1,
                            "totalOperators", operators.size()
                        ))
                        .build();
                errors.add(error);
            }
        }
        
        // Validate expression type compatibility
        errors.addAll(validateExpressionTypeCompatibility(expressions, returnType, context));
        
        return errors;
    }
    
    /**
     * Validate that all expressions in the group have compatible types
     */
    private List<ValidationError> validateExpressionTypeCompatibility(
            JsonNode expressions,
            String groupReturnType,
            PathContext context
    ) {
        List<ValidationError> errors = new ArrayList<>();
        Set<String> returnTypes = new HashSet<>();
        
        for (int i = 0; i < expressions.size(); i++) {
            JsonNode expr = expressions.get(i);
            if (expr.has("returnType")) {
                returnTypes.add(expr.get("returnType").asText());
            }
        }
        
        // All expressions should have the same return type as the group
        for (String type : returnTypes) {
            if (!type.equals(groupReturnType)) {
                ValidationError error = ValidationError.builder()
                        .severity("error")
                        .code("EXPRESSION_GROUP_TYPE_MISMATCH")
                        .message(String.format(
                            "Expression group declares return type '%s' but contains expression with type '%s'",
                            groupReturnType, type
                        ))
                        .path(context.getJsonPath() + ".expressions")
                        .humanPath(context.getHumanPath() + " → Expressions")
                        .field("expressions")
                        .expectedValues(groupReturnType)
                        .actualValue(new ArrayList<>(returnTypes))
                        .suggestion(String.format(
                            "Ensure all expressions return type '%s' or change the group return type",
                            groupReturnType
                        ))
                        .context(Map.of(
                            "groupReturnType", groupReturnType,
                            "foundTypes", returnTypes
                        ))
                        .build();
                errors.add(error);
                break; // Only report once
            }
        }
        
        return errors;
    }
}
