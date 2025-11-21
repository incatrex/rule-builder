package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "Rules", description = "APIs for CRUD operations on rules")
public class RuleControllerV1 {

    @Autowired
    private RuleService ruleService;

    @Autowired
    private RuleVersionService versionService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Operation(summary = "Get all rules", description = "Retrieves list of all rules with their metadata, with optional filtering and pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved rules"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/rules")
    public ResponseEntity<ObjectNode> getRules(
            @Parameter(description = "Optional filter by rule type") @RequestParam(required = false) String ruleType,
            @Parameter(description = "Page number (0-based)") @RequestParam(required = false, defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(required = false, defaultValue = "20") int size,
            @Parameter(description = "Search filter for ruleId") @RequestParam(required = false) String search) {
        try {
            JsonNode allRules = ruleService.getRules(ruleType);
            
            // Convert to list
            List<JsonNode> rulesList = new ArrayList<>();
            allRules.forEach(rulesList::add);
            
            // Filter by search term if provided
            if (search != null && !search.isEmpty()) {
                String searchLower = search.toLowerCase();
                rulesList = rulesList.stream()
                    .filter(rule -> {
                        String ruleId = rule.has("ruleId") ? rule.get("ruleId").asText().toLowerCase() : "";
                        return ruleId.contains(searchLower);
                    })
                    .collect(Collectors.toList());
            }
            
            int totalElements = rulesList.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            
            // Apply pagination
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            List<JsonNode> pagedRules = start < totalElements 
                ? rulesList.subList(start, end)
                : new ArrayList<>();
            
            // Build paginated response
            ObjectNode response = objectMapper.createObjectNode();
            var contentArray = objectMapper.createArrayNode();
            pagedRules.forEach(contentArray::add);
            
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

    @Operation(summary = "Create new rule", description = "Creates a new rule with server-generated UUID at version 1")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Rule created successfully"),
        @ApiResponse(responseCode = "500", description = "Error creating rule")
    })
    @PostMapping("/rules")
    public ResponseEntity<Map<String, Object>> createRule(
            @Parameter(description = "Rule definition (UUID will be generated)") @RequestBody JsonNode rule) {
        try {
            // Generate UUID server-side
            String uuid = UUID.randomUUID().toString();
            
            // Create mutable copy of rule and inject UUID
            ObjectNode mutableRule = rule.deepCopy();
            mutableRule.put("uuId", uuid);
            mutableRule.put("version", 1); // Always start at version 1
            
            // Get ruleId - try multiple possible locations
            String ruleId = extractRuleId(mutableRule);
            ruleService.saveRule(ruleId, "1", mutableRule);
            
            // Return response with generated UUID
            Map<String, Object> response = new HashMap<>();
            response.put("uuid", uuid);
            response.put("version", 1);
            response.put("ruleId", ruleId);
            response.put("rule", mutableRule);
            response.put("message", "Rule created successfully");
            response.put("createdAt", java.time.Instant.now().toString());
            
            return ResponseEntity.status(201).body(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @Operation(summary = "Update existing rule", description = "Updates a rule by creating a new version")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Rule updated successfully"),
        @ApiResponse(responseCode = "500", description = "Error updating rule")
    })
    @PutMapping("/rules/{uuid}")
    public ResponseEntity<Map<String, Object>> updateRule(
            @Parameter(description = "Rule UUID") @PathVariable String uuid,
            @Parameter(description = "Updated rule definition") @RequestBody JsonNode rule) {
        try {
            // Find current max version for this UUID
            int currentMaxVersion = findMaxVersionForRule(uuid);
            int newVersion = currentMaxVersion + 1;
            
            // Create mutable copy and inject UUID + new version
            ObjectNode mutableRule = rule.deepCopy();
            mutableRule.put("uuId", uuid); // Keep same UUID
            mutableRule.put("version", newVersion);
            
            // Save with new version
            String ruleId = extractRuleId(mutableRule);
            ruleService.saveRule(ruleId, String.valueOf(newVersion), mutableRule);
            
            // Return response
            Map<String, Object> response = new HashMap<>();
            response.put("uuid", uuid);
            response.put("version", newVersion);
            response.put("ruleId", ruleId);
            response.put("rule", mutableRule);
            response.put("message", "Rule updated successfully");
            response.put("updatedAt", java.time.Instant.now().toString());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Helper method to find maximum version for a rule UUID
     */
    private int findMaxVersionForRule(String uuid) throws Exception {
        JsonNode versions = versionService.getVersions(uuid);
        int maxVersion = 0;
        for (JsonNode entry : versions) {
            if (entry.has("version")) {
                maxVersion = Math.max(maxVersion, entry.get("version").asInt());
            }
        }
        return maxVersion;
    }

    /**
     * Helper method to extract rule ID from rule object
     * Tries multiple possible locations for the rule ID
     */
    private String extractRuleId(ObjectNode rule) {
        // Try different possible locations for rule ID
        if (rule.has("ruleId")) {
            return rule.get("ruleId").asText();
        }
        if (rule.has("metadata") && rule.get("metadata").has("id")) {
            return rule.get("metadata").get("id").asText();
        }
        if (rule.has("name")) {
            // Use name as fallback, making it URL-safe
            return rule.get("name").asText().replaceAll("[^a-zA-Z0-9_-]", "-").toLowerCase();
        }
        // Last resort - generate from UUID
        if (rule.has("uuId")) {
            return "rule-" + rule.get("uuId").asText().substring(0, 8);
        }
        // Final fallback
        return "rule-" + System.currentTimeMillis();
    }
}
