package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rulebuilder.service.FieldService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "Fields", description = "APIs for managing field catalog")
public class FieldControllerV1 {

    @Autowired
    private FieldService fieldService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Operation(summary = "Get available fields", description = "Retrieves the list of available fields for rule building with optional pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved fields"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/fields")
    public ResponseEntity<ObjectNode> getFields(
            @Parameter(description = "Page number (0-based)") @RequestParam(required = false, defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(required = false, defaultValue = "20") int size,
            @Parameter(description = "Search filter") @RequestParam(required = false) String search) {
        try {
            JsonNode allFields = fieldService.getFields();
            
            // Convert to array if needed
            List<JsonNode> fieldsList = new ArrayList<>();
            if (allFields.isArray()) {
                allFields.forEach(fieldsList::add);
            } else {
                fieldsList.add(allFields);
            }
            
            // Filter by search term if provided
            if (search != null && !search.isEmpty()) {
                String searchLower = search.toLowerCase();
                fieldsList = fieldsList.stream()
                    .filter(field -> {
                        String label = field.has("label") ? field.get("label").asText().toLowerCase() : "";
                        String value = field.has("value") ? field.get("value").asText().toLowerCase() : "";
                        return label.contains(searchLower) || value.contains(searchLower);
                    })
                    .collect(Collectors.toList());
            }
            
            int totalElements = fieldsList.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            
            // Apply pagination
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            List<JsonNode> pagedFields = start < totalElements 
                ? fieldsList.subList(start, end)
                : new ArrayList<>();
            
            // Build paginated response
            ObjectNode response = objectMapper.createObjectNode();
            var contentArray = objectMapper.createArrayNode();
            pagedFields.forEach(contentArray::add);
            
            response.set("content", contentArray);
            response.put("page", page);
            response.put("size", size);
            response.put("totalElements", totalElements);
            response.put("totalPages", totalPages);
            response.put("first", page == 0);
            response.put("last", page >= totalPages - 1);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
