package com.rulebuilder.validation;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;

/**
 * Container for validation results including errors, warnings, and metadata
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ValidationResult {
    
    private boolean valid;
    private List<ValidationError> errors;
    private List<ValidationError> warnings;
    private ValidationMetadata metadata;
    
    public ValidationResult() {
        this.errors = new ArrayList<>();
        this.warnings = new ArrayList<>();
        this.valid = true;
        this.metadata = new ValidationMetadata();
    }
    
    public ValidationResult(String schemaVersion) {
        this();
        this.metadata.setSchemaVersion(schemaVersion);
    }
    
    /**
     * Add an error to the result
     */
    public void addError(ValidationError error) {
        if (error != null) {
            this.errors.add(error);
            this.valid = false;
        }
    }
    
    /**
     * Add multiple errors to the result
     */
    public void addErrors(List<ValidationError> errors) {
        if (errors != null) {
            for (ValidationError error : errors) {
                addError(error);
            }
        }
    }
    
    /**
     * Add a warning to the result
     */
    public void addWarning(ValidationError warning) {
        if (warning != null) {
            this.warnings.add(warning);
        }
    }
    
    /**
     * Add multiple warnings to the result
     */
    public void addWarnings(List<ValidationError> warnings) {
        if (warnings != null) {
            this.warnings.addAll(warnings);
        }
    }
    
    /**
     * Check if there are any errors
     */
    public boolean hasErrors() {
        return !errors.isEmpty();
    }
    
    /**
     * Check if there are critical schema-level errors
     */
    public boolean hasCriticalErrors() {
        return errors.stream().anyMatch(e -> 
            e.getCode() != null && (
                e.getCode().startsWith("MISSING_REQUIRED_") ||
                e.getCode().startsWith("INVALID_TYPE") ||
                e.getCode().startsWith("INVALID_ENUM_")
            )
        );
    }
    
    /**
     * Get count of errors
     */
    public int getErrorCount() {
        return errors.size();
    }
    
    /**
     * Get count of warnings
     */
    public int getWarningCount() {
        return warnings.size();
    }
    
    // Getters and setters
    public boolean isValid() {
        return valid;
    }
    
    public void setValid(boolean valid) {
        this.valid = valid;
    }
    
    public List<ValidationError> getErrors() {
        return errors;
    }
    
    public void setErrors(List<ValidationError> errors) {
        this.errors = errors;
        this.valid = errors.isEmpty();
    }
    
    public List<ValidationError> getWarnings() {
        return warnings;
    }
    
    public void setWarnings(List<ValidationError> warnings) {
        this.warnings = warnings;
    }
    
    public ValidationMetadata getMetadata() {
        return metadata;
    }
    
    public void setMetadata(ValidationMetadata metadata) {
        this.metadata = metadata;
    }
}
