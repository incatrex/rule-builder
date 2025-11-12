package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rulebuilder.service.RuleBuilderService;
import com.rulebuilder.util.OracleSqlGenerator;
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
            JsonNode config = ruleBuilderService.getConfig();
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
}
