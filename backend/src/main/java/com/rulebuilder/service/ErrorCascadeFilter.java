package com.rulebuilder.service;

import java.util.*;
import java.util.stream.Collectors;

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
        
        // Step 1: Group errors by exact path
        Map<String, List<ValidationError>> errorsByPath = new HashMap<>();
        for (ValidationError error : errors) {
            String path = error.getPath() != null ? error.getPath() : "";
            errorsByPath.computeIfAbsent(path, k -> new ArrayList<>()).add(error);
        }
        
        // Step 2: Identify paths with root cause errors (enum, pattern)
        Set<String> pathsWithRootCause = new HashSet<>();
        for (Map.Entry<String, List<ValidationError>> entry : errorsByPath.entrySet()) {
            boolean hasRootCause = entry.getValue().stream()
                    .anyMatch(e -> "enum".equals(e.getType()) || "pattern".equals(e.getType()));
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
     * 3. required field errors ONLY if no enum/pattern at this level OR child level
     * 4. OR the oneOf error itself if no actionable error exists
     * 
     * @param childHasRootCause true if a child path has an enum/pattern error
     */
    private static void filterOneOfCascade(List<ValidationError> pathErrors, List<ValidationError> filtered, boolean childHasRootCause) {
        // Look for root cause errors first (enum, pattern)
        List<ValidationError> rootCauseErrors = new ArrayList<>();
        
        // Check for enum errors
        pathErrors.stream()
                .filter(e -> "enum".equals(e.getType()))
                .forEach(rootCauseErrors::add);
        
        // Check for pattern errors
        pathErrors.stream()
                .filter(e -> "pattern".equals(e.getType()))
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
            filtered.addAll(requiredErrors);
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
     * Priority: enum > pattern > type > required > others
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
     * Remove parent-level oneOf errors if we have child-level errors
     * Example: If we report "$.definition.left.type: invalid enum", 
     * don't also report "$.definition.left: should be valid to one and only one"
     */
    private static List<ValidationError> removeRedundantParentErrors(List<ValidationError> filtered) {
        List<ValidationError> finalFiltered = new ArrayList<>();
        Set<String> childPaths = filtered.stream()
                .map(ValidationError::getPath)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        
        for (ValidationError error : filtered) {
            if (error.getMessage() != null && 
                error.getMessage().contains("should be valid to one and only one schema")) {
                // Check if we have a more specific child error
                String errorPath = error.getPath();
                if (errorPath == null) {
                    finalFiltered.add(error);
                    continue;
                }
                
                boolean hasMoreSpecificChild = childPaths.stream()
                        .anyMatch(p -> p.startsWith(errorPath + ".") || p.startsWith(errorPath + "["));
                
                if (!hasMoreSpecificChild) {
                    finalFiltered.add(error);
                }
            } else {
                finalFiltered.add(error);
            }
        }
        
        return finalFiltered;
    }
}
