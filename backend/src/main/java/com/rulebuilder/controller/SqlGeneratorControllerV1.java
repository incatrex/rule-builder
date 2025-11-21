package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rulebuilder.service.SqlGeneratorService;
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
@Tag(name = "SQL Generator", description = "APIs for converting rules to SQL")
public class SqlGeneratorControllerV1 {

    @Autowired
    private SqlGeneratorService sqlGeneratorService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Operation(summary = "Convert rule to SQL", description = "Generates Oracle SQL from a rule definition")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "SQL generated successfully"),
        @ApiResponse(responseCode = "500", description = "Error generating SQL")
    })
    @PostMapping("/rules/to-sql")
    public ResponseEntity<ObjectNode> convertRuleToSql(
            @Parameter(description = "Rule definition to convert") @RequestBody JsonNode rule) {
        try {
            String sql = sqlGeneratorService.generateSql(rule);
            ObjectNode response = objectMapper.createObjectNode();
            response.put("sql", sql);
            response.set("errors", objectMapper.createArrayNode());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ObjectNode errorResponse = objectMapper.createObjectNode();
            errorResponse.putNull("sql");
            errorResponse.putArray("errors").add(e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}
