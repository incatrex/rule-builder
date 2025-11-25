package com.rulebuilder.validation;

import java.util.ArrayList;
import java.util.List;

/**
 * Tracks the current location in the rule tree for error path generation
 */
public class PathContext {
    
    private final List<String> jsonPathSegments;
    private final List<String> humanPathSegments;
    
    public PathContext() {
        this.jsonPathSegments = new ArrayList<>();
        this.humanPathSegments = new ArrayList<>();
    }
    
    private PathContext(List<String> jsonPathSegments, List<String> humanPathSegments) {
        this.jsonPathSegments = new ArrayList<>(jsonPathSegments);
        this.humanPathSegments = new ArrayList<>(humanPathSegments);
    }
    
    /**
     * Push a new path segment onto the stack
     * @param jsonSegment JSON path segment (e.g., "conditions[0]")
     * @param humanSegment Human-readable segment (e.g., "Condition 'Check Age'")
     */
    public void push(String jsonSegment, String humanSegment) {
        if (jsonSegment != null && !jsonSegment.isEmpty()) {
            jsonPathSegments.add(jsonSegment);
        }
        if (humanSegment != null && !humanSegment.isEmpty()) {
            humanPathSegments.add(humanSegment);
        }
    }
    
    /**
     * Pop the last path segment from the stack
     */
    public void pop() {
        if (!jsonPathSegments.isEmpty()) {
            jsonPathSegments.remove(jsonPathSegments.size() - 1);
        }
        if (!humanPathSegments.isEmpty()) {
            humanPathSegments.remove(humanPathSegments.size() - 1);
        }
    }
    
    /**
     * Get the current JSON path
     * @return JSON path string (e.g., "definition.conditions[0].left")
     */
    public String getJsonPath() {
        return String.join(".", jsonPathSegments);
    }
    
    /**
     * Get the current human-readable path
     * @return Human path string (e.g., "Condition Group 'Main' → Condition 'Check Age' → Left Side")
     */
    public String getHumanPath() {
        return String.join(" → ", humanPathSegments);
    }
    
    /**
     * Create a clone of this context
     * @return Cloned PathContext
     */
    public PathContext clone() {
        return new PathContext(this.jsonPathSegments, this.humanPathSegments);
    }
    
    /**
     * Get current depth in the path
     * @return Number of segments in the path
     */
    public int getDepth() {
        return jsonPathSegments.size();
    }
    
    /**
     * Check if path is empty
     * @return true if no segments
     */
    public boolean isEmpty() {
        return jsonPathSegments.isEmpty();
    }
    
    @Override
    public String toString() {
        return "PathContext{" +
                "json='" + getJsonPath() + '\'' +
                ", human='" + getHumanPath() + '\'' +
                '}';
    }
}
