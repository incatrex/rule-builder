package com.rulebuilder.validation;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/**
 * Represents a single validation error with detailed context
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ValidationError {
    
    private String severity;        // "error" | "warning"
    private String code;            // Error code from catalog
    private String message;         // User-friendly message
    private String path;            // JSON path
    private String humanPath;       // Human-readable path
    private String field;           // Field name
    private Object expectedValues;  // Expected value(s)
    private Object actualValue;     // Actual value
    private String suggestion;      // Fix suggestion
    private Map<String, Object> context; // Additional context
    private Integer lineNumber;     // Line number in JSON (1-indexed)
    private Integer columnNumber;   // Column number in JSON (1-indexed)
    
    public ValidationError() {
    }
    
    public ValidationError(String severity, String code, String message, String path, String humanPath) {
        this.severity = severity;
        this.code = code;
        this.message = message;
        this.path = path;
        this.humanPath = humanPath;
    }
    
    // Builder pattern for easier construction
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private final ValidationError error = new ValidationError();
        
        public Builder severity(String severity) {
            error.severity = severity;
            return this;
        }
        
        public Builder code(String code) {
            error.code = code;
            return this;
        }
        
        public Builder message(String message) {
            error.message = message;
            return this;
        }
        
        public Builder path(String path) {
            error.path = path;
            return this;
        }
        
        public Builder humanPath(String humanPath) {
            error.humanPath = humanPath;
            return this;
        }
        
        public Builder field(String field) {
            error.field = field;
            return this;
        }
        
        public Builder expectedValues(Object expectedValues) {
            error.expectedValues = expectedValues;
            return this;
        }
        
        public Builder actualValue(Object actualValue) {
            error.actualValue = actualValue;
            return this;
        }
        
        public Builder suggestion(String suggestion) {
            error.suggestion = suggestion;
            return this;
        }
        
        public Builder context(Map<String, Object> context) {
            error.context = context;
            return this;
        }
        
        public Builder lineNumber(Integer lineNumber) {
            error.lineNumber = lineNumber;
            return this;
        }
        
        public Builder columnNumber(Integer columnNumber) {
            error.columnNumber = columnNumber;
            return this;
        }
        
        public ValidationError build() {
            return error;
        }
    }
    
    // Getters and setters
    public String getSeverity() {
        return severity;
    }
    
    public void setSeverity(String severity) {
        this.severity = severity;
    }
    
    public String getCode() {
        return code;
    }
    
    public void setCode(String code) {
        this.code = code;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public String getPath() {
        return path;
    }
    
    public void setPath(String path) {
        this.path = path;
    }
    
    public String getHumanPath() {
        return humanPath;
    }
    
    public void setHumanPath(String humanPath) {
        this.humanPath = humanPath;
    }
    
    public String getField() {
        return field;
    }
    
    public void setField(String field) {
        this.field = field;
    }
    
    public Object getExpectedValues() {
        return expectedValues;
    }
    
    public void setExpectedValues(Object expectedValues) {
        this.expectedValues = expectedValues;
    }
    
    public Object getActualValue() {
        return actualValue;
    }
    
    public void setActualValue(Object actualValue) {
        this.actualValue = actualValue;
    }
    
    public String getSuggestion() {
        return suggestion;
    }
    
    public void setSuggestion(String suggestion) {
        this.suggestion = suggestion;
    }
    
    public Map<String, Object> getContext() {
        return context;
    }
    
    public void setContext(Map<String, Object> context) {
        this.context = context;
    }
    
    public Integer getLineNumber() {
        return lineNumber;
    }
    
    public void setLineNumber(Integer lineNumber) {
        this.lineNumber = lineNumber;
    }
    
    public Integer getColumnNumber() {
        return columnNumber;
    }
    
    public void setColumnNumber(Integer columnNumber) {
        this.columnNumber = columnNumber;
    }
}
