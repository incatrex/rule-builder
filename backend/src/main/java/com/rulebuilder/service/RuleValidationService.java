package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Service for validating rules against JSON Schema
 * Uses networknt/json-schema-validator library
 */
@Service
public class RuleValidationService {

    private static final String SCHEMA_FILENAME = "rule-schema-current.json";
    private static final String SCHEMA_PATH = "/static/schemas/" + SCHEMA_FILENAME;
    
    private final JsonSchema schema;
    private final String schemaVersion;
    private final ObjectMapper objectMapper;
    private final XUISemanticValidator xuiSemanticValidator;

    public RuleValidationService(XUISemanticValidator xuiSemanticValidator) {
        this.objectMapper = new ObjectMapper();
        this.xuiSemanticValidator = xuiSemanticValidator;
        
        try {
            // Load schema from classpath
            InputStream schemaStream = getClass().getResourceAsStream(SCHEMA_PATH);
            if (schemaStream == null) {
                throw new RuntimeException("Schema file not found: " + SCHEMA_PATH);
            }
            
            JsonNode schemaNode = objectMapper.readTree(schemaStream);
            
            // Extract version from schema
            this.schemaVersion = schemaNode.has("version") ? 
                schemaNode.get("version").asText() : "unknown";
            
            // Create schema validator
            JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
            this.schema = factory.getSchema(schemaNode);
            
        } catch (IOException e) {
            throw new RuntimeException("Failed to load schema: " + SCHEMA_PATH, e);
        }
    }

    /**
     * Validate a rule against the JSON schema
     * Returns raw validation errors from json-schema-validator without modification
     * 
     * @param ruleJson The rule as JsonNode
     * @return ValidationResult containing schema metadata and errors
     */
    public ValidationResult validate(JsonNode ruleJson) {
        return validate(ruleJson, null, false, false);
    }

    /**
     * Validate a rule against the JSON schema with optional filtering
     * 
     * @param ruleJson The rule as JsonNode
     * @param disableFiltering If true, returns all raw errors without cascade filtering
     * @return ValidationResult containing schema metadata and errors
     */
    public ValidationResult validate(JsonNode ruleJson, boolean disableFiltering) {
        return validate(ruleJson, null, false, disableFiltering);
    }

    /**
     * Validate a rule against the JSON schema with optional line number calculation
     * 
     * @param ruleJson The rule as JsonNode
     * @param jsonString The original JSON string (required if calculateLineNumbers is true)
     * @param calculateLineNumbers Whether to calculate line numbers for errors
     * @param disableFiltering If true, returns all raw errors without cascade filtering
     * @return ValidationResult containing schema metadata and errors
     */
    public ValidationResult validate(JsonNode ruleJson, String jsonString, boolean calculateLineNumbers, boolean disableFiltering) {
        // Perform validation
        Set<ValidationMessage> validationMessages = schema.validate(ruleJson);
        
        // Convert ValidationMessage objects to ValidationError objects
        List<ValidationError> errors = new ArrayList<>();
        for (ValidationMessage msg : validationMessages) {
            ValidationError error = new ValidationError();
            error.setType(msg.getType());
            error.setCode(msg.getCode());
            error.setPath(msg.getPath());
            error.setSchemaPath(msg.getSchemaPath());
            error.setMessage(msg.getMessage());
            
            // Convert arguments to a map if present
            if (msg.getArguments() != null && msg.getArguments().length > 0) {
                error.setArguments(convertArgumentsToMap(msg));
            }
            
            // Set details if available
            error.setDetails(msg.getDetails());
            
            // Calculate line number if requested
            if (calculateLineNumbers && jsonString != null) {
                Integer lineNumber = findLineNumber(msg.getPath(), msg.getMessage(), msg.getType(), jsonString);
                error.setLineNumber(lineNumber);
            }
            
            errors.add(error);
        }
        
        // Add x-ui semantic validation errors
        List<ValidationError> xuiErrors = xuiSemanticValidator.validate(ruleJson);
        errors.addAll(xuiErrors);
        
        // Apply cascade error filtering unless disabled
        List<ValidationError> finalErrors;
        if (disableFiltering) {
            finalErrors = errors;
        } else {
            ErrorCascadeFilter.FilterResult filtered = ErrorCascadeFilter.filterCascadingErrors(errors);
            finalErrors = filtered.getFilteredErrors();
        }
        
        // Build result
        ValidationResult result = new ValidationResult();
        result.setSchemaFilename(SCHEMA_FILENAME);
        result.setSchemaVersion(schemaVersion);
        result.setErrorCount(finalErrors.size());
        result.setErrors(finalErrors);
        
        return result;
    }

