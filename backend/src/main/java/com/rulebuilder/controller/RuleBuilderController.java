package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class RuleBuilderController {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String RULES_DIR = "rules";

    public RuleBuilderController() {
        // Create rules directory if it doesn't exist
        File rulesDir = new File(RULES_DIR);
        if (!rulesDir.exists()) {
            rulesDir.mkdirs();
        }
    }

    @GetMapping("/fields")
    public ResponseEntity<JsonNode> getFields() {
        try {
            ClassPathResource resource = new ClassPathResource("static/fields.json");
            JsonNode fields = objectMapper.readTree(resource.getInputStream());
            return ResponseEntity.ok(fields);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(objectMapper.createObjectNode().put("error", "Failed to load fields"));
        }
    }

    @GetMapping("/config")
    public ResponseEntity<JsonNode> getConfig() {
        try {
            ClassPathResource resource = new ClassPathResource("static/config.json");
            JsonNode config = objectMapper.readTree(resource.getInputStream());
            return ResponseEntity.ok(config);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(objectMapper.createObjectNode().put("error", "Failed to load config"));
        }
    }

    @PostMapping("/rules/{ruleId}/{version}")
    public ResponseEntity<JsonNode> saveRule(
            @PathVariable String ruleId,
            @PathVariable String version,
            @RequestBody JsonNode rule) {
        try {
            String filename = String.format("%s/%s.%s.json", RULES_DIR, ruleId, version);
            Path path = Paths.get(filename);
            
            // Create parent directories if they don't exist
            Files.createDirectories(path.getParent());
            
            // Write the rule to file
            String jsonString = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(rule);
            Files.writeString(path, jsonString, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            
            return ResponseEntity.ok(objectMapper.createObjectNode()
                    .put("success", true)
                    .put("message", "Rule saved successfully")
                    .put("ruleId", ruleId)
                    .put("version", version));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(objectMapper.createObjectNode()
                            .put("success", false)
                            .put("error", "Failed to save rule: " + e.getMessage()));
        }
    }

    @GetMapping("/rules/{ruleId}/{version}")
    public ResponseEntity<JsonNode> getRule(
            @PathVariable String ruleId,
            @PathVariable String version) {
        try {
            String filename = String.format("%s/%s.%s.json", RULES_DIR, ruleId, version);
            Path path = Paths.get(filename);
            
            if (!Files.exists(path)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(objectMapper.createObjectNode()
                                .put("error", "Rule not found"));
            }
            
            String jsonContent = Files.readString(path);
            JsonNode rule = objectMapper.readTree(jsonContent);
            return ResponseEntity.ok(rule);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(objectMapper.createObjectNode()
                            .put("error", "Failed to load rule: " + e.getMessage()));
        }
    }
}
