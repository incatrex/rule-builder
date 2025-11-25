package com.rulebuilder.service;

import java.util.*;

/**
 * Filters out cascading validation errors from oneOf schema violations.
 * 
 * When a JSON Schema oneOf constraint is violated, the validator reports:
 * 1. The root oneOf error ("should be valid to one and only one schema")
 * 2. All constraint violations from each failed branch
 * 
 * This creates cascades of 7-16 errors per violation. This filter:
 * - Groups errors by exact path
 * - For oneOf cascades, keeps only the most actionable error (enum, pattern)
 * - Removes parent-level oneOf errors when child errors exist
 * - Uses simple string matching (approach from feature/validation-first-attempt)
 */
public class ErrorCascadeFilter {

    /**
     * Result of filtering operation containing filtered errors and suppression metadata
     */
    public static class FilterResult {
        private final List<ValidationError> filteredErrors;
        private final int suppressedCount;
        private final boolean hasHiddenErrors;
        
        public FilterResult(List<ValidationError> filteredErrors, int suppressedCount) {
            this(filteredErrors, suppressedCount, false);
        }
        
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
            return String.format("FilterResult[filtered=%d, suppressed=%d, hasHiddenErrors=%b]",
                    filteredErrors.size(), suppressedCount, hasHiddenErrors);
        }
    }

    /**
     * Filter cascading errors from oneOf violations while preserving legitimate errors
     * 
     * Based on approach from feature/validation-first-attempt branch
     */
    public static FilterResult filterCascadingErrors(List<ValidationError> errors) {
        if (errors == null || errors.isEmpty()) {
            return new FilterResult(errors, 0);
        }

        int originalCount = errors.size();
        
        // Step 0: Deduplicate errors by message (same message = duplicate from multiple schema branches)
        Map<String, ValidationError> deduplicatedByMessage = new LinkedHashMap<>();
        for (ValidationError error : errors) {
            String key = error.getMessage();
            if (key != null && !deduplicatedByMessage.containsKey(key)) {
                deduplicatedByMessage.put(key, error);
            } else if (key == null) {
                // Keep errors without messages
                deduplicatedByMessage.put("no-message-" + System.identityHashCode(error), error);
            }
        }
        
        List<ValidationError> deduplicated = new ArrayList<>(deduplicatedByMessage.values());
        
        // Step 0.5: Group by JSON path and deduplicate errors from different schema branches
        // When oneOf has multiple branches (e.g., Condition vs ConditionGroup), keep only
        // errors from the most relevant branch
        Map<String, List<ValidationError>> errorsByJsonPath = new HashMap<>();
        for (ValidationError error : deduplicated) {
            String path = error.getPath() != null ? error.getPath() : "";
            errorsByJsonPath.computeIfAbsent(path, k -> new ArrayList<>()).add(error);
        }
        
        // For each JSON path with errors from multiple schema definitions, keep only one set
        List<ValidationError> dedupedAcrossBranches = new ArrayList<>();
        for (Map.Entry<String, List<ValidationError>> entry : errorsByJsonPath.entrySet()) {
            List<ValidationError> pathErrors = entry.getValue();
            
            // Group by schema definition (e.g., #/definitions/Condition vs #/definitions/ConditionGroup)
            Map<String, List<ValidationError>> errorsBySchemaDefinition = new HashMap<>();
            for (ValidationError error : pathErrors) {
                String schemaPath = error.getSchemaPath() != null ? error.getSchemaPath() : "";
                // Extract the schema definition (e.g., "#/definitions/Condition" from "#/definitions/Condition/required")
                String schemaDef = schemaPath.contains("/definitions/") 
                    ? schemaPath.substring(0, schemaPath.indexOf("/", schemaPath.indexOf("/definitions/") + 14))
                    : schemaPath;
                errorsBySchemaDefinition.computeIfAbsent(schemaDef, k -> new ArrayList<>()).add(error);
            }
            
            // If all errors come from one schema definition, keep them all
            if (errorsBySchemaDefinition.size() == 1) {
                dedupedAcrossBranches.addAll(pathErrors);
            } else {
                // Multiple schema definitions - this is a oneOf branch mismatch
                // Prefer actionable errors (required, enum, pattern, additionalProperties) over oneOf errors
                // First, collect all actionable errors from all branches
                List<ValidationError> actionableErrors = new ArrayList<>();
                for (List<ValidationError> branchErrors : errorsBySchemaDefinition.values()) {
                    for (ValidationError error : branchErrors) {
                        if ("required".equals(error.getType()) ||
                            "enum".equals(error.getType()) ||
                            "pattern".equals(error.getType()) ||
                            "additionalProperties".equals(error.getType())) {
                            actionableErrors.add(error);
                        }
                    }
                }
                
                // If we have actionable errors, use those (limit to 3)
                if (!actionableErrors.isEmpty()) {
                    dedupedAcrossBranches.addAll(actionableErrors.stream().limit(3).toList());
                } else {
                    // No actionable errors - keep the oneOf error or first branch's errors
                    String firstDef = errorsBySchemaDefinition.keySet().iterator().next();
                    dedupedAcrossBranches.addAll(errorsBySchemaDefinition.get(firstDef));
                }
            }
        }
        
        // Step 1: Group errors by exact path
        Map<String, List<ValidationError>> errorsByPath = new HashMap<>();
        for (ValidationError error : dedupedAcrossBranches) {
            String path = error.getPath() != null ? error.getPath() : "";
            errorsByPath.computeIfAbsent(path, k -> new ArrayList<>()).add(error);
        }
        
        // Step 2: Identify paths with root cause errors (enum, pattern, additionalProperties)
        Set<String> pathsWithRootCause = new HashSet<>();
        for (Map.Entry<String, List<ValidationError>> entry : errorsByPath.entrySet()) {
            boolean hasRootCause = entry.getValue().stream()
                    .anyMatch(e -> "enum".equals(e.getType()) || 
                                   "pattern".equals(e.getType()) ||
                                   "additionalProperties".equals(e.getType()));
            if (hasRootCause) {
                pathsWithRootCause.add(entry.getKey());
            }
        }
        
        List<ValidationError> filtered = new ArrayList<>();
        
        // Step 3: For each path, filter redundant errors
        for (Map.Entry<String, List<ValidationError>> entry : errorsByPath.entrySet()) {
            String path = entry.getKey();
            List<ValidationError> pathErrors = entry.getValue();
            
            // If there's only one error for this path, keep it
            if (pathErrors.size() == 1) {
                filtered.add(pathErrors.get(0));
                continue;
            }
            
            // Check if this is part of a oneOf cascade
            boolean isOneOfCascade = pathErrors.stream()
                    .anyMatch(e -> e.getMessage() != null && 
                             e.getMessage().contains("should be valid to one and only one schema"));
            
            if (isOneOfCascade) {
                // Check if a child path has a root cause error
                boolean childHasRootCause = pathsWithRootCause.stream()
                        .anyMatch(p -> p.startsWith(path + ".") || p.startsWith(path + "["));
                
                // For oneOf cascades, keep only the most actionable error
                filterOneOfCascade(pathErrors, filtered, childHasRootCause);
            } else {
                // Not a oneOf cascade, keep the most actionable error
                ValidationError bestError = findMostActionableError(pathErrors);
                filtered.add(bestError);
            }
        }
        
        // Step 4: Remove parent-level oneOf errors if we have child-level errors
        List<ValidationError> finalFiltered = removeRedundantParentErrors(filtered);
        
        int suppressedCount = originalCount - finalFiltered.size();
        return new FilterResult(finalFiltered, suppressedCount);
    }

    /**
     * For oneOf cascades, keep only:
     * 1. enum errors (tells user what valid values are) - ROOT CAUSE
     * 2. pattern errors (tells user format requirements) - ROOT CAUSE
     * 3. additionalProperties errors (tells user about invalid properties) - ROOT CAUSE
     * 4. required field errors ONLY if no enum/pattern/additionalProperties at this level OR child level
     * 5. OR the oneOf error itself if no actionable error exists
     * 
     * @param childHasRootCause true if a child path has an enum/pattern/additionalProperties error
     */
    private static void filterOneOfCascade(List<ValidationError> pathErrors, List<ValidationError> filtered, boolean childHasRootCause) {
        // Look for root cause errors first (enum, pattern, additionalProperties)
        List<ValidationError> rootCauseErrors = new ArrayList<>();
        
        // Check for enum errors
        pathErrors.stream()
                .filter(e -> "enum".equals(e.getType()))
                .forEach(rootCauseErrors::add);
        
        // Check for pattern errors
        pathErrors.stream()
                .filter(e -> "pattern".equals(e.getType()))
                .forEach(rootCauseErrors::add);
        
        // Check for additionalProperties errors
        pathErrors.stream()
                .filter(e -> "additionalProperties".equals(e.getType()))
                .forEach(rootCauseErrors::add);
        
        // If we have root cause errors, those are sufficient - suppress required
        if (!rootCauseErrors.isEmpty()) {
            filtered.addAll(rootCauseErrors);
            return;
        }
        
        // If a child has root cause, suppress required errors at this level
        if (childHasRootCause) {
            // Don't keep required errors - the child's enum/pattern error explains the problem
            // Just keep the oneOf error if present
            Optional<ValidationError> oneOfError = pathErrors.stream()
                    .filter(e -> e.getMessage() != null && 
                            e.getMessage().contains("should be valid to one and only one schema"))
                    .findFirst();
            
            if (oneOfError.isPresent()) {
                filtered.add(oneOfError.get());
            }
            return;
        }
        
        // No root cause errors at this level or children - keep legitimate required field errors
        // These are legitimate when there's no enum/pattern error to explain the problem
        List<ValidationError> requiredErrors = pathErrors.stream()
                .filter(e -> "required".equals(e.getType()))
                .toList();
        
        if (!requiredErrors.isEmpty()) {
            // Limit to first 3 required errors to avoid overwhelming the user
            List<ValidationError> limitedErrors = requiredErrors.stream().limit(3).toList();
            filtered.addAll(limitedErrors);
            return;
        }
        
        // If no actionable errors, keep the oneOf error itself
        Optional<ValidationError> oneOfError = pathErrors.stream()
                .filter(e -> e.getMessage() != null && 
                        e.getMessage().contains("should be valid to one and only one schema"))
                .findFirst();
        
        if (oneOfError.isPresent()) {
            filtered.add(oneOfError.get());
        } else {
            // Fallback: keep the most actionable error
            filtered.add(findMostActionableError(pathErrors));
        }
    }

    /**
     * Find the most actionable error from a list of errors for the same path
     * Priority: enum > pattern > additionalProperties > type > required > others
     */
    private static ValidationError findMostActionableError(List<ValidationError> errors) {
        for (ValidationError error : errors) {
            if ("enum".equals(error.getType())) {
                return error;
            }
        }
        
        for (ValidationError error : errors) {
            if ("pattern".equals(error.getType())) {
                return error;
            }
        }
        
        for (ValidationError error : errors) {
            if ("additionalProperties".equals(error.getType())) {
                return error;
            }
        }
        
        for (ValidationError error : errors) {
            if ("type".equals(error.getType())) {
                return error;
            }
        }
        
        for (ValidationError error : errors) {
            if ("required".equals(error.getType())) {
                return error;
            }
        }
        
        // Return first error as fallback
        return errors.get(0);
    }

    /**
     * Remove parent-level oneOf errors if we have actionable errors
     * OneOf errors are generic ("should be valid to one and only one schema") and less 
     * actionable than specific errors like "missing required field" or "invalid enum value".
     * 
     * Strategy: If we have ANY actionable errors (non-oneOf), suppress ALL oneOf errors
     * since the actionable errors explain what's actually wrong.
     */
    private static List<ValidationError> removeRedundantParentErrors(List<ValidationError> filtered) {
        // Separate oneOf errors from other errors
        List<ValidationError> oneOfErrors = new ArrayList<>();
        List<ValidationError> actionableErrors = new ArrayList<>();
        
        for (ValidationError error : filtered) {
            if (error.getMessage() != null && 
                error.getMessage().contains("should be valid to one and only one schema")) {
                oneOfErrors.add(error);
            } else {
                actionableErrors.add(error);
            }
        }
        
        // If we have actionable errors, suppress all oneOf errors (they're redundant)
        if (!actionableErrors.isEmpty()) {
            return actionableErrors;
        }
        
        // If we only have oneOf errors, keep them
        return filtered;
    }
}
