package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.rulebuilder.service.RuleBuilderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
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

    @GetMapping("/rules/{ruleId}/{version}")
    public ResponseEntity<JsonNode> getRule(
            @PathVariable String ruleId,
            @PathVariable String version) {
        try {
            JsonNode rule = ruleBuilderService.getRule(ruleId, version);
            if (rule != null) {
                return ResponseEntity.ok(rule);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
