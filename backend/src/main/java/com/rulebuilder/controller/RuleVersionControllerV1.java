package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.rulebuilder.service.RuleService;
import com.rulebuilder.service.RuleVersionService;
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
@Tag(name = "Rule Versions", description = "APIs for managing rule version history")
public class RuleVersionControllerV1 {

    @Autowired
    private RuleVersionService versionService;

    @Autowired
    private RuleService ruleService;

    @Operation(summary = "Get rule versions", description = "Retrieves all versions with metadata for a specific rule UUID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved versions"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/rules/{uuid}/versions")
    public ResponseEntity<JsonNode> getRuleVersions(
            @Parameter(description = "Rule UUID") @PathVariable String uuid) {
        try {
            JsonNode history = versionService.getVersions(uuid);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @Operation(summary = "Get a specific rule version", description = "Retrieves a rule by UUID and version number or 'latest' keyword")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Rule found and returned"),
        @ApiResponse(responseCode = "404", description = "Rule not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/rules/{uuid}/versions/{version}")
    public ResponseEntity<JsonNode> getRuleVersion(
            @Parameter(description = "Rule UUID") @PathVariable String uuid,
            @Parameter(description = "Rule version number or 'latest'") @PathVariable String version) {
        try {
            // Handle 'latest' keyword
            String resolvedVersion = version;
            if ("latest".equalsIgnoreCase(version)) {
                JsonNode versionHistory = versionService.getVersions(uuid);
                if (versionHistory.isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
                resolvedVersion = String.valueOf(versionHistory.get(0).get("version").asInt());
            }
            
            // Get ruleId from history
            JsonNode history = versionService.getVersions(uuid);
            if (history.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            // Find the entry with matching version
            String ruleId = null;
            for (JsonNode entry : history) {
                if (entry.get("version").asInt() == Integer.parseInt(resolvedVersion)) {
                    ruleId = entry.get("ruleId").asText();
                    break;
                }
            }
            
            if (ruleId == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Get the actual rule
            JsonNode rule = ruleService.getRule(ruleId, uuid, resolvedVersion);
            if (rule != null) {
                return ResponseEntity.ok(rule);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @Operation(summary = "Restore rule version", description = "Restores a previous version by creating a new version with the old content")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Rule version restored successfully"),
        @ApiResponse(responseCode = "500", description = "Error restoring rule")
    })
    @PostMapping("/rules/{uuid}/versions/{version}/restore")
    public ResponseEntity<String> restoreRuleVersion(
            @Parameter(description = "Rule UUID") @PathVariable String uuid,
            @Parameter(description = "Version number to restore") @PathVariable int version) {
        try {
            versionService.restoreVersion(uuid, version, ruleService);
            return ResponseEntity.ok("Rule version restored successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error restoring rule: " + e.getMessage());
        }
    }
}
