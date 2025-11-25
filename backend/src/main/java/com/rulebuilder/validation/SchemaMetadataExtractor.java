package com.rulebuilder.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.*;

/**
 * Extracts x-ui metadata from the JSON schema for validation purposes
 */
@Component
public class SchemaMetadataExtractor {
    
    private final JsonNode schema;
    private final String schemaVersion;
    private final Map<String, Map<String, Object>> operatorMetadata;
    private final Map<String, Map<String, Object>> functionMetadata;
    private final Map<String, Map<String, Object>> typeMetadata;
    private final Map<String, String> expressionOperatorSymbols;
    
    public SchemaMetadataExtractor() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        ClassPathResource resource = new ClassPathResource("static/schemas/rule-schema-current.json");
        this.schema = mapper.readTree(resource.getInputStream());
        
        // Extract schema version
        this.schemaVersion = schema.has("version") ? schema.get("version").asText() : "unknown";
        
        // Cache metadata for performance
        this.operatorMetadata = extractOperatorMetadata();
        this.functionMetadata = extractFunctionMetadata();
        this.typeMetadata = extractTypeMetadata();
        this.expressionOperatorSymbols = extractExpressionOperatorSymbols();
    }
    
    /**
     * Get the schema version
     */
    public String getSchemaVersion() {
        return schemaVersion;
    }
    
    /**
     * Get valid condition operators for a given return type
     */
    public List<String> getValidConditionOperators(String returnType) {
        Map<String, Object> typeInfo = typeMetadata.get(returnType);
        if (typeInfo != null && typeInfo.containsKey("validConditionOperators")) {
            @SuppressWarnings("unchecked")
            List<String> operators = (List<String>) typeInfo.get("validConditionOperators");
            return operators;
        }
        return Collections.emptyList();
    }
    
    /**
     * Get valid expression operators for a given return type
     */
    public List<String> getValidExpressionOperators(String returnType) {
        Map<String, Object> typeInfo = typeMetadata.get(returnType);
        if (typeInfo != null && typeInfo.containsKey("validExpressionOperators")) {
            @SuppressWarnings("unchecked")
            List<String> operators = (List<String>) typeInfo.get("validExpressionOperators");
            return operators;
        }
        return Collections.emptyList();
    }
    
    /**
     * Get operator cardinality (number of right-side expressions required)
     * @return cardinality, or -1 if variable (for in/not_in)
     */
    public int getOperatorCardinality(String operator) {
        Map<String, Object> opInfo = operatorMetadata.get(operator);
        if (opInfo != null) {
            if (opInfo.containsKey("cardinality")) {
                return (Integer) opInfo.get("cardinality");
            }
            // For variable cardinality operators (in/not_in)
            if (opInfo.containsKey("minCardinality")) {
                return -1; // Indicates variable cardinality
            }
        }
        return 1; // Default to 1
    }
    
    /**
     * Get min cardinality for variable cardinality operators
     */
    public int getOperatorMinCardinality(String operator) {
        Map<String, Object> opInfo = operatorMetadata.get(operator);
        if (opInfo != null && opInfo.containsKey("minCardinality")) {
            return (Integer) opInfo.get("minCardinality");
        }
        return 1;
    }
    
    /**
     * Get max cardinality for variable cardinality operators
     */
    public int getOperatorMaxCardinality(String operator) {
        Map<String, Object> opInfo = operatorMetadata.get(operator);
        if (opInfo != null && opInfo.containsKey("maxCardinality")) {
            return (Integer) opInfo.get("maxCardinality");
        }
        return 1;
    }
    
    /**
     * Get function metadata
     */
    public Map<String, Object> getFunctionMetadata(String functionName) {
        return functionMetadata.getOrDefault(functionName, Collections.emptyMap());
    }
    
    /**
     * Check if function exists
     */
    public boolean functionExists(String functionName) {
        return functionMetadata.containsKey(functionName);
    }
    
    /**
     * Get expression operator symbol for a given operator name
     */
    public String getExpressionOperatorSymbol(String operatorName) {
        return expressionOperatorSymbols.get(operatorName);
    }
    
    /**
     * Get operator name from symbol
     */
    public String getOperatorNameFromSymbol(String symbol) {
        for (Map.Entry<String, String> entry : expressionOperatorSymbols.entrySet()) {
            if (entry.getValue().equals(symbol)) {
                return entry.getKey();
            }
        }
        return null;
    }
    
    // Private helper methods to extract metadata from schema
    
    private Map<String, Map<String, Object>> extractOperatorMetadata() {
        Map<String, Map<String, Object>> metadata = new HashMap<>();
        
        JsonNode conditionDef = schema.path("definitions").path("Condition");
        JsonNode operatorProp = conditionDef.path("properties").path("operator");
        JsonNode xUiOperators = operatorProp.path("x-ui-operators");
        
        if (xUiOperators.isObject()) {
            xUiOperators.fields().forEachRemaining(entry -> {
                String operator = entry.getKey();
                JsonNode opData = entry.getValue();
                
                Map<String, Object> opInfo = new HashMap<>();
                if (opData.has("cardinality")) {
                    opInfo.put("cardinality", opData.get("cardinality").asInt());
                }
                if (opData.has("minCardinality")) {
                    opInfo.put("minCardinality", opData.get("minCardinality").asInt());
                }
                if (opData.has("maxCardinality")) {
                    opInfo.put("maxCardinality", opData.get("maxCardinality").asInt());
                }
                if (opData.has("label")) {
                    opInfo.put("label", opData.get("label").asText());
                }
                
                metadata.put(operator, opInfo);
            });
        }
        
        return metadata;
    }
    
    private Map<String, Map<String, Object>> extractFunctionMetadata() {
        Map<String, Map<String, Object>> metadata = new HashMap<>();
        
        JsonNode expressionDef = schema.path("definitions").path("Expression");
        JsonNode functionProp = expressionDef.path("properties").path("function");
        JsonNode nameProp = functionProp.path("properties").path("name");
        JsonNode xUiFunctions = nameProp.path("x-ui-functions");
        
        if (xUiFunctions.isObject()) {
            xUiFunctions.fields().forEachRemaining(entry -> {
                String functionName = entry.getKey();
                JsonNode funcData = entry.getValue();
                
                Map<String, Object> funcInfo = new HashMap<>();
                if (funcData.has("returnType")) {
                    funcInfo.put("returnType", funcData.get("returnType").asText());
                }
                if (funcData.has("dynamicArgs")) {
                    funcInfo.put("dynamicArgs", funcData.get("dynamicArgs").asBoolean());
                }
                if (funcData.has("args")) {
                    List<Map<String, Object>> args = new ArrayList<>();
                    funcData.get("args").forEach(argNode -> {
                        Map<String, Object> arg = new HashMap<>();
                        if (argNode.has("name")) {
                            arg.put("name", argNode.get("name").asText());
                        }
                        if (argNode.has("type")) {
                            arg.put("type", argNode.get("type").asText());
                        }
                        if (argNode.has("required")) {
                            arg.put("required", argNode.get("required").asBoolean());
                        }
                        if (argNode.has("valueSources")) {
                            List<String> sources = new ArrayList<>();
                            argNode.get("valueSources").forEach(s -> sources.add(s.asText()));
                            arg.put("valueSources", sources);
                        }
                        args.add(arg);
                    });
                    funcInfo.put("args", args);
                }
                if (funcData.has("argSpec")) {
                    Map<String, Object> argSpec = new HashMap<>();
                    JsonNode argSpecNode = funcData.get("argSpec");
                    if (argSpecNode.has("type")) {
                        argSpec.put("type", argSpecNode.get("type").asText());
                    }
                    if (argSpecNode.has("minArgs")) {
                        argSpec.put("minArgs", argSpecNode.get("minArgs").asInt());
                    }
                    if (argSpecNode.has("maxArgs")) {
                        argSpec.put("maxArgs", argSpecNode.get("maxArgs").asInt());
                    }
                    if (argSpecNode.has("valueSources")) {
                        List<String> sources = new ArrayList<>();
                        argSpecNode.get("valueSources").forEach(s -> sources.add(s.asText()));
                        argSpec.put("valueSources", sources);
                    }
                    funcInfo.put("argSpec", argSpec);
                }
                
                metadata.put(functionName, funcInfo);
            });
        }
        
        return metadata;
    }
    
    private Map<String, Map<String, Object>> extractTypeMetadata() {
        Map<String, Map<String, Object>> metadata = new HashMap<>();
        
        JsonNode expressionDef = schema.path("definitions").path("Expression");
        JsonNode returnTypeProp = expressionDef.path("properties").path("returnType");
        JsonNode xUiTypes = returnTypeProp.path("x-ui-types");
        
        if (xUiTypes.isObject()) {
            xUiTypes.fields().forEachRemaining(entry -> {
                String typeName = entry.getKey();
                JsonNode typeData = entry.getValue();
                
                Map<String, Object> typeInfo = new HashMap<>();
                
                if (typeData.has("validConditionOperators")) {
                    List<String> operators = new ArrayList<>();
                    typeData.get("validConditionOperators").forEach(op -> operators.add(op.asText()));
                    typeInfo.put("validConditionOperators", operators);
                }
                
                if (typeData.has("validExpressionOperators")) {
                    List<String> operators = new ArrayList<>();
                    typeData.get("validExpressionOperators").forEach(op -> operators.add(op.asText()));
                    typeInfo.put("validExpressionOperators", operators);
                }
                
                if (typeData.has("defaultConditionOperator")) {
                    typeInfo.put("defaultConditionOperator", typeData.get("defaultConditionOperator").asText());
                }
                
                if (typeData.has("defaultExpressionOperator")) {
                    JsonNode defaultOp = typeData.get("defaultExpressionOperator");
                    typeInfo.put("defaultExpressionOperator", 
                        defaultOp.isNull() ? null : defaultOp.asText());
                }
                
                metadata.put(typeName, typeInfo);
            });
        }
        
        return metadata;
    }
    
    private Map<String, String> extractExpressionOperatorSymbols() {
        Map<String, String> symbols = new HashMap<>();
        
        JsonNode expressionGroupDef = schema.path("definitions").path("ExpressionGroup");
        JsonNode operatorsProp = expressionGroupDef.path("properties").path("operators");
        JsonNode xUiOperators = operatorsProp.path("x-ui-expression-operators");
        
        if (xUiOperators.isObject()) {
            xUiOperators.fields().forEachRemaining(entry -> {
                String operatorName = entry.getKey();
                JsonNode opData = entry.getValue();
                if (opData.has("symbol")) {
                    symbols.put(operatorName, opData.get("symbol").asText());
                }
            });
        }
        
        return symbols;
    }
}
