package com.rulebuilder.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rulebuilder.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests that validate frontend test fixtures against the backend validation service.
 * These tests ensure that the comprehensive sample rules used in frontend tests are actually
 * valid according to the schema and all semantic validation rules.
 * 
 * These fixtures demonstrate all operators, functions, and rule structures.
 */
class FixtureValidationTest {

    private RuleValidationService validationService;
    private ObjectMapper objectMapper;
    private static final String FIXTURES_PATH = "../frontend/src/tests/fixtures/";

    @BeforeEach
    void setUp() throws IOException {
        XUISemanticValidator xuiValidator = new XUISemanticValidator();
        validationService = new RuleValidationService(xuiValidator);
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("simple-condition.json should pass all validation")
    void testSimpleConditionFixture() throws IOException {
        Path fixturePath = Paths.get(FIXTURES_PATH, "simple-condition.json");
        File fixtureFile = fixturePath.toFile();
        
        // Skip if fixture file doesn't exist (may not be in all test environments)
        if (!fixtureFile.exists()) {
            System.out.println("⚠️  Skipping: simple-condition.json not found at " + fixturePath.toAbsolutePath());
            return;
        }

        JsonNode rule = objectMapper.readTree(fixtureFile);
        String jsonString = objectMapper.writeValueAsString(rule);
        
        ValidationResult result = validationService.validate(rule, jsonString, true, false);
        
        // Should have zero validation errors
        if (result.getErrorCount() > 0) {
            System.out.println("Validation errors found:");
            for (ValidationError error : result.getErrors()) {
                System.out.println("  - " + error.getType() + " at " + error.getPath() + ": " + error.getMessage());
            }
        }
        
        assertEquals(0, result.getErrorCount(), 
            "simple-condition.json should be valid. Found " + result.getErrorCount() + " error(s)");
    }

    @Test
    @DisplayName("math-expression.json should pass all validation")
    void testMathExpressionFixture() throws IOException {
        Path fixturePath = Paths.get(FIXTURES_PATH, "math-expression.json");
        File fixtureFile = fixturePath.toFile();
        
        if (!fixtureFile.exists()) {
            System.out.println("⚠️  Skipping: math-expression.json not found at " + fixturePath.toAbsolutePath());
            return;
        }

        JsonNode rule = objectMapper.readTree(fixtureFile);
        String jsonString = objectMapper.writeValueAsString(rule);
        
        ValidationResult result = validationService.validate(rule, jsonString, true, false);
        
        if (result.getErrorCount() > 0) {
            System.out.println("Validation errors found:");
            for (ValidationError error : result.getErrors()) {
                System.out.println("  - " + error.getType() + " at " + error.getPath() + ": " + error.getMessage());
            }
        }
        
        assertEquals(0, result.getErrorCount(), 
            "math-expression.json should be valid. Found " + result.getErrorCount() + " error(s)");
    }

    @Test
    @DisplayName("case-expression.json should pass all validation")
    void testCaseExpressionFixture() throws IOException {
        Path fixturePath = Paths.get(FIXTURES_PATH, "case-expression.json");
        File fixtureFile = fixturePath.toFile();
        
        if (!fixtureFile.exists()) {
            System.out.println("⚠️  Skipping: case-expression.json not found at " + fixturePath.toAbsolutePath());
            return;
        }

        JsonNode rule = objectMapper.readTree(fixtureFile);
        String jsonString = objectMapper.writeValueAsString(rule);
        
        ValidationResult result = validationService.validate(rule, jsonString, true, false);
        
        if (result.getErrorCount() > 0) {
            System.out.println("Validation errors found:");
            for (ValidationError error : result.getErrors()) {
                System.out.println("  - " + error.getType() + " at " + error.getPath() + ": " + error.getMessage());
            }
        }
        
        assertEquals(0, result.getErrorCount(), 
            "case-expression.json should be valid. Found " + result.getErrorCount() + " error(s)");
    }

    @Test
    @DisplayName("All fixtures should have valid structure and metadata")
    void testAllFixturesHaveRequiredFields() throws IOException {
        String[] fixtures = {"simple-condition.json", "math-expression.json", "case-expression.json"};
        
        for (String fixtureName : fixtures) {
            Path fixturePath = Paths.get(FIXTURES_PATH, fixtureName);
            File fixtureFile = fixturePath.toFile();
            
            if (!fixtureFile.exists()) {
                System.out.println("⚠️  Skipping: " + fixtureName + " not found");
                continue;
            }

            JsonNode rule = objectMapper.readTree(fixtureFile);
            
            // Verify required top-level fields
            assertTrue(rule.has("structure"), fixtureName + " should have 'structure' field");
            assertTrue(rule.has("returnType"), fixtureName + " should have 'returnType' field");
            assertTrue(rule.has("ruleType"), fixtureName + " should have 'ruleType' field");
            assertTrue(rule.has("uuId"), fixtureName + " should have 'uuId' field");
            assertTrue(rule.has("version"), fixtureName + " should have 'version' field");
            assertTrue(rule.has("metadata"), fixtureName + " should have 'metadata' field");
            assertTrue(rule.has("definition"), fixtureName + " should have 'definition' field");
            
            // Verify metadata structure
            JsonNode metadata = rule.get("metadata");
            assertTrue(metadata.has("id"), fixtureName + " metadata should have 'id' field");
            assertTrue(metadata.has("description"), fixtureName + " metadata should have 'description' field");
            
            System.out.println("✓ " + fixtureName + " has all required fields");
        }
    }

    @Test
    @DisplayName("Fixtures should demonstrate comprehensive feature coverage")
    void testFixtureFeatureCoverage() throws IOException {
        // This test documents what features each fixture demonstrates
        
        Path simpleConditionPath = Paths.get(FIXTURES_PATH, "simple-condition.json");
        if (simpleConditionPath.toFile().exists()) {
            JsonNode rule = objectMapper.readTree(simpleConditionPath.toFile());
            String jsonString = objectMapper.writeValueAsString(rule);
            
            // Verify it contains condition groups
            assertTrue(jsonString.contains("conditionGroup"), "simple-condition should have conditionGroup");
            assertTrue(jsonString.contains("condition"), "simple-condition should have conditions");
            
            // Verify it has various operators
            assertTrue(jsonString.contains("equal") || jsonString.contains("greater"), 
                "simple-condition should have comparison operators");
            
            System.out.println("✓ simple-condition.json demonstrates: conditions, condition groups, operators");
        }
        
        Path mathExpressionPath = Paths.get(FIXTURES_PATH, "math-expression.json");
        if (mathExpressionPath.toFile().exists()) {
            JsonNode rule = objectMapper.readTree(mathExpressionPath.toFile());
            String jsonString = objectMapper.writeValueAsString(rule);
            
            // Verify it contains expression groups and math functions
            assertTrue(jsonString.contains("expressionGroup"), "math-expression should have expressionGroup");
            assertTrue(jsonString.contains("MATH."), "math-expression should have MATH functions");
            
            System.out.println("✓ math-expression.json demonstrates: expression groups, math functions, nested expressions");
        }
        
        Path caseExpressionPath = Paths.get(FIXTURES_PATH, "case-expression.json");
        if (caseExpressionPath.toFile().exists()) {
            JsonNode rule = objectMapper.readTree(caseExpressionPath.toFile());
            String jsonString = objectMapper.writeValueAsString(rule);
            
            // Verify it contains case structure
            assertTrue(jsonString.contains("whenClauses"), "case-expression should have whenClauses");
            assertTrue(jsonString.contains("elseClause"), "case-expression should have elseClause");
            
            System.out.println("✓ case-expression.json demonstrates: case expressions, when/then/else, complex conditions");
        }
    }
}
