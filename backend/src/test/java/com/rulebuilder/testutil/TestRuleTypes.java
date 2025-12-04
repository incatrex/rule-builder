package com.rulebuilder.testutil;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

/**
 * Centralized test configuration for rule types.
 * Extracts rule type values from the schema at runtime to ensure tests
 * always use current schema values.
 * 
 * This makes tests schema-driven - when schema rule types change,
 * tests automatically use the new values without modification.
 */
public class TestRuleTypes {
    
    private static TestRuleTypes instance;
    
    // Rule type values extracted from schema
    private final Set<String> conditionRuleTypes = new HashSet<>();
    private String conditionGroupRuleType;  // Changed to non-final so we can set it during extraction
    private final Set<String> allRuleTypes = new HashSet<>();
    
    private TestRuleTypes() throws IOException {
        loadFromSchema();
        
        // Validate that conditionGroupRuleType was found
        if (conditionGroupRuleType == null) {
            throw new IllegalStateException("ConditionGroup ruleType constraint not found in schema");
        }
    }
    
    /**
     * Get singleton instance
     */
    public static synchronized TestRuleTypes getInstance() {
        if (instance == null) {
            try {
                instance = new TestRuleTypes();
            } catch (IOException e) {
                throw new RuntimeException("Failed to load test rule types from schema", e);
            }
        }
        return instance;
    }
    
    /**
     * Load rule type constraints from schema
     */
    private void loadFromSchema() throws IOException {
        try (InputStream is = getClass().getResourceAsStream("/static/schemas/rule-schema-current.json")) {
            if (is == null) {
                throw new IOException("Schema file not found");
            }
            
            ObjectMapper mapper = new ObjectMapper();
            JsonNode schema = mapper.readTree(is);
            
            // Extract all rule types from RuleType enum
            JsonNode definitions = schema.get("definitions");
            if (definitions != null && definitions.has("RuleType")) {
                JsonNode ruleType = definitions.get("RuleType");
                JsonNode enumNode = ruleType.get("enum");
                if (enumNode != null && enumNode.isArray()) {
                    enumNode.forEach(type -> allRuleTypes.add(type.asText()));
                }
            }
            
            // Extract Condition ruleType constraint (enum: ["Condition", "List"])
            if (definitions != null && definitions.has("Condition")) {
                JsonNode condition = definitions.get("Condition");
                JsonNode oneOf = condition.get("oneOf");
                if (oneOf != null && oneOf.isArray() && oneOf.size() > 1) {
                    JsonNode ruleRefSchema = oneOf.get(1);
                    JsonNode properties = ruleRefSchema.get("properties");
                    if (properties != null && properties.has("ruleRef")) {
                        JsonNode ruleRefProps = properties.get("ruleRef").get("properties");
                        if (ruleRefProps != null && ruleRefProps.has("ruleType")) {
                            JsonNode ruleTypeNode = ruleRefProps.get("ruleType");
                            if (ruleTypeNode.has("enum")) {
                                ruleTypeNode.get("enum").forEach(type -> 
                                    conditionRuleTypes.add(type.asText())
                                );
                            }
                        }
                    }
                }
            }
            
            // Extract ConditionGroup ruleType constraint (const: "Condition Group")
            if (definitions != null && definitions.has("ConditionGroup")) {
                JsonNode conditionGroup = definitions.get("ConditionGroup");
                JsonNode oneOf = conditionGroup.get("oneOf");
                if (oneOf != null && oneOf.isArray() && oneOf.size() > 1) {
                    JsonNode ruleRefSchema = oneOf.get(1);
                    JsonNode properties = ruleRefSchema.get("properties");
                    if (properties != null && properties.has("ruleRef")) {
                        JsonNode ruleRefProps = properties.get("ruleRef").get("properties");
                        if (ruleRefProps != null && ruleRefProps.has("ruleType")) {
                            JsonNode ruleTypeNode = ruleRefProps.get("ruleType");
                            if (ruleTypeNode.has("const")) {
                                // Set the conditionGroupRuleType directly (don't add to conditionRuleTypes)
                                conditionGroupRuleType = ruleTypeNode.get("const").asText();
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Get a rule type that can be used for Condition ruleRef.
     * Returns first value from schema enum ["Condition", "List"]
     */
    public String getConditionRuleType() {
        // Return the first non-conditionGroup type (typically "Condition")
        return conditionRuleTypes.stream()
            .filter(type -> !type.equals(getConditionGroupRuleType()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No Condition rule type found in schema"));
    }
    
    /**
     * Get the rule type for ConditionGroup ruleRef.
     * Returns value from schema const "Condition Group"
     */
    public String getConditionGroupRuleType() {
        return conditionGroupRuleType;
    }
    
    /**
     * Get a list rule type that can be used for Condition ruleRef.
     * Returns "List" from schema enum ["Condition", "List"]
     */
    public String getListRuleType() {
        // Return the second value from condition enum (typically "List")
        return conditionRuleTypes.stream()
            .filter(type -> !type.equals(getConditionRuleType()) && !type.equals(getConditionGroupRuleType()))
            .findFirst()
            .orElse(null); // May be null if List not in condition enum
    }
    
    /**
     * Get all rule types from schema enum
     */
    public Set<String> getAllRuleTypes() {
        return Collections.unmodifiableSet(allRuleTypes);
    }
    
    /**
     * Get allowed rule types for Condition context (enum values)
     */
    public Set<String> getConditionAllowedRuleTypes() {
        Set<String> allowed = new HashSet<>(conditionRuleTypes);
        allowed.remove(getConditionGroupRuleType()); // Remove the ConditionGroup type
        return Collections.unmodifiableSet(allowed);
    }
    
    /**
     * Check if a rule type exists in the schema
     */
    public boolean isValidRuleType(String ruleType) {
        return allRuleTypes.contains(ruleType);
    }
}
