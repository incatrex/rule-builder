package com.rulebuilder.util;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Utility class to convert rule JSON to Oracle-compliant SQL
 */
@Component
public class OracleSqlGenerator {
    
    // Function mapping: JSON function name -> Oracle SQL
    private static final Map<String, String> FUNCTION_MAP = new HashMap<>();
    
    static {
        // Text functions
        FUNCTION_MAP.put("TEXT.CONCAT", "||");
        FUNCTION_MAP.put("TEXT.UPPER", "UPPER");
        FUNCTION_MAP.put("TEXT.LOWER", "LOWER");
        FUNCTION_MAP.put("TEXT.TRIM", "TRIM");
        FUNCTION_MAP.put("TEXT.SUBSTRING", "SUBSTR");
        FUNCTION_MAP.put("TEXT.LENGTH", "LENGTH");
        
        // Math functions
        FUNCTION_MAP.put("MATH.ADD", "+");
        FUNCTION_MAP.put("MATH.SUBTRACT", "-");
        FUNCTION_MAP.put("MATH.MULTIPLY", "*");
        FUNCTION_MAP.put("MATH.DIVIDE", "/");
        FUNCTION_MAP.put("MATH.ROUND", "ROUND");
        FUNCTION_MAP.put("MATH.ABS", "ABS");
        FUNCTION_MAP.put("MATH.CEILING", "CEIL");
        FUNCTION_MAP.put("MATH.FLOOR", "FLOOR");
        
        // Date functions
        FUNCTION_MAP.put("DATE.NOW", "SYSDATE");
        FUNCTION_MAP.put("DATE.ADD_DAYS", "DATE_ADD_DAYS");
        FUNCTION_MAP.put("DATE.DIFF_DAYS", "DATE_DIFF_DAYS");
    }

    /**
     * Generate Oracle SQL from rule JSON
     */
    public String generateSql(JsonNode rule) throws Exception {
        String structure = rule.get("structure").asText();
        JsonNode content = rule.get("content");
        
        switch (structure) {
            case "condition":
                return generateConditionSql(content);
            case "case":
                return generateCaseSql(content);
            case "expression":
                return generateExpressionSql(content);
            default:
                throw new IllegalArgumentException("Unknown structure: " + structure);
        }
    }

