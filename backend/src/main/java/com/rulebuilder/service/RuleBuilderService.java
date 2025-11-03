package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class RuleBuilderService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public JsonNode getFields() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/fields.json");
        return objectMapper.readTree(resource.getInputStream());
    }

    public JsonNode getConfig() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/config.json");
        return objectMapper.readTree(resource.getInputStream());
    }

    public void saveRule(String ruleId, String version, JsonNode rule) throws IOException {
        // Get the rules directory path
        String rulesDir = "backend/src/main/resources/static/rules";
        File directory = new File(rulesDir);
        
        // Create directory if it doesn't exist
        if (!directory.exists()) {
            directory.mkdirs();
        }

        // Save the rule to file
        String filename = String.format("%s.%s.json", ruleId, version);
        Path filePath = Paths.get(rulesDir, filename);
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), rule);
    }

    public JsonNode getRule(String ruleId, String version) throws IOException {
        String rulesDir = "backend/src/main/resources/static/rules";
        String filename = String.format("%s.%s.json", ruleId, version);
        Path filePath = Paths.get(rulesDir, filename);

        if (Files.exists(filePath)) {
            return objectMapper.readTree(filePath.toFile());
        }
        return null;
    }
}
