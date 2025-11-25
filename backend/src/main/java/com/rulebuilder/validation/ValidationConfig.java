package com.rulebuilder.validation;

/**
 * Configuration for validation behavior
 */
public class ValidationConfig {
    
    private boolean stopOnFirstError;
    private boolean includeWarnings;
    private int maxNestingDepth;
    private boolean validateFieldReferences;
    
    public ValidationConfig() {
        this.stopOnFirstError = false;
        this.includeWarnings = true;
        this.maxNestingDepth = 10;
        this.validateFieldReferences = false;
    }
    
    /**
     * Create default configuration
     */
    public static ValidationConfig defaultConfig() {
        return new ValidationConfig();
    }
    
    /**
     * Create strict configuration (stops on first error)
     */
    public static ValidationConfig strictConfig() {
        ValidationConfig config = new ValidationConfig();
        config.setStopOnFirstError(true);
        return config;
    }
    
    /**
     * Create permissive configuration (no warnings)
     */
    public static ValidationConfig permissiveConfig() {
        ValidationConfig config = new ValidationConfig();
        config.setIncludeWarnings(false);
        return config;
    }
    
    // Getters and setters
    public boolean isStopOnFirstError() {
        return stopOnFirstError;
    }
    
    public void setStopOnFirstError(boolean stopOnFirstError) {
        this.stopOnFirstError = stopOnFirstError;
    }
    
    public boolean isIncludeWarnings() {
        return includeWarnings;
    }
    
    public void setIncludeWarnings(boolean includeWarnings) {
        this.includeWarnings = includeWarnings;
    }
    
    public int getMaxNestingDepth() {
        return maxNestingDepth;
    }
    
    public void setMaxNestingDepth(int maxNestingDepth) {
        this.maxNestingDepth = maxNestingDepth;
    }
    
    public boolean isValidateFieldReferences() {
        return validateFieldReferences;
    }
    
    public void setValidateFieldReferences(boolean validateFieldReferences) {
        this.validateFieldReferences = validateFieldReferences;
    }
}
