package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.rulebuilder.service.RuleBuilderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3003"})
public class RuleBuilderController {

    @Autowired
    private RuleBuilderService ruleBuilderService;

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
}
