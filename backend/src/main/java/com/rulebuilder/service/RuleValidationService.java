package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Service for validating rules against JSON Schema
 */
@Service
public class RuleValidationService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private JsonSchema schema;

    public RuleValidationService() {
        try {
            loadSchema();
        } catch (IOException e) {
            throw new RuntimeException("Failed to load validation schema", e);
        }
    }

    /**
     * Validate a rule against the JSON Schema
     * 
     * @param rule The rule data to validate
     * @return JsonNode containing validation results (errors array)
     */
    public JsonNode validateRule(JsonNode rule) {
        List<String> errors = new ArrayList<>();
        
        if (schema == null) {
            errors.add("Schema not loaded");
            return createValidationResult(errors);
        }

        // Validate against schema
        Set<ValidationMessage> validationMessages = schema.validate(rule);
        
        for (ValidationMessage message : validationMessages) {
            errors.add(message.getMessage());
        }

        return createValidationResult(errors);
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
     * Create validation result JSON
     */
    private JsonNode createValidationResult(List<String> errors) {
        var result = objectMapper.createObjectNode();
        var errorsArray = objectMapper.createArrayNode();
        
        for (String error : errors) {
            errorsArray.add(error);
        }
        
        result.set("errors", errorsArray);
        result.put("valid", errors.isEmpty());
        
        return result;
    }

    /**
     * Reload schema from disk (useful for testing or hot-reload scenarios)
     */
    public void reloadSchema() throws IOException {
        loadSchema();
    }
}
