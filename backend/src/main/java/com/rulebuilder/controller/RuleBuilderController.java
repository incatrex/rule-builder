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

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class RuleBuilderController {

    @Autowired
    private RuleBuilderService ruleBuilderService;

    @Autowired
    private SchemaConfigService schemaConfigService;

    @Autowired
    private OracleSqlGenerator sqlGenerator;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/fields")
    public ResponseEntity<JsonNode> getFields() {
        try {
            JsonNode fields = ruleBuilderService.getFields();
            return ResponseEntity.ok(fields);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/config")
    public ResponseEntity<JsonNode> getConfig() {
        try {
            // Config now generated from schema x-ui-* extensions
            JsonNode config = schemaConfigService.getConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/ruleTypes")
    public ResponseEntity<JsonNode> getRuleTypes() {
        try {
            JsonNode ruleTypes = ruleBuilderService.getRuleTypes();
            return ResponseEntity.ok(ruleTypes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/rules/{ruleId}/{version}")
    public ResponseEntity<String> saveRule(
            @PathVariable String ruleId,
            @PathVariable String version,
            @RequestBody JsonNode rule) {
        try {
            ruleBuilderService.saveRule(ruleId, version, rule);
            return ResponseEntity.ok("Rule saved successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error saving rule: " + e.getMessage());
        }
    }

    @GetMapping("/rules/{ruleId}/{uuid}/{version}")
    public ResponseEntity<JsonNode> getRule(
            @PathVariable String ruleId,
            @PathVariable String uuid,
            @PathVariable String version) {
        try {
            JsonNode rule = ruleBuilderService.getRule(ruleId, uuid, version);
            if (rule != null) {
                return ResponseEntity.ok(rule);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/rules/ids")
    public ResponseEntity<JsonNode> getRuleIds() {
        try {
            JsonNode ruleIds = ruleBuilderService.getRuleIds();
            return ResponseEntity.ok(ruleIds);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/rules/versions/{uuid}")
    public ResponseEntity<JsonNode> getRuleVersions(@PathVariable String uuid) {
        try {
            JsonNode versions = ruleBuilderService.getRuleVersions(uuid);
            return ResponseEntity.ok(versions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/rules/validate")
    public ResponseEntity<JsonNode> validateRule(@RequestBody JsonNode rule) {
        try {
            JsonNode validationResult = ruleBuilderService.validateRule(rule);
            return ResponseEntity.ok(validationResult);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/rules/to-sql")
    public ResponseEntity<ObjectNode> convertRuleToSql(@RequestBody JsonNode rule) {
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

    @GetMapping("/rules/{uuid}/history")
    public ResponseEntity<JsonNode> getRuleHistory(@PathVariable String uuid) {
        try {
            JsonNode history = ruleBuilderService.getRuleHistory(uuid);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/rules/{uuid}/restore/{version}")
    public ResponseEntity<String> restoreRuleVersion(
            @PathVariable String uuid,
            @PathVariable int version) {
        try {
            ruleBuilderService.restoreRuleVersion(uuid, version);
            return ResponseEntity.ok("Rule version restored successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error restoring rule: " + e.getMessage());
        }
    }

    /**
     * Create new rule with server-generated UUID
     * POST /api/rules
     */
    @PostMapping("/rules")
    public ResponseEntity<Map<String, Object>> createRule(@RequestBody JsonNode rule) {
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

    /**
     * Update existing rule (creates new version)
     * PUT /api/rules/{uuid}
     */
    @PutMapping("/rules/{uuid}")
    public ResponseEntity<Map<String, Object>> updateRule(
            @PathVariable String uuid, 
            @RequestBody JsonNode rule) {
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
        JsonNode versions = ruleBuilderService.getRuleVersions(uuid);
        int maxVersion = 0;
        for (JsonNode version : versions) {
            maxVersion = Math.max(maxVersion, version.asInt());
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
