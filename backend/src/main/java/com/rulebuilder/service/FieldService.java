package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Service for managing field catalog operations
 */
@Service
public class FieldService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get all available fields from the fields.json file
     * 
     * @return JsonNode containing all fields
     * @throws IOException if fields.json cannot be read
     */
    public JsonNode getFields() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/fields.json");
        return objectMapper.readTree(resource.getInputStream());
    }
}
