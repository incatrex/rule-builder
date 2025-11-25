package com.rulebuilder.service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Filters cascading oneOf errors while preserving legitimate validation errors.
 * 
 * This is schema-dependent logic that understands the structure of rule-schema-current.json.
 * If the schema structure changes significantly, this filtering logic may need updates.
 * 
 * Schema Version Compatibility: 2.0.3
 */
public class ErrorCascadeFilter {
    
    /**
     * Filters cascading errors from validation results
     * 
     * @param originalErrors The full list of errors from json-schema-validator
     * @return FilterResult containing filtered errors and metadata about suppression
     */
    public static FilterResult filterCascadingErrors(List<ValidationError> originalErrors) {
        if (originalErrors == null || originalErrors.isEmpty()) {
            return new FilterResult(originalErrors, 0, false);
        }
        
        List<ValidationError> filtered = new ArrayList<>(originalErrors);
        int suppressedCount = 0;
        
        // Group errors by path prefix to identify oneOf cascades
        Map<String, List<ValidationError>> errorsByPath = originalErrors.stream()
            .collect(Collectors.groupingBy(
                err -> extractPathPrefix(err.getPath()),
                LinkedHashMap::new,
                Collectors.toList()
            ));
        
        // For each path that has oneOf errors, apply filtering
        for (Map.Entry<String, List<ValidationError>> entry : errorsByPath.entrySet()) {
            String pathPrefix = entry.getKey();
            List<ValidationError> pathErrors = entry.getValue();
            
            // Check if this path has oneOf cascade
            boolean hasOneOfError = pathErrors.stream().anyMatch(e -> "oneOf".equals(e.getType()));
            
            if (hasOneOfError && pathErrors.size() > 1) {
                // This is a cascade - apply smart filtering
                List<ValidationError> suppressed = filterOneOfCascade(pathErrors, originalErrors);
                filtered.removeAll(suppressed);
                suppressedCount += suppressed.size();
            }
        }
        
        // Detect if we accidentally suppressed ALL errors at a path (dangerous!)
        boolean hasHiddenErrors = detectHiddenErrors(originalErrors, filtered);
        
        return new FilterResult(filtered, suppressedCount, hasHiddenErrors);
    }
    
    /**
     * Filters errors in a oneOf cascade, keeping only relevant ones
     */
    private static List<ValidationError> filterOneOfCascade(List<ValidationError> pathErrors, List<ValidationError> allErrors) {
        List<ValidationError> toSuppress = new ArrayList<>();
        
        // Keep the first oneOf error (explains the root issue)
        ValidationError oneOfError = pathErrors.stream()
            .filter(e -> "oneOf".equals(e.getType()))
            .findFirst()
            .orElse(null);
        
        // Determine which oneOf branch the user is targeting (based on 'type' field if present)
        String targetType = determineTargetType(pathErrors, allErrors);
        
        for (ValidationError error : pathErrors) {
            // Suppress additional oneOf errors (keep only first)
            if ("oneOf".equals(error.getType()) && error != oneOfError) {
                toSuppress.add(error);
            }
            // Suppress const errors (these show all failed oneOf branches)
            else if ("const".equals(error.getType())) {
                toSuppress.add(error);
            }
            // Suppress required/additionalProperties for non-target branches
            else if (shouldSuppressForBranch(error, targetType)) {
                toSuppress.add(error);
            }
        }
        
        return toSuppress;
    }
    
    /**
     * Determines which oneOf branch the user is targeting based on 'type' field value
     */
    private static String determineTargetType(List<ValidationError> pathErrors, List<ValidationError> allErrors) {
        // Look for errors that mention specific types in their paths
        for (ValidationError error : allErrors) {
            String path = error.getPath();
            
            // Check if this is a type field error with a specific value
            if (path != null && path.endsWith(".type") && error.getArguments() != null) {
                Object arg0 = error.getArguments().get("arg0");
                if (arg0 instanceof String) {
                    String typeValue = (String) arg0;
                    // If it's an invalid enum, that's still the user's intent
                    if (typeValue != null && !typeValue.isEmpty()) {
                        return typeValue;
                    }
                }
            }
        }
        
        // No clear target type identified
        return null;
    }
    