    /**
     * Find the line number where a JSON path occurs in the original JSON string
     * 
     * @param jsonPath JSON Path (e.g., "$.definition.field")
     * @param message Error message that may contain the actual property name
     * @param errorType Type of error (e.g., "additionalProperties")
     * @param jsonString The original JSON string
     * @return Line number (1-indexed) or null if not found
     */
    private Integer findLineNumber(String jsonPath, String message, String errorType, String jsonString) {
        if (jsonPath == null || jsonString == null) {
            return 1;
        }
        
        // For additionalProperties errors, extract the actual property name from the message
        // Message format: "$.definition.invalidProperty: is not defined in the schema..."
        // or "$.rul3eType: is not defined in the schema..." (root level)
        String targetProperty = null;
        if ("additionalProperties".equals(errorType) && message != null) {
            // Extract the property path from the message
            int colonIndex = message.indexOf(":");
            if (colonIndex > 0) {
                String propertyPath = message.substring(0, colonIndex).trim();
                // propertyPath is like "$.definition.invalidProperty" or "$.rul3eType"
                int lastDot = propertyPath.lastIndexOf(".");
                if (lastDot > 0 && lastDot < propertyPath.length() - 1) {
                    targetProperty = propertyPath.substring(lastDot + 1);
                    // Also remove array indices like [0]
                    targetProperty = targetProperty.replaceAll("\\[\\d+\\]", "");
                }
            }
        }
        
        // If path is root and we extracted a property name, use that
        if (jsonPath.equals("$") && targetProperty == null) {
            return 1; // Root level with no specific property
        }
        
        // Parse JSON path to get the key we're looking for
        // $.definition.field -> look for "field"
        // $.metadata -> look for "metadata"
        // $.definition.expressions[0].name -> look for "name" within array context
        // $ -> root level, use targetProperty if available
        
        String[] parts = jsonPath.replace("$.", "").replace("$", "").split("\\.");
        
        // For root level with extracted property, use that directly
        if (targetProperty != null && (parts.length == 0 || (parts.length == 1 && parts[0].isEmpty()))) {
            // Search for root-level property
            String[] lines = jsonString.split("\n");
            for (int i = 0; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.matches("^\"" + targetProperty + "\"\\s*:.*")) {
                    return i + 1;
                }
            }
            return null; // Not found
        }
        
        if (parts.length == 0 || (parts.length == 1 && parts[0].isEmpty())) {
            return 1; // Root level without specific property
        }
        
        // Get the final key (removing array indices)
        String targetKey = targetProperty != null ? targetProperty : parts[parts.length - 1].replaceAll("\\[\\d+\\]", "");
        
        // Build the full parent path for context
        StringBuilder parentPathBuilder = new StringBuilder();
        for (int i = 0; i < parts.length - 1; i++) {
            if (i > 0) parentPathBuilder.append(".");
            parentPathBuilder.append(parts[i].replaceAll("\\[\\d+\\]", ""));
        }
        String parentPath = parentPathBuilder.toString();
        
        // Search through the JSON string line by line
        String[] lines = jsonString.split("\n");
        
        // Track which parent objects we're currently inside
        List<String> currentPath = new ArrayList<>();
        
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            
            // Check if this line defines a new key (has ": after the key name)
            if (line.matches(".*\"[^\"]+\"\\s*:.*")) {
                // Extract the key name
                int firstQuote = line.indexOf('"');
                int secondQuote = line.indexOf('"', firstQuote + 1);
                if (firstQuote >= 0 && secondQuote > firstQuote) {
                    String keyName = line.substring(firstQuote + 1, secondQuote);
                    
                    // Check if this is our target key
                    if (keyName.equals(targetKey)) {
                        // Verify we're in the right parent context
                        String currentParentPath = String.join(".", currentPath);
                        if (parentPath.isEmpty() || currentParentPath.equals(parentPath)) {
                            return i + 1; // Line numbers are 1-indexed
                        }
                    }
                    
                    // If this key opens an object or array, add it to our path
                    if (line.contains("{") || line.contains("[")) {
                        currentPath.add(keyName);
                    }
                }
            }
            
            // Track when we exit objects/arrays
            if (line.contains("}") || line.contains("]")) {
                if (!currentPath.isEmpty()) {
                    // Check if we're closing an object that opened on this line
                    boolean opensAndClosesOnSameLine = line.contains("{") || line.contains("[");
                    if (!opensAndClosesOnSameLine && !line.matches(".*\"[^\"]+\"\\s*:.*")) {
                        currentPath.remove(currentPath.size() - 1);
                    }
                }
            }
        }
        
        // Fallback: simple search for the key as a property (not as a value)
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            // Match: "keyname": (as a JSON property, not a value)
            if (line.matches("^\"" + targetKey + "\"\\s*:.*")) {
                return i + 1;
            }
        }
        
        return null; // Not found
    }

    /**
     * Convert ValidationMessage arguments array to a map for easier access
     */
    private Map<String, Object> convertArgumentsToMap(ValidationMessage msg) {
        Map<String, Object> argsMap = new HashMap<>();
        Object[] args = msg.getArguments();
        
        // Store arguments by index
        for (int i = 0; i < args.length; i++) {
            argsMap.put("arg" + i, args[i]);
        }
        
        return argsMap;
    }
}
