package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Service for managing field catalog operations
 */
@Service
public class FieldService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get all available fields from the fields.json file
     * 
     * @return JsonNode containing hierarchical fields
     * @throws IOException if fields.json cannot be read
     */
    public JsonNode getFields() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/fields.json");
        return objectMapper.readTree(resource.getInputStream());
    }

    /**
     * Get flattened field list with search and pagination support
     * Each field entry contains: { path, label, type, entity, attribute }
     * 
     * @param search Search string to filter fields
     * @param page Page number (0-based)
     * @param size Page size
     * @return List of flattened field objects
     * @throws IOException if fields.json cannot be read
     */
    public List<ObjectNode> getFlattenedFields(String search, int page, int size) throws IOException {
        JsonNode hierarchical = getFields();
        List<ObjectNode> flattenedFields = new ArrayList<>();
        
        // Flatten the hierarchical structure
        Iterator<Map.Entry<String, JsonNode>> entities = hierarchical.fields();
        while (entities.hasNext()) {
            Map.Entry<String, JsonNode> entity = entities.next();
            String entityName = entity.getKey();
            JsonNode entityNode = entity.getValue();
            
            if (entityNode.has("subfields")) {
                JsonNode subfields = entityNode.get("subfields");
                Iterator<Map.Entry<String, JsonNode>> fields = subfields.fields();
                
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> field = fields.next();
                    String attributeName = field.getKey();
                    JsonNode fieldNode = field.getValue();
                    
                    String path = entityName + "." + attributeName;
                    String label = fieldNode.has("label") ? fieldNode.get("label").asText() : attributeName;
                    String type = fieldNode.has("type") ? fieldNode.get("type").asText() : "text";
                    String entityLabel = entityNode.has("label") ? entityNode.get("label").asText() : entityName;
                    
                    // Apply search filter
                    if (search == null || search.isEmpty() || 
                        path.toLowerCase().contains(search.toLowerCase()) ||
                        label.toLowerCase().contains(search.toLowerCase()) ||
                        entityLabel.toLowerCase().contains(search.toLowerCase())) {
                        
                        ObjectNode flatField = objectMapper.createObjectNode();
                        flatField.put("path", path);
                        flatField.put("label", label);
                        flatField.put("type", type);
                        flatField.put("entity", entityName);
                        flatField.put("entityLabel", entityLabel);
                        flatField.put("attribute", attributeName);
                        
                        // Copy other properties
                        if (fieldNode.has("preferWidgets")) {
                            flatField.set("preferWidgets", fieldNode.get("preferWidgets"));
                        }
                        if (fieldNode.has("fieldSettings")) {
                            flatField.set("fieldSettings", fieldNode.get("fieldSettings"));
                        }
                        
                        flattenedFields.add(flatField);
                    }
                }
            }
        }
        
        // Apply pagination
        int start = page * size;
        int end = Math.min(start + size, flattenedFields.size());
        
        if (start >= flattenedFields.size()) {
            return new ArrayList<>();
        }
        
        return flattenedFields.subList(start, end);
    }

    /**
     * Get total count of fields matching search criteria
     */
    public int getFieldCount(String search) throws IOException {
        return getFlattenedFields(search, 0, Integer.MAX_VALUE).size();
    }
}