    /**
     * Determines if an error should be suppressed because it's from a non-target oneOf branch
     */
    private static boolean shouldSuppressForBranch(ValidationError error, String targetType) {
        if (targetType == null) {
            // Can't determine target, be conservative - don't suppress required/additionalProperties
            return false;
        }
        
        String message = error.getMessage();
        if (message == null) {
            return false;
        }
        
        // Suppress required errors for fields not related to target type
        if ("required".equals(error.getType())) {
            return !isRequiredForType(message, targetType);
        }
        
        // Suppress additionalProperties errors for fields that would be valid in target type
        if ("additionalProperties".equals(error.getType())) {
            return isAdditionalPropertyForOtherType(message, targetType);
        }
        
        return false;
    }
    
    /**
     * Checks if a required field error is relevant to the target type
     */
    private static boolean isRequiredForType(String message, String targetType) {
        // Map types to their required fields
        Map<String, Set<String>> typeRequirements = Map.of(
            "value", Set.of("value"),
            "field", Set.of("field"),
            "function", Set.of("function"),
            "ruleRef", Set.of("id", "uuid", "version"),
            "expressionGroup", Set.of("expressions", "operators"),
            "condition", Set.of("left", "operator", "right", "name"),
            "conditionGroup", Set.of("conjunction", "not", "conditions", "name")
        );
        
        Set<String> requiredFields = typeRequirements.getOrDefault(targetType, Collections.emptySet());
        
        // Check if message mentions a field required for this type
        for (String field : requiredFields) {
            if (message.contains("." + field + ":") || message.contains("." + field + " ")) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Checks if an additionalProperties error is for a field valid in another type
     */
    private static boolean isAdditionalPropertyForOtherType(String message, String targetType) {
        // If targeting "value" type but message complains about "field" property, suppress
        // (field is valid for "field" type but not "value" type)
        
        String[] typeSpecificFields = {"value", "field", "function", "expressions", "operators", 
                                       "left", "right", "operator", "conjunction", "conditions"};
        
        for (String field : typeSpecificFields) {
            if (message.contains("." + field + ":")) {
                // This field belongs to another type, suppress it
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Detects if all errors at a path were suppressed (indicates potential problem)
     */
    private static boolean detectHiddenErrors(List<ValidationError> original, List<ValidationError> filtered) {
        // Group by path prefix
        Set<String> originalPaths = original.stream()
            .map(e -> extractPathPrefix(e.getPath()))
            .collect(Collectors.toSet());
        
        Set<String> filteredPaths = filtered.stream()
            .map(e -> extractPathPrefix(e.getPath()))
            .collect(Collectors.toSet());
        
        // Check if any path completely disappeared
        for (String originalPath : originalPaths) {
            if (!filteredPaths.contains(originalPath)) {
                // Path had errors but now has none - possible hidden error
                long originalErrorsAtPath = original.stream()
                    .filter(e -> extractPathPrefix(e.getPath()).equals(originalPath))
                    .count();
                
                // Only flag as hidden if path had non-oneOf errors
                boolean hadNonOneOfErrors = original.stream()
                    .filter(e -> extractPathPrefix(e.getPath()).equals(originalPath))
                    .anyMatch(e -> !"oneOf".equals(e.getType()) && !"const".equals(e.getType()));
                
                if (hadNonOneOfErrors) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Extracts path prefix for grouping (removes array indices and last element)
     */
    private static String extractPathPrefix(String path) {
        if (path == null || path.equals("$")) {
            return "$";
        }
        
        // Remove array indices: $.definition.conditions[0].left -> $.definition.conditions.left
        String normalized = path.replaceAll("\\[\\d+\\]", "");
        
        // For grouping oneOf cascades, we want errors at the same object level
        // So $.definition.type and $.definition.field both map to $.definition
        int lastDot = normalized.lastIndexOf('.');
        if (lastDot > 0) {
            return normalized.substring(0, lastDot);
        }
        
        return normalized;
    }
    
    /**
     * Result of cascade filtering with metadata
     */
    public static class FilterResult {
        private final List<ValidationError> filteredErrors;
        private final int suppressedCount;
        private final boolean hasHiddenErrors;
        
        public FilterResult(List<ValidationError> filteredErrors, int suppressedCount, boolean hasHiddenErrors) {
            this.filteredErrors = filteredErrors;
            this.suppressedCount = suppressedCount;
            this.hasHiddenErrors = hasHiddenErrors;
        }
        
        public List<ValidationError> getFilteredErrors() {
            return filteredErrors;
        }
        
        public int getSuppressedCount() {
            return suppressedCount;
        }
        
        public boolean hasHiddenErrors() {
            return hasHiddenErrors;
        }
        
        @Override
        public String toString() {
            return String.format("FilterResult{filtered=%d, suppressed=%d, hasHidden=%b}", 
                filteredErrors.size(), suppressedCount, hasHiddenErrors);
        }
    }
}
