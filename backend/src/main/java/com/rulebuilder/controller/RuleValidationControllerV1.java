package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.rulebuilder.service.RuleValidationService;
import com.rulebuilder.service.ValidationResult;
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

    @Operation(summary = "Validate a rule", description = "Validates a rule against the JSON schema")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Validation completed (check response for errors)"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/rules/validate")
    public ResponseEntity<ValidationResult> validateRule(
            @Parameter(description = "Rule definition to validate") @RequestBody JsonNode rule,
            @Parameter(description = "Disable error filtering to see all raw validation errors") 
            @RequestParam(required = false, defaultValue = "false") boolean disableFiltering) {
        try {
            ValidationResult validationResult = validationService.validate(rule, disableFiltering);
            return ResponseEntity.ok(validationResult);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
