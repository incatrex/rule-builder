package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
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

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "Fields", description = "APIs for managing field catalog")
public class FieldControllerV1 {

    @Autowired
    private FieldService fieldService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Operation(summary = "Get available fields", description = "Retrieves flattened field list with search and pagination. Each field has: path (entity.attribute), label, type, entity, entityLabel, attribute")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved fields"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/fields")
    public ResponseEntity<ObjectNode> getFields(
            @Parameter(description = "Page number (0-based)") @RequestParam(required = false, defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(required = false, defaultValue = "50") int size,
            @Parameter(description = "Search filter") @RequestParam(required = false) String search) {
        try {
            List<ObjectNode> fields = fieldService.getFlattenedFields(search, page, size);
            int totalElements = fieldService.getFieldCount(search);
            int totalPages = (int) Math.ceil((double) totalElements / size);
            
            // Build paginated response
            ObjectNode response = objectMapper.createObjectNode();
            ArrayNode contentArray = objectMapper.createArrayNode();
            fields.forEach(contentArray::add);
            
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

    @Operation(summary = "Get hierarchical fields", description = "Retrieves the complete hierarchical field structure (no pagination)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved fields"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/fields/hierarchy")
    public ResponseEntity<JsonNode> getFieldsHierarchy() {
        try {
            JsonNode fields = fieldService.getFields();
            return ResponseEntity.ok(fields);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
