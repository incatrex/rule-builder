package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rulebuilder.service.RuleValidationService;
import com.rulebuilder.service.ValidationResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "Rule Validation", description = "APIs for validating rules")
public class RuleValidationControllerV1 {

    @Autowired
    private RuleValidationService validationService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Operation(summary = "Validate a rule", description = "Validates a rule against the JSON schema")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Validation completed (check response for errors)"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/rules/validate")
    public ResponseEntity<ValidationResult> validateRule(
            HttpServletRequest request,
            @Parameter(description = "Calculate line numbers for each error") 
            @RequestParam(required = false, defaultValue = "true") boolean calculateLineNumbers,
            @Parameter(description = "Disable error filtering to see all raw validation errors") 
            @RequestParam(required = false, defaultValue = "false") boolean disableFiltering) {
        try {
            // Read raw request body to preserve formatting for line number calculation
            StringBuilder jsonString = new StringBuilder();
            String line;
            try (BufferedReader reader = request.getReader()) {
                while ((line = reader.readLine()) != null) {
                    jsonString.append(line).append("\n");
                }
            }
            
            String jsonStr = jsonString.toString();
            
            // Parse JSON
            JsonNode rule = objectMapper.readTree(jsonStr);
            
            // Validate with original formatting preserved
            ValidationResult validationResult = validationService.validate(
                rule, 
                jsonStr, 
                calculateLineNumbers, 
                disableFiltering
            );
            return ResponseEntity.ok(validationResult);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
