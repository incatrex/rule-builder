package com.rulebuilder.service;

import java.util.List;

/**
 * Result of schema validation containing metadata and errors
 */
public class ValidationResult {
    
    private String schemaFilename;
    private String schemaVersion;
    private Integer errorCount;
    private List<ValidationError> errors;

    public ValidationResult() {
    }

    public ValidationResult(String schemaFilename, String schemaVersion, 
                          Integer errorCount, List<ValidationError> errors) {
        this.schemaFilename = schemaFilename;
        this.schemaVersion = schemaVersion;
        this.errorCount = errorCount;
        this.errors = errors;
    }

    public String getSchemaFilename() {
        return schemaFilename;
    }

    public void setSchemaFilename(String schemaFilename) {
        this.schemaFilename = schemaFilename;
    }

    public String getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(String schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public Integer getErrorCount() {
        return errorCount;
    }

    public void setErrorCount(Integer errorCount) {
        this.errorCount = errorCount;
    }

    public List<ValidationError> getErrors() {
        return errors;
    }

    public void setErrors(List<ValidationError> errors) {
        this.errors = errors;
    }

    @Override
    public String toString() {
        return "ValidationResult{" +
                "schemaFilename='" + schemaFilename + '\'' +
                ", schemaVersion='" + schemaVersion + '\'' +
                ", errorCount=" + errorCount +
                ", errors=" + errors +
                '}';
    }
}
