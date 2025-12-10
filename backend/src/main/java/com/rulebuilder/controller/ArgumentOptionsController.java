package com.rulebuilder.controller;

import com.rulebuilder.service.ArgumentOptionsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for serving dynamic argument options for function arguments.
 * Options are loaded from JSON files and can be filtered by search query.
 */
@RestController
@RequestMapping("/api/v1/rules/ui/config/argument-options")
@CrossOrigin(origins = "*")
@Tag(name = "Rule Builder Config", description = "APIs for UI configuration")
public class ArgumentOptionsController {

    private final ArgumentOptionsService argumentOptionsService;

    @Autowired
    public ArgumentOptionsController(ArgumentOptionsService argumentOptionsService) {
        this.argumentOptionsService = argumentOptionsService;
    }

    /**
     * Get options for a specific options reference.
     * Supports optional search query parameter for filtering.
     *
     * @param optionsRef The options reference name (e.g., "days-of-month", "currencies")
     * @param query Optional search query to filter results
     * @return List of option objects with "value" and "label" properties
     */
    @Operation(summary = "Get argument options", description = "Retrieves dynamic options for function arguments with optional search filtering")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Options retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Options reference not found")
    })
    @GetMapping("/{optionsRef}")
    public ResponseEntity<List<Map<String, Object>>> getArgumentOptions(
            @Parameter(description = "Options reference name (e.g., 'days-of-month', 'currencies')") @PathVariable String optionsRef,
            @Parameter(description = "Optional search query to filter options") @RequestParam(value = "q", required = false) String query) {

        List<Map<String, Object>> options;

        // If search query provided, use search
        if (query != null && !query.trim().isEmpty()) {
            options = argumentOptionsService.searchOptions(optionsRef, query);
        } else {
            options = argumentOptionsService.getOptions(optionsRef);
        }

        if (options == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(options);
    }
}
