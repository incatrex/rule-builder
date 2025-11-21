package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rulebuilder.service.RuleBuilderService;
import com.rulebuilder.service.SchemaConfigService;
import com.rulebuilder.util.OracleSqlGenerator;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// @RestController - DISABLED: Replaced by focused V1 controllers
// Kept for reference during migration period
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "Rule Builder", description = "APIs for managing business rules with versioning and validation")
public class RuleBuilderController {

    @Autowired
    private RuleBuilderService ruleBuilderService;

    @Autowired
    private SchemaConfigService schemaConfigService;

    @Autowired
    private OracleSqlGenerator sqlGenerator;

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
            JsonNode allFields = ruleBuilderService.getFields();
            
            // Convert to array if needed
            java.util.List<JsonNode> fieldsList = new java.util.ArrayList<>();
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
                    .collect(java.util.stream.Collectors.toList());
            }
            
            int totalElements = fieldsList.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            
            // Apply pagination
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            java.util.List<JsonNode> pagedFields = start < totalElements 
                ? fieldsList.subList(start, end)
                : new java.util.ArrayList<>();
            
            // Build paginated response
            ObjectNode response = objectMapper.createObjectNode();
            com.fasterxml.jackson.databind.node.ArrayNode contentArray = objectMapper.createArrayNode();
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

    @Operation(summary = "Get UI configuration", description = "Retrieves UI configuration generated from schema extensions")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved configuration"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/rules/ui/config")
    public ResponseEntity<JsonNode> getConfig() {
        try {
            // Config now generated from schema x-ui-* extensions
            JsonNode config = schemaConfigService.getConfig();
            return ResponseEntity.ok(config);
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
                JsonNode history = ruleBuilderService.getRuleVersions(uuid);
                if (history.isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
                resolvedVersion = String.valueOf(history.get(0).get("version").asInt());
            }
            
            // Get ruleId from history
            JsonNode history = ruleBuilderService.getRuleVersions(uuid);
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
                // If not found in history, use the latest ruleId (rule might have been renamed)
                ruleId = history.get(0).get("ruleId").asText();
            }
            
            JsonNode rule = ruleBuilderService.getRule(ruleId, uuid, resolvedVersion);
            if (rule != null) {
                return ResponseEntity.ok(rule);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

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
            JsonNode allRules = ruleBuilderService.getRules(ruleType);
            
            // Convert to list
            java.util.List<JsonNode> rulesList = new java.util.ArrayList<>();
            allRules.forEach(rulesList::add);
            
            // Filter by search term if provided
            if (search != null && !search.isEmpty()) {
                String searchLower = search.toLowerCase();
                rulesList = rulesList.stream()
                    .filter(rule -> {
                        String ruleId = rule.has("ruleId") ? rule.get("ruleId").asText().toLowerCase() : "";
                        return ruleId.contains(searchLower);
                    })
                    .collect(java.util.stream.Collectors.toList());
            }
            
            int totalElements = rulesList.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            
            // Apply pagination
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            java.util.List<JsonNode> pagedRules = start < totalElements 
                ? rulesList.subList(start, end)
                : new java.util.ArrayList<>();
            
            // Build paginated response
            ObjectNode response = objectMapper.createObjectNode();
            com.fasterxml.jackson.databind.node.ArrayNode contentArray = objectMapper.createArrayNode();
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

    @Operation(summary = "Validate a rule", description = "Validates a rule against the JSON schema")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Validation completed (check response for errors)"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/rules/validate")
    public ResponseEntity<JsonNode> validateRule(
            @Parameter(description = "Rule definition to validate") @RequestBody JsonNode rule) {
        try {
            JsonNode validationResult = ruleBuilderService.validateRule(rule);
            return ResponseEntity.ok(validationResult);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @Operation(summary = "Convert rule to SQL", description = "Generates Oracle SQL from a rule definition")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "SQL generated successfully"),
        @ApiResponse(responseCode = "500", description = "Error generating SQL")
    })
    @PostMapping("/rules/to-sql")
    public ResponseEntity<ObjectNode> convertRuleToSql(
            @Parameter(description = "Rule definition to convert") @RequestBody JsonNode rule) {
        try {
            String sql = sqlGenerator.generateSql(rule);
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

    @Operation(summary = "Get rule versions", description = "Retrieves all versions with metadata for a specific rule UUID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved versions"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/rules/{uuid}/versions")
    public ResponseEntity<JsonNode> getRuleVersions(
            @Parameter(description = "Rule UUID") @PathVariable String uuid) {
        try {
            JsonNode history = ruleBuilderService.getRuleVersions(uuid);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @Operation(summary = "Restore rule version", description = "Restores a previous version by creating a new version with the old content")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Rule version restored successfully"),
        @ApiResponse(responseCode = "500", description = "Error restoring rule")
    })
    @PostMapping("/rules/{uuid}/restore/{version}")
    public ResponseEntity<String> restoreRuleVersion(
            @Parameter(description = "Rule UUID") @PathVariable String uuid,
            @Parameter(description = "Version number to restore") @PathVariable int version) {
        try {
            ruleBuilderService.restoreRuleVersion(uuid, version);
            return ResponseEntity.ok("Rule version restored successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error restoring rule: " + e.getMessage());
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
            com.fasterxml.jackson.databind.node.ObjectNode mutableRule = rule.deepCopy();
            mutableRule.put("uuId", uuid);
            mutableRule.put("version", 1); // Always start at version 1
            
            // Get ruleId - try multiple possible locations
            String ruleId = extractRuleId(mutableRule);
            ruleBuilderService.saveRule(ruleId, "1", mutableRule);
            
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
            com.fasterxml.jackson.databind.node.ObjectNode mutableRule = rule.deepCopy();
            mutableRule.put("uuId", uuid); // Keep same UUID
            mutableRule.put("version", newVersion);
            
            // Save with new version
            String ruleId = extractRuleId(mutableRule);
            ruleBuilderService.saveRule(ruleId, String.valueOf(newVersion), mutableRule);
            
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
        JsonNode history = ruleBuilderService.getRuleVersions(uuid);
        int maxVersion = 0;
        for (JsonNode entry : history) {
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
