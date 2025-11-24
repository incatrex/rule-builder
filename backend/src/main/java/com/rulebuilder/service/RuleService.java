package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for core rule CRUD operations
 */
@Service
public class RuleService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Save or update a rule
     * 
     * @param ruleId The rule ID
     * @param version The version number
     * @param rule The rule JSON data
     * @throws IOException if the rule cannot be saved
     */
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
        
        // Reorder fields to put uuId and version at the top
        ObjectNode orderedRule = objectMapper.createObjectNode();
        
        // Add uuId and version first
        orderedRule.put("uuId", uuid);
        orderedRule.put("version", version);
        
        // Then add all other fields from the original rule, except uuId and version if they exist
        rule.fields().forEachRemaining(entry -> {
            String key = entry.getKey();
            // Skip uuId and version (already added at top)
            if (!key.equals("uuId") && !key.equals("version")) {
                orderedRule.set(key, entry.getValue());
            }
        });
        
        // Save with naming convention: {ruleId}[{uuid}][{version}].json
        String filename = String.format("%s[%s][%s].json", ruleId, uuid, version);
        Path filePath = Paths.get(rulesDir, filename);
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), orderedRule);
    }

    /**
     * Get a specific rule by ruleId, UUID, and version
     * 
     * @param ruleId The rule ID
     * @param uuid The rule UUID
     * @param version The version number
     * @return JsonNode containing the rule data, or null if not found
     * @throws IOException if there's an error reading the file
     */
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
     * Get all rules with metadata
     * 
     * @param ruleTypeFilter Optional filter by rule type
     * @return JsonNode array containing all rules metadata
     * @throws IOException if there's an error scanning the directory
     */
    public JsonNode getRules(String ruleTypeFilter) throws IOException {
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
        
        // Sort rules alphabetically by folderPath, then by ruleId
        ruleMap.values().stream()
            .filter(ruleInfo -> ruleTypeFilter == null || ruleTypeFilter.isEmpty() || ruleTypeFilter.equals(ruleInfo.ruleType))
            .sorted((r1, r2) -> {
                // First compare by folder path
                int folderCompare = r1.folderPath.compareToIgnoreCase(r2.folderPath);
                if (folderCompare != 0) {
                    return folderCompare;
                }
                // If same folder, compare by ruleId
                return r1.ruleId.compareToIgnoreCase(r2.ruleId);
            })
            .forEach(ruleInfo -> {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("ruleId", ruleInfo.ruleId);
                node.put("uuid", ruleInfo.uuid);
                node.put("latestVersion", ruleInfo.version);
                node.put("folderPath", ruleInfo.folderPath);
                node.put("returnType", ruleInfo.returnType);
                node.put("ruleType", ruleInfo.ruleType);
                result.add(node);
            });

        return result;
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
     * Recursively scan a directory for rule files
     */
    private void scanDirectory(File currentDir, File rootDir, Pattern pattern, Map<String, RuleInfo> ruleMap) {
        File[] files = currentDir.listFiles();
        if (files == null) return;

        for (File file : files) {
            if (file.isDirectory()) {
                scanDirectory(file, rootDir, pattern, ruleMap);
            } else if (file.isFile()) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.matches()) {
                    String ruleId = matcher.group(1);
                    String uuid = matcher.group(2);
                    int version = Integer.parseInt(matcher.group(3));

                    // Get relative folder path
                    String relativePath = rootDir.toPath().relativize(file.getParentFile().toPath()).toString();
                    String folderPath = relativePath.isEmpty() ? "" : relativePath.replace(File.separatorChar, '/');

                    // Read returnType and ruleType from the file
                    String returnType = "unknown";
                    String ruleType = "";
                    try {
                        JsonNode ruleData = objectMapper.readTree(file);
                        if (ruleData.has("returnType")) {
                            returnType = ruleData.get("returnType").asText();
                        }
                        if (ruleData.has("ruleType")) {
                            ruleType = ruleData.get("ruleType").asText();
                        }
                    } catch (IOException e) {
                        // Skip files we can't read
                    }

                    // Track the latest version for each UUID
                    String key = uuid;
                    if (!ruleMap.containsKey(key) || ruleMap.get(key).version < version) {
                        ruleMap.put(key, new RuleInfo(ruleId, uuid, version, folderPath, returnType, ruleType));
                    }
                }
            }
        }
    }

    /**
     * Internal class to track rule information
     */
    private static class RuleInfo {
        String ruleId;
        String uuid;
        int version;
        String folderPath;
        String returnType;
        String ruleType;

        RuleInfo(String ruleId, String uuid, int version, String folderPath, String returnType, String ruleType) {
            this.ruleId = ruleId;
            this.uuid = uuid;
            this.version = version;
            this.folderPath = folderPath;
            this.returnType = returnType;
            this.ruleType = ruleType;
        }
    }
}
