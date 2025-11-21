package com.rulebuilder.controller;

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

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "Fields", description = "APIs for managing field catalog")
public class FieldControllerV1 {

    @Autowired
    private FieldService fieldService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Operation(summary = "Get available fields", description = "Retrieves hierarchical field structure with entity-level pagination. Returns a subset of entities based on page and size parameters.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved fields"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/fields")
    public ResponseEntity<ObjectNode> getFields(
            @Parameter(description = "Page number (0-based)") @RequestParam(required = false, defaultValue = "0") int page,
            @Parameter(description = "Page size (number of entities)") @RequestParam(required = false, defaultValue = "5") int size,
            @Parameter(description = "Search filter for entity or field names") @RequestParam(required = false) String search) {
        try {
            ObjectNode fields = fieldService.getHierarchicalFieldsPaginated(page, size, search);
            int totalElements = fieldService.getEntityCount(search);
            int totalPages = (int) Math.ceil((double) totalElements / size);
            
            // Build paginated response with hierarchical content
            ObjectNode response = objectMapper.createObjectNode();
            response.set("content", fields);
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
