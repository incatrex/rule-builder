package com.rulebuilder.validation;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * Metadata about the validation execution
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ValidationMetadata {
    
    private String validationTime;
    private String schemaVersion;
    private int validatedFields;
    private long validationDurationMs;
    
    public ValidationMetadata() {
        this.validationTime = Instant.now().toString();
    }
    
    public ValidationMetadata(String schemaVersion, int validatedFields, long validationDurationMs) {
        this.validationTime = Instant.now().toString();
        this.schemaVersion = schemaVersion;
        this.validatedFields = validatedFields;
        this.validationDurationMs = validationDurationMs;
    }
    
    // Getters and setters
    public String getValidationTime() {
        return validationTime;
    }
    
    public void setValidationTime(String validationTime) {
        this.validationTime = validationTime;
    }
    
    public String getSchemaVersion() {
        return schemaVersion;
    }
    
    public void setSchemaVersion(String schemaVersion) {
        this.schemaVersion = schemaVersion;
    }
    
    public int getValidatedFields() {
        return validatedFields;
    }
    
    public void setValidatedFields(int validatedFields) {
        this.validatedFields = validatedFields;
    }
    
    public long getValidationDurationMs() {
        return validationDurationMs;
    }
    
    public void setValidationDurationMs(long validationDurationMs) {
        this.validationDurationMs = validationDurationMs;
    }
}
