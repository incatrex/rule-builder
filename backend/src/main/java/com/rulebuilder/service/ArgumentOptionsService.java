package com.rulebuilder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for loading and managing argument options for function arguments.
 * Options are loaded from JSON files in the argument-options directory.
 */
@Service
public class ArgumentOptionsService {

    private static final Logger logger = LoggerFactory.getLogger(ArgumentOptionsService.class);
    private static final String OPTIONS_PATH_PREFIX = "classpath:argument-options/";
    private static final String OPTIONS_PATH_SUFFIX = ".json";

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final Map<String, List<Map<String, Object>>> cache;

    public ArgumentOptionsService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = new ObjectMapper();
        this.cache = new HashMap<>();
    }

    /**
     * Get options for a given options reference name.
     * Results are cached after first load.
     *
     * @param optionsRef The options reference name (e.g., "days-of-month", "currencies")
     * @return List of option maps with "value" and "label" keys, or null if not found
     */
    public List<Map<String, Object>> getOptions(String optionsRef) {
        // Check cache first
        if (cache.containsKey(optionsRef)) {
            logger.debug("Returning cached options for: {}", optionsRef);
            return cache.get(optionsRef);
        }

        // Load from file
        String resourcePath = OPTIONS_PATH_PREFIX + optionsRef + OPTIONS_PATH_SUFFIX;
        Resource resource = resourceLoader.getResource(resourcePath);

        if (!resource.exists()) {
            logger.warn("Options file not found: {}", resourcePath);
            return null;
        }

        try (InputStream inputStream = resource.getInputStream()) {
            List<Map<String, Object>> options = objectMapper.readValue(
                    inputStream,
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            // Cache the result
            cache.put(optionsRef, options);
            logger.info("Loaded {} options for: {}", options.size(), optionsRef);

            return options;
        } catch (IOException e) {
            logger.error("Error loading options from: {}", resourcePath, e);
            return null;
        }
    }

    /**
     * Search options by query string.
     * Searches both value and label fields case-insensitively.
     *
     * @param optionsRef The options reference name
     * @param query The search query
     * @return Filtered list of options matching the query
     */
    public List<Map<String, Object>> searchOptions(String optionsRef, String query) {
        List<Map<String, Object>> allOptions = getOptions(optionsRef);

        if (allOptions == null || query == null || query.trim().isEmpty()) {
            return allOptions != null ? allOptions : Collections.emptyList();
        }

        String lowerQuery = query.toLowerCase().trim();

        return allOptions.stream()
                .filter(option -> {
                    Object value = option.get("value");
                    Object label = option.get("label");

                    boolean matchesValue = value != null &&
                            value.toString().toLowerCase().contains(lowerQuery);

                    boolean matchesLabel = label != null &&
                            label.toString().toLowerCase().contains(lowerQuery);

                    return matchesValue || matchesLabel;
                })
                .collect(Collectors.toList());
    }

    /**
     * Clear the cache (useful for testing or reloading).
     */
    public void clearCache() {
        cache.clear();
        logger.info("Options cache cleared");
    }
}
