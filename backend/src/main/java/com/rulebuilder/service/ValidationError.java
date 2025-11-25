package com.rulebuilder.service;

import java.util.Map;

/**
 * Represents a validation error from json-schema-validator
 * Maps directly to ValidationMessage properties
 */
public class ValidationError {
    
    private String type;          // Error type (required, type, enum, pattern, oneOf, etc.)
    private String code;          // Error code (numeric string like "1028")
    private String path;          // JSON Path ($.definition.expressions[0].name)
    private String schemaPath;    // Schema location (#/required)
    private String message;       // Human-readable error message
    private Map<String, Object> arguments;  // Additional error arguments
    private Object details;       // Additional details
    private Integer lineNumber;   // Line number in JSON where error occurred (optional)

    public ValidationError() {
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getSchemaPath() {
        return schemaPath;
    }

    public void setSchemaPath(String schemaPath) {
        this.schemaPath = schemaPath;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Map<String, Object> getArguments() {
        return arguments;
    }

    public void setArguments(Map<String, Object> arguments) {
        this.arguments = arguments;
    }

    public Object getDetails() {
        return details;
    }

    public void setDetails(Object details) {
        this.details = details;
    }

    public Integer getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(Integer lineNumber) {
        this.lineNumber = lineNumber;
    }

    @Override
    public String toString() {
        return "ValidationError{" +
                "type='" + type + '\'' +
                ", code='" + code + '\'' +
                ", path='" + path + '\'' +
                ", schemaPath='" + schemaPath + '\'' +
                ", message='" + message + '\'' +
                ", arguments=" + arguments +
                ", details=" + details +
                ", lineNumber=" + lineNumber +
                '}';
    }
}
