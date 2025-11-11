package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class RuleBuilderService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private JsonSchema ruleSchema;

    public RuleBuilderService() {
        try {
            // Load the JSON schema on service initialization
            ClassPathResource schemaResource = new ClassPathResource("static/schemas/rule-schema-v1.0.1.json");
            JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
            this.ruleSchema = factory.getSchema(schemaResource.getInputStream());
        } catch (Exception e) {
            throw new RuntimeException("Failed to load rule schema", e);
        }
    }

    public JsonNode getFields() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/fields.json");
        return objectMapper.readTree(resource.getInputStream());
    }

    public JsonNode getConfig() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/config.json");
        return objectMapper.readTree(resource.getInputStream());
    }

    public JsonNode getRuleTypes() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/ruleTypes.json");
        return objectMapper.readTree(resource.getInputStream());
    }

    public void saveRule(String ruleId, String version, JsonNode rule) throws IOException {
        // Get the rules directory path - use absolute path from project root
        String rulesDir = System.getProperty("user.dir") + "/src/main/resources/static/rules";
        File directory = new File(rulesDir);
        
        // Create directory if it doesn't exist
        if (!directory.exists()) {
            directory.mkdirs();
        }

        // Extract UUID from the rule
        String uuid = rule.has("uuId") ? rule.get("uuId").asText() : "unknown";
        
        // Save with new naming convention: {ruleId}.{uuid}.{version}.json
        String filename = String.format("%s.%s.%s.json", ruleId, uuid, version);
        Path filePath = Paths.get(rulesDir, filename);
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), rule);
    }

    public JsonNode getRule(String ruleId, String uuid, String version) throws IOException {
        String rulesDir = System.getProperty("user.dir") + "/src/main/resources/static/rules";
        String filename = String.format("%s.%s.%s.json", ruleId, uuid, version);
        Path filePath = Paths.get(rulesDir, filename);

        if (Files.exists(filePath)) {
            return objectMapper.readTree(filePath.toFile());
        }
        return null;
    }

    /**
     * Get all rule IDs with their UUIDs and latest versions
     */
    public JsonNode getRuleIds() throws IOException {
        String rulesDir = System.getProperty("user.dir") + "/src/main/resources/static/rules";
        File directory = new File(rulesDir);
        
        if (!directory.exists()) {
            return objectMapper.createArrayNode();
        }

        // Pattern to match {ruleId}.{uuid}.{version}.json
        Pattern pattern = Pattern.compile("^(.+)\\.([0-9a-f-]+)\\.(\\d+)\\.json$");
        Map<String, RuleInfo> ruleMap = new HashMap<>();

        File[] files = directory.listFiles();
        if (files != null) {
            for (File file : files) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.matches()) {
                    String ruleId = matcher.group(1);
                    String uuid = matcher.group(2);
                    int version = Integer.parseInt(matcher.group(3));
                    
                    String key = ruleId + "." + uuid;
                    RuleInfo existing = ruleMap.get(key);
                    
                    if (existing == null || version > existing.version) {
                        ruleMap.put(key, new RuleInfo(ruleId, uuid, version));
                    }
                }
            }
        }

        ArrayNode result = objectMapper.createArrayNode();
        for (RuleInfo ruleInfo : ruleMap.values()) {
            ObjectNode ruleNode = objectMapper.createObjectNode();
            ruleNode.put("ruleId", ruleInfo.ruleId);
            ruleNode.put("uuid", ruleInfo.uuid);
            ruleNode.put("latestVersion", ruleInfo.version);
            result.add(ruleNode);
        }

        return result;
    }

    /**
     * Get all versions for a specific rule UUID
     */
    public JsonNode getRuleVersions(String uuid) throws IOException {
        String rulesDir = System.getProperty("user.dir") + "/src/main/resources/static/rules";
        File directory = new File(rulesDir);
        
        if (!directory.exists()) {
            return objectMapper.createArrayNode();
        }

        // Pattern to match any ruleId with the specific UUID
        Pattern pattern = Pattern.compile("^(.+)\\." + Pattern.quote(uuid) + "\\.(\\d+)\\.json$");
        List<Integer> versions = new ArrayList<>();

        File[] files = directory.listFiles();
        if (files != null) {
            for (File file : files) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.matches()) {
                    int version = Integer.parseInt(matcher.group(2));
                    versions.add(version);
                }
            }
        }

        // Sort versions in descending order (newest first)
        versions.sort(Collections.reverseOrder());

        ArrayNode result = objectMapper.createArrayNode();
        for (Integer version : versions) {
            result.add(version);
        }

        return result;
    }

    /**
     * Helper class to store rule information
     */
    private static class RuleInfo {
        String ruleId;
        String uuid;
        int version;

        RuleInfo(String ruleId, String uuid, int version) {
            this.ruleId = ruleId;
            this.uuid = uuid;
            this.version = version;
        }
    }

    /**
     * Validate a rule against the JSON schema
     */
    public JsonNode validateRule(JsonNode rule) {
        Set<ValidationMessage> errors = ruleSchema.validate(rule);
        
        ObjectNode result = objectMapper.createObjectNode();
        result.put("valid", errors.isEmpty());
        
        if (!errors.isEmpty()) {
            ArrayNode errorArray = objectMapper.createArrayNode();
            for (ValidationMessage error : errors) {
                ObjectNode errorNode = objectMapper.createObjectNode();
                errorNode.put("path", error.getPath());
                errorNode.put("message", error.getMessage());
                errorNode.put("type", error.getType());
                errorArray.add(errorNode);
            }
            result.set("errors", errorArray);
        }
        
        return result;
    }
}