    /**
     * Generate SQL for condition structure (WHERE clause)
     */
    private String generateConditionSql(JsonNode conditionGroup) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT *\n");
        sql.append("FROM <table_name>\n");
        sql.append("WHERE ");
        sql.append(processConditionGroup(conditionGroup, 1));
        return sql.toString();
    }

    /**
     * Generate SQL for case structure (CASE expression)
     */
    private String generateCaseSql(JsonNode caseNode) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT\n");
        sql.append("  CASE\n");
        
        JsonNode whenClauses = caseNode.get("whenClauses");
        if (whenClauses != null && whenClauses.isArray()) {
            for (JsonNode whenClause : whenClauses) {
                JsonNode when = whenClause.get("when");
                JsonNode then = whenClause.get("then");
                
                sql.append("    WHEN ");
                sql.append(processConditionGroup(when, 0));
                sql.append("\n");
                sql.append("      THEN ");
                sql.append(processExpression(then));
                sql.append("\n");
            }
        }
        
        JsonNode elseClause = caseNode.get("elseClause");
        if (elseClause != null) {
            sql.append("    ELSE ");
            sql.append(processExpression(elseClause));
            sql.append("\n");
        }
        
        sql.append("  END AS result\n");
        sql.append("FROM <table_name>");
        
        return sql.toString();
    }

    /**
     * Generate SQL for expression structure (SELECT expression)
     */
    private String generateExpressionSql(JsonNode expression) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append(processExpression(expression));
        sql.append("\nFROM <table_name>");
        return sql.toString();
    }

    /**
     * Process a condition group (recursive for nested groups)
     */
    private String processConditionGroup(JsonNode group, int indent) {
        StringBuilder sql = new StringBuilder();
        String indentStr = "  ".repeat(indent);
        
        boolean not = group.has("not") && group.get("not").asBoolean();
        String conjunction = group.has("conjunction") ? group.get("conjunction").asText() : "AND";
        
        JsonNode conditions = group.get("conditions");
        if (conditions == null || !conditions.isArray() || conditions.size() == 0) {
            return "1=1"; // No conditions
        }
        
        if (not) {
            sql.append("NOT (");
        } else if (conditions.size() > 1 || indent > 0) {
            sql.append("(");
        }
        
        List<String> conditionStrings = new ArrayList<>();
        for (JsonNode condition : conditions) {
            String type = condition.get("type").asText();
            
            if ("condition".equals(type)) {
                conditionStrings.add(processSingleCondition(condition));
            } else if ("conditionGroup".equals(type)) {
                conditionStrings.add(processConditionGroup(condition, indent + 1));
            }
        }
        
        if (indent > 0 && conditionStrings.size() > 1) {
            sql.append("\n");
            sql.append(indentStr);
            sql.append(String.join("\n" + indentStr + conjunction + " ", conditionStrings));
            sql.append("\n").append("  ".repeat(indent - 1));
        } else {
            sql.append(String.join(" " + conjunction + " ", conditionStrings));
        }
        
        if (not || conditions.size() > 1 || indent > 0) {
            sql.append(")");
        }
        
        return sql.toString();
    }

    /**
     * Process a single condition (field operator value)
     */
    private String processSingleCondition(JsonNode condition) {
        JsonNode left = condition.get("left");
        JsonNode right = condition.get("right");
        String operator = condition.has("operator") && !condition.get("operator").isNull() 
            ? condition.get("operator").asText() : "=";
        
        String leftSql = processExpression(left);
        
        // Special handling for BETWEEN operator (right is an array with 2 values)
        if ("between".equalsIgnoreCase(operator)) {
            if (right != null && right.isArray() && right.size() >= 2) {
                String minValue = processExpression(right.get(0));
                String maxValue = processExpression(right.get(1));
                return leftSql + " BETWEEN " + minValue + " AND " + maxValue;
            } else {
                // Fallback if structure is different
                return leftSql + " BETWEEN NULL AND NULL";
            }
        }
        
        // Special handling for NOT BETWEEN operator (right is an array with 2 values)
        if ("not_between".equalsIgnoreCase(operator)) {
            if (right != null && right.isArray() && right.size() >= 2) {
                String minValue = processExpression(right.get(0));
                String maxValue = processExpression(right.get(1));
                return leftSql + " NOT BETWEEN " + minValue + " AND " + maxValue;
            } else {
                // Fallback if structure is different
                return leftSql + " NOT BETWEEN NULL AND NULL";
            }
        }
        
        // Special handling for IN operator (right is an array with 1+ values)
        if ("in".equalsIgnoreCase(operator)) {
            if (right != null && right.isArray() && right.size() > 0) {
                List<String> values = new ArrayList<>();
                for (JsonNode valueNode : right) {
                    values.add(processExpression(valueNode));
                }
                return leftSql + " IN (" + String.join(", ", values) + ")";
            } else {
                // Fallback if structure is different
                return leftSql + " IN (NULL)";
            }
        }
        
        // Special handling for NOT IN operator (right is an array with 1+ values)
        if ("not_in".equalsIgnoreCase(operator)) {
            if (right != null && right.isArray() && right.size() > 0) {
                List<String> values = new ArrayList<>();
                for (JsonNode valueNode : right) {
                    values.add(processExpression(valueNode));
                }
                return leftSql + " NOT IN (" + String.join(", ", values) + ")";
            } else {
                // Fallback if structure is different
                return leftSql + " NOT IN (NULL)";
            }
        }
        
        // Special handling for unary operators (Is Empty, Is Not Empty)
        if ("Is Empty".equalsIgnoreCase(operator) || "isEmpty".equalsIgnoreCase(operator) || "is_empty".equalsIgnoreCase(operator)) {
            return leftSql + " IS NULL";
        }
        
        if ("Is Not Empty".equalsIgnoreCase(operator) || "isNotEmpty".equalsIgnoreCase(operator) || "is_not_empty".equalsIgnoreCase(operator)) {
            return leftSql + " IS NOT NULL";
        }
        
        String rightSql = processExpression(right);
        
        // Special handling for NULL values with comparison operators
        if ("null".equalsIgnoreCase(rightSql) || "NULL".equals(rightSql)) {
            if ("=".equals(operator)) {
                return leftSql + " IS NULL";
            } else if ("!=".equals(operator) || "<>".equals(operator)) {
                return leftSql + " IS NOT NULL";
            }
        }
        
        return leftSql + " " + operator + " " + rightSql;
    }

    /**
     * Process an expression (can be expressionGroup or base expression)
     */
    private String processExpression(JsonNode expr) {
        if (expr == null) {
            return "NULL";
        }
        
        String type = expr.has("type") ? expr.get("type").asText() : "";
        
        switch (type) {
            case "expressionGroup":
                return processExpressionGroup(expr);
            case "value":
                return processValue(expr);
            case "field":
                return processField(expr);
            case "function":
                return processFunction(expr);
            case "ruleRef":
                return processRuleRef(expr);
            default:
                return "NULL";
        }
    }

    /**
     * Process an expression group (expressions with operators)
     */
    private String processExpressionGroup(JsonNode group) {
        JsonNode expressions = group.get("expressions");
        JsonNode operators = group.get("operators");
        
        if (expressions == null || !expressions.isArray() || expressions.size() == 0) {
            return "NULL";
        }
        
        if (expressions.size() == 1) {
            return processExpression(expressions.get(0));
        }
        
        StringBuilder sql = new StringBuilder();
        sql.append("(");
        
        for (int i = 0; i < expressions.size(); i++) {
            if (i > 0) {
                String operator = (operators != null && operators.size() > i - 1) 
                    ? operators.get(i - 1).asText() 
                    : "+";
                sql.append(" ").append(operator).append(" ");
            }
            sql.append(processExpression(expressions.get(i)));
        }
        
        sql.append(")");
        return sql.toString();
    }

    /**
     * Process a value (literal)
     */
    private String processValue(JsonNode value) {
        String returnType = value.has("returnType") ? value.get("returnType").asText() : "text";
        JsonNode valueNode = value.get("value");
        
        if (valueNode == null || valueNode.isNull() || valueNode.asText().isEmpty()) {
            return "NULL";
        }
        
        String val = valueNode.asText();
        
        switch (returnType) {
            case "text":
                // Escape single quotes by doubling them
                val = val.replace("'", "''");
                return "'" + val + "'";
            case "number":
                return val;
            case "date":
                return "TO_DATE('" + val + "', 'YYYY-MM-DD')";
            case "boolean":
                return val.equalsIgnoreCase("true") ? "1" : "0";
            default:
                return "'" + val + "'";
        }
    }

    /**
     * Process a field reference
     */
    private String processField(JsonNode field) {
        JsonNode fieldNode = field.get("field");
        if (fieldNode == null || fieldNode.isNull()) {
            return "NULL";
        }
        return fieldNode.asText();
    }

    /**
     * Process a function call
     */
    private String processFunction(JsonNode func) {
        JsonNode functionNode = func.get("function");
        if (functionNode == null) {
            return "NULL";
        }
        
        String functionName = functionNode.has("name") ? functionNode.get("name").asText() : "";
        JsonNode args = functionNode.get("args");
        
        // Check if function is an operator (like MATH.ADD)
        if (FUNCTION_MAP.containsKey(functionName)) {
            String mapped = FUNCTION_MAP.get(functionName);
            
            // Handle operator functions (like + - * /)
            if (mapped.length() <= 2 && "+-*/||".contains(mapped)) {
                if (args != null && args.isArray() && args.size() >= 2) {
                    List<String> argStrings = new ArrayList<>();
                    for (JsonNode arg : args) {
                        JsonNode argValue = arg.get("value");
                        argStrings.add(processExpression(argValue));
                    }
                    return "(" + String.join(" " + mapped + " ", argStrings) + ")";
                }
            }
            
            // Handle regular functions
            if (args != null && args.isArray()) {
                List<String> argStrings = new ArrayList<>();
                for (JsonNode arg : args) {
                    JsonNode argValue = arg.get("value");
                    argStrings.add(processExpression(argValue));
                }
                return mapped + "(" + String.join(", ", argStrings) + ")";
            }
        }
        
        // Unknown function, return as-is
        return functionName + "()";
    }

    /**
     * Process a rule reference
     */
    private String processRuleRef(JsonNode ruleRef) {
        JsonNode idNode = ruleRef.get("id");
        if (idNode == null || idNode.isNull()) {
            return "<RULE:UNKNOWN>";
        }
        String ruleId = idNode.asText();
        return "<RULE:" + ruleId + ">";
    }
}
