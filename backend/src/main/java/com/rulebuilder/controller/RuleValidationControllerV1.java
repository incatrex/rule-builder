package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.rulebuilder.service.RuleValidationService;
import com.rulebuilder.validation.ValidationResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "Rule Validation", description = "APIs for validating rules")
public class RuleValidationControllerV1 {

    @Autowired
    private RuleValidationService validationService;

    @Operation(summary = "Validate a rule", description = "Validates a rule against the JSON schema and business logic rules. Returns comprehensive validation results with schema version, errors, warnings, and metadata.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Validation completed (check response for errors)"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/rules/validate")
    public ResponseEntity<ValidationResult> validateRule(
            @Parameter(description = "Rule definition to validate") @RequestBody JsonNode rule) {
        try {
            ValidationResult validationResult = validationService.validateRule(rule);
            return ResponseEntity.ok(validationResult);
        } catch (Exception e) {
            // Return error as validation result
            ValidationResult errorResult = new ValidationResult("unknown");
            com.rulebuilder.validation.ValidationError error = 
                com.rulebuilder.validation.ValidationError.builder()
                    .severity("error")
                    .code("INTERNAL_SERVER_ERROR")
                    .message("Internal error during validation: " + e.getMessage())
                    .path("")
                    .humanPath("Validation System")
                    .build();
            errorResult.addError(error);
            return ResponseEntity.ok(errorResult);
        }
    }
}
