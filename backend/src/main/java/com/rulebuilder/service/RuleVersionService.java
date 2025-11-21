package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for managing rule versions (history, restore, compare)
 */
@Service
public class RuleVersionService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get version history for a specific rule UUID
     * 
     * @param uuid The rule UUID
     * @return JsonNode array containing all versions metadata
     * @throws IOException if there's an error scanning the directory
     */
    public JsonNode getVersions(String uuid) throws IOException {
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
            
            // Read the file to get restoredFromVersion if it exists
            try {
                File file = new File(entry.filePath);
                JsonNode ruleData = objectMapper.readTree(file);
                if (ruleData.has("metadata")) {
                    JsonNode metadata = ruleData.get("metadata");
                    if (metadata.has("restoredFromVersion")) {
                        entryNode.put("restoredFromVersion", metadata.get("restoredFromVersion").asInt());
                    }
                    if (metadata.has("ruleSet")) {
                        entryNode.put("ruleSet", metadata.get("ruleSet").asText());
                    }
                }
            } catch (IOException e) {
                // Skip if we can't read the file
            }
            
            result.add(entryNode);
        }

        return result;
    }

    /**
     * Get a specific version of a rule
     * 
     * @param ruleId The rule ID
     * @param uuid The rule UUID
     * @param version The version number (or "latest")
     * @param ruleService Reference to RuleService for fetching rules
     * @return JsonNode containing the rule data
     * @throws IOException if there's an error reading the file
     */
    public JsonNode getVersion(String ruleId, String uuid, String version, RuleService ruleService) throws IOException {
        if ("latest".equalsIgnoreCase(version)) {
            // Get all versions and find the max
            JsonNode versions = getVersions(uuid);
            if (versions.isArray() && versions.size() > 0) {
                int maxVersion = 0;
                for (JsonNode v : versions) {
                    int vNum = v.get("version").asInt();
                    if (vNum > maxVersion) {
                        maxVersion = vNum;
                    }
                }
                version = String.valueOf(maxVersion);
            }
        }
        
        return ruleService.getRule(ruleId, uuid, version);
    }

    /**
     * Restore a specific version of a rule by creating a new version
     * 
     * @param uuid The rule UUID
     * @param version The version number to restore
     * @param ruleService Reference to RuleService for saving rules
     * @throws IOException if there's an error reading or writing files
     */
    public void restoreVersion(String uuid, int version, RuleService ruleService) throws IOException {
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
        
        // New version will be max + 1
        int newVersion = maxVersion + 1;
        
        // Read the source rule
        JsonNode sourceRule = objectMapper.readTree(sourceFile);
        
        // Extract ruleId from source file name
        Matcher matcher = sourcePattern.matcher(sourceFile.getName());
        String ruleId = "";
        if (matcher.matches()) {
            ruleId = matcher.group(1);
        }
        
        // Create a mutable copy of the rule
        ObjectNode mutableRule = (ObjectNode) sourceRule.deepCopy();
        
        // Update version in the rule
        mutableRule.put("version", newVersion);
        
        // Add metadata about restoration
        ObjectNode metadata;
        if (mutableRule.has("metadata")) {
            metadata = (ObjectNode) mutableRule.get("metadata");
        } else {
            metadata = objectMapper.createObjectNode();
            mutableRule.set("metadata", metadata);
        }
        metadata.put("restoredFromVersion", version);
        
        // Save the new version using RuleService
        ruleService.saveRule(ruleId, String.valueOf(newVersion), mutableRule);
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
     * Find a file by pattern recursively
     */
    private File findFileByPattern(File directory, Pattern pattern) {
        File[] files = directory.listFiles();
        if (files == null) return null;

        for (File file : files) {
            if (file.isDirectory()) {
                File found = findFileByPattern(file, pattern);
                if (found != null) return found;
            } else if (file.isFile()) {
                if (pattern.matcher(file.getName()).matches()) {
                    return file;
                }
            }
        }
        return null;
    }

    /**
     * Find the maximum version for a UUID
     */
    private int findMaxVersion(File directory, Pattern pattern) {
        int maxVersion = 0;
        File[] files = directory.listFiles();
        if (files == null) return maxVersion;

        for (File file : files) {
            if (file.isDirectory()) {
                int dirMax = findMaxVersion(file, pattern);
                if (dirMax > maxVersion) {
                    maxVersion = dirMax;
                }
            } else if (file.isFile()) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.matches()) {
                    int version = Integer.parseInt(matcher.group(2));
                    if (version > maxVersion) {
                        maxVersion = version;
                    }
                }
            }
        }
        return maxVersion;
    }

    /**
     * Internal class to track rule history entries
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
