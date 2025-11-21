package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.rulebuilder.service.RuleBuilderConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "Rule Builder Config", description = "APIs for UI configuration")
public class RuleBuilderConfigControllerV1 {

    @Autowired
    private RuleBuilderConfigService configService;

    @Operation(summary = "Get UI configuration", description = "Retrieves UI configuration generated from schema extensions")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved configuration"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/rules/ui/config")
    public ResponseEntity<JsonNode> getConfig() {
        try {
            JsonNode config = configService.getConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
