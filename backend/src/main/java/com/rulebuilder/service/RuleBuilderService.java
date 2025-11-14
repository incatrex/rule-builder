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

@Service
public class RuleBuilderService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private JsonSchema ruleSchema;

    public RuleBuilderService() {
        try {
            // Load the JSON schema on service initialization
            ClassPathResource schemaResource = new ClassPathResource("static/schemas/rule-schema-current.json");
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
        
        // Save with new naming convention: {ruleId}[{uuid}][{version}].json
        String filename = String.format("%s[%s][%s].json", ruleId, uuid, version);
        Path filePath = Paths.get(rulesDir, filename);
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), rule);
    }

    public JsonNode getRule(String ruleId, String uuid, String version) throws IOException {
        String rulesDir = System.getProperty("user.dir") + "/src/main/resources/static/rules";
        String filename = String.format("%s[%s][%s].json", ruleId, uuid, version);
        
        // First try root directory (for newly saved rules)
        Path filePath = Paths.get(rulesDir, filename);
        if (Files.exists(filePath)) {
            return objectMapper.readTree(filePath.toFile());
        }
        
        // If not found in root, search recursively in subdirectories
        File rootDir = new File(rulesDir);
        File foundFile = findFileRecursively(rootDir, filename);
        if (foundFile != null && foundFile.exists()) {
            return objectMapper.readTree(foundFile);
        }
        
        return null;
    }

    /**
     * Recursively search for a file by name
     */
    private File findFileRecursively(File directory, String filename) {
        if (!directory.isDirectory()) {
            return null;
        }
        
        File[] files = directory.listFiles();
        if (files == null) {
            return null;
        }
        
        for (File file : files) {
            if (file.isFile() && file.getName().equals(filename)) {
                return file;
            } else if (file.isDirectory()) {
                File found = findFileRecursively(file, filename);
                if (found != null) {
                    return found;
                }
            }
        }
        
        return null;
    }

    /**
     * Get all rule IDs with their UUIDs, latest versions, folder paths, and return types
     */
    public JsonNode getRuleIds() throws IOException {
        String rulesDir = System.getProperty("user.dir") + "/src/main/resources/static/rules";
        File directory = new File(rulesDir);
        
        if (!directory.exists()) {
            return objectMapper.createArrayNode();
        }

        // Pattern to match {ruleId}[{uuid}][{version}].json
        Pattern pattern = Pattern.compile("^(.+)\\[([0-9a-f-]+)\\]\\[(\\d+)\\]\\.json$");
        Map<String, RuleInfo> ruleMap = new HashMap<>();

        // Recursively scan directory and subdirectories
        scanDirectory(directory, directory, pattern, ruleMap);

        ArrayNode result = objectMapper.createArrayNode();
        for (RuleInfo ruleInfo : ruleMap.values()) {
            ObjectNode ruleNode = objectMapper.createObjectNode();
            ruleNode.put("ruleId", ruleInfo.ruleId);
            ruleNode.put("uuid", ruleInfo.uuid);
            ruleNode.put("latestVersion", ruleInfo.version);
            ruleNode.put("folderPath", ruleInfo.folderPath);
            ruleNode.put("returnType", ruleInfo.returnType);
            result.add(ruleNode);
        }

        return result;
    }

    /**
     * Recursively scan directory for rule files
     */
    private void scanDirectory(File rootDir, File currentDir, Pattern pattern, Map<String, RuleInfo> ruleMap) {
        File[] files = currentDir.listFiles();
        if (files == null) return;

        for (File file : files) {
            if (file.isDirectory()) {
                // Recursively scan subdirectories
                scanDirectory(rootDir, file, pattern, ruleMap);
            } else if (file.isFile() && file.getName().endsWith(".json")) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.matches()) {
                    String ruleId = matcher.group(1);
                    String uuid = matcher.group(2);
                    int version = Integer.parseInt(matcher.group(3));
                    
                    // Get relative path from root rules directory
                    String relativePath = rootDir.toPath().relativize(file.getParentFile().toPath()).toString();
                    // Use empty string for root, otherwise the folder path
                    String folderPath = relativePath.isEmpty() ? "" : relativePath.replace("\\", "/");
                    
                    // Read the rule file to get returnType
                    String returnType = "unknown";
                    try {
                        JsonNode ruleJson = objectMapper.readTree(file);
                        if (ruleJson.has("returnType")) {
                            returnType = ruleJson.get("returnType").asText();
                        }
                    } catch (IOException e) {
                        // If we can't read the file, use "unknown"
                    }
                    
                    String key = ruleId + "." + uuid;
                    RuleInfo existing = ruleMap.get(key);
                    
                    if (existing == null || version > existing.version) {
                        ruleMap.put(key, new RuleInfo(ruleId, uuid, version, folderPath, returnType));
                    }
                }
            }
        }
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

        // Pattern to match any ruleId with the specific UUID: {ruleId}[{uuid}][{version}].json
        Pattern pattern = Pattern.compile("^(.+)\\[" + Pattern.quote(uuid) + "\\]\\[(\\d+)\\]\\.json$");
        List<Integer> versions = new ArrayList<>();

        // Recursively scan for all versions
        scanForVersions(directory, pattern, versions);

        // Sort versions in descending order (newest first)
        versions.sort(Collections.reverseOrder());

        ArrayNode result = objectMapper.createArrayNode();
        for (Integer version : versions) {
            result.add(version);
        }

        return result;
    }

    /**
     * Recursively scan directory for version files matching pattern
     */
    private void scanForVersions(File directory, Pattern pattern, List<Integer> versions) {
        File[] files = directory.listFiles();
        if (files == null) return;

        for (File file : files) {
            if (file.isDirectory()) {
                scanForVersions(file, pattern, versions);
            } else if (file.isFile()) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.matches()) {
                    int version = Integer.parseInt(matcher.group(2));
                    versions.add(version);
                }
            }
        }
    }

    /**
     * Helper class to store rule information
     */
    private static class RuleInfo {
        String ruleId;
        String uuid;
        int version;
        String folderPath;
        String returnType;

        RuleInfo(String ruleId, String uuid, int version, String folderPath, String returnType) {
            this.ruleId = ruleId;
            this.uuid = uuid;
            this.version = version;
            this.folderPath = folderPath;
            this.returnType = returnType;
        }
    }

    /**
     * Validate a rule against the JSON schema
     */
    public JsonNode validateRule(JsonNode rule) {
        Set<ValidationMessage> errors = ruleSchema.validate(rule);
        
        ObjectNode result = objectMapper.createObjectNode();
        result.put("valid", errors.isEmpty());
        
        // Add enhanced schema information
        JsonNode schemaNode = ruleSchema.getSchemaNode();
        ObjectNode schemaInfo = objectMapper.createObjectNode();
        
        // Set filename
        schemaInfo.put("filename", "rule-schema-current.json");
        
        // Set schema title
        if (schemaNode.has("title")) {
            schemaInfo.put("title", schemaNode.get("title").asText());
        }
        
        // Set schema version
        if (schemaNode.has("version")) {
            schemaInfo.put("version", schemaNode.get("version").asText());
        }
        
        // Set JSON Schema draft version
        if (schemaNode.has("$schema")) {
            schemaInfo.put("jsonSchemaDraft", schemaNode.get("$schema").asText());
        }
        
        // Set schema ID
        if (schemaNode.has("$id")) {
            schemaInfo.put("id", schemaNode.get("$id").asText());
        }
        
        result.set("schema", schemaInfo);
        
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

    /**
     * Get version history for a specific rule UUID
     */
    public JsonNode getRuleHistory(String uuid) throws IOException {
        String rulesDir = System.getProperty("user.dir") + "/src/main/resources/static/rules";
        File directory = new File(rulesDir);
        
        if (!directory.exists()) {
            return objectMapper.createArrayNode();
        }

        // Pattern to match {ruleId}[{uuid}][{version}].json
        Pattern pattern = Pattern.compile("^(.+)\\[" + Pattern.quote(uuid) + "\\]\\[(\\d+)\\]\\.json$");
        List<RuleHistoryEntry> historyEntries = new ArrayList<>();

        // Recursively scan for all versions
        scanForHistory(directory, pattern, historyEntries);

        // Sort by version descending (newest first)
        historyEntries.sort((a, b) -> Integer.compare(b.version, a.version));

        ArrayNode result = objectMapper.createArrayNode();
        for (RuleHistoryEntry entry : historyEntries) {
            ObjectNode entryNode = objectMapper.createObjectNode();
            entryNode.put("ruleId", entry.ruleId);
            entryNode.put("version", entry.version);
            entryNode.put("modifiedBy", "Lastname, Firstname");
            entryNode.put("modifiedOn", entry.modifiedOn);
            entryNode.put("filePath", entry.filePath);
            result.add(entryNode);
        }

        return result;
    }

    /**
     * Recursively scan directory for rule files matching the pattern
     */
    private void scanForHistory(File directory, Pattern pattern, List<RuleHistoryEntry> historyEntries) {
        File[] files = directory.listFiles();
        if (files == null) return;

        for (File file : files) {
            if (file.isDirectory()) {
                scanForHistory(file, pattern, historyEntries);
            } else if (file.isFile()) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.matches()) {
                    String ruleId = matcher.group(1);
                    int version = Integer.parseInt(matcher.group(2));
                    
                    try {
                        long modifiedTimeMs = Files.getLastModifiedTime(file.toPath()).toMillis();
                        String filePath = file.getAbsolutePath();
                        historyEntries.add(new RuleHistoryEntry(ruleId, version, modifiedTimeMs, filePath));
                    } catch (IOException e) {
                        // Skip files we can't read
                    }
                }
            }
        }
    }

    /**
     * Restore a specific version of a rule by creating a new version
     */
    public void restoreRuleVersion(String uuid, int version) throws IOException {
        String rulesDir = System.getProperty("user.dir") + "/src/main/resources/static/rules";
        File directory = new File(rulesDir);
        
        if (!directory.exists()) {
            throw new IOException("Rules directory does not exist");
        }

        // Pattern to match any ruleId with the specific UUID: {ruleId}[{uuid}][{version}].json
        Pattern sourcePattern = Pattern.compile("^(.+)\\[" + Pattern.quote(uuid) + "\\]\\[" + version + "\\]\\.json$");
        Pattern allVersionsPattern = Pattern.compile("^(.+)\\[" + Pattern.quote(uuid) + "\\]\\[(\\d+)\\]\\.json$");
        
        // Find the source file to restore
        File sourceFile = findFileByPattern(directory, sourcePattern);
        if (sourceFile == null) {
            throw new IOException("Source version not found: " + version);
        }

        // Find the maximum version for this UUID
        int maxVersion = findMaxVersion(directory, allVersionsPattern);
        
        // Read the source rule
        JsonNode ruleContent = objectMapper.readTree(sourceFile);
        
        // Extract ruleId from filename
        Matcher matcher = sourcePattern.matcher(sourceFile.getName());
        if (!matcher.matches()) {
            throw new IOException("Invalid source filename");
        }
        String ruleId = matcher.group(1);
        
        // Save as new version (maxVersion + 1)
        int newVersion = maxVersion + 1;
        saveRule(ruleId, String.valueOf(newVersion), ruleContent);
    }

    /**
     * Find a file matching the given pattern
     */
    private File findFileByPattern(File directory, Pattern pattern) {
        File[] files = directory.listFiles();
        if (files == null) return null;

        for (File file : files) {
            if (file.isDirectory()) {
                File found = findFileByPattern(file, pattern);
                if (found != null) return found;
            } else if (file.isFile() && pattern.matcher(file.getName()).matches()) {
                return file;
            }
        }
        return null;
    }

    /**
     * Find the maximum version for files matching the pattern
     */
    private int findMaxVersion(File directory, Pattern pattern) {
        int maxVersion = 0;
        File[] files = directory.listFiles();
        if (files == null) return maxVersion;

        for (File file : files) {
            if (file.isDirectory()) {
                maxVersion = Math.max(maxVersion, findMaxVersion(file, pattern));
            } else if (file.isFile()) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.matches()) {
                    int version = Integer.parseInt(matcher.group(2));
                    maxVersion = Math.max(maxVersion, version);
                }
            }
        }
        return maxVersion;
    }

    /**
     * Helper class to store rule history entry information
     */
    private static class RuleHistoryEntry {
        String ruleId;
        int version;
        long modifiedOn;
        String filePath;

        RuleHistoryEntry(String ruleId, int version, long modifiedOn, String filePath) {
            this.ruleId = ruleId;
            this.version = version;
            this.modifiedOn = modifiedOn;
            this.filePath = filePath;
        }
    }
}
