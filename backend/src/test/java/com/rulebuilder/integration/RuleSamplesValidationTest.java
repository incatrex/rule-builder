package com.rulebuilder.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rulebuilder.service.RuleValidationService;
import com.rulebuilder.service.XUISemanticValidator;
import com.rulebuilder.service.ValidationResult;
import com.rulebuilder.service.ValidationError;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests that validate all sample rule files in the backend resources.
 * This ensures that all sample rules provided with the application are valid
 * according to the schema and semantic validation rules.
 */
class RuleSamplesValidationTest {

    private RuleValidationService validationService;
    private ObjectMapper objectMapper;
    private static final String SAMPLES_PATH = "src/main/resources/static/rules/samples";

    @BeforeEach
    void setUp() throws IOException {
        XUISemanticValidator xuiValidator = new XUISemanticValidator();
        validationService = new RuleValidationService(xuiValidator);
        objectMapper = new ObjectMapper();
    }

    @TestFactory
    Stream<DynamicTest> validateAllSampleRules() {
        File samplesDir = new File(SAMPLES_PATH);
        
        if (!samplesDir.exists() || !samplesDir.isDirectory()) {
            return Stream.of(DynamicTest.dynamicTest(
                "Samples directory exists",
                () -> fail("Samples directory not found at: " + SAMPLES_PATH)
            ));
        }

        File[] sampleFiles = samplesDir.listFiles((dir, name) -> name.endsWith(".json"));
        
        if (sampleFiles == null || sampleFiles.length == 0) {
            return Stream.of(DynamicTest.dynamicTest(
                "Sample files exist",
                () -> fail("No JSON files found in: " + SAMPLES_PATH)
            ));
        }

        return Stream.of(sampleFiles)
            .map(file -> DynamicTest.dynamicTest(
                "Validate sample: " + file.getName(),
                () -> validateSampleFile(file)
            ));
    }

    private void validateSampleFile(File file) throws IOException {
        String jsonContent = Files.readString(file.toPath());
        JsonNode ruleNode = objectMapper.readTree(jsonContent);

        // Validate the rule
        ValidationResult result = validationService.validate(ruleNode, jsonContent, true, false);

        // If there are errors, print them for debugging
        if (!result.getErrors().isEmpty()) {
            System.out.println("\n=== Validation errors in " + file.getName() + " ===");
            for (ValidationError error : result.getErrors()) {
                System.out.printf("  - %s at %s: %s%n",
                    error.getType(),
                    error.getPath(),
                    error.getMessage()
                );
            }
        }

        // Assert that the sample is valid
        assertEquals(0, result.getErrors().size(),
            file.getName() + " should be valid. Found " + result.getErrors().size() + " error(s)");
    }

    @Test
    void testSamplesDirectoryExists() {
        File samplesDir = new File(SAMPLES_PATH);
        assertTrue(samplesDir.exists(), "Samples directory should exist at: " + SAMPLES_PATH);
        assertTrue(samplesDir.isDirectory(), "Samples path should be a directory");
    }

    @Test
    void testSamplesContainJsonFiles() {
        File samplesDir = new File(SAMPLES_PATH);
        File[] jsonFiles = samplesDir.listFiles((dir, name) -> name.endsWith(".json"));
        
        assertNotNull(jsonFiles, "Should be able to list files in samples directory");
        assertTrue(jsonFiles.length > 0, "Samples directory should contain at least one JSON file");
    }

    @Test
    void testAllSamplesHaveRequiredFields() throws IOException {
        File samplesDir = new File(SAMPLES_PATH);
        File[] sampleFiles = samplesDir.listFiles((dir, name) -> name.endsWith(".json"));
        
        assertNotNull(sampleFiles, "Sample files should be listable");
        
        for (File file : sampleFiles) {
            String jsonContent = Files.readString(file.toPath());
            JsonNode ruleNode = objectMapper.readTree(jsonContent);
            
            // Check required root fields
            assertTrue(ruleNode.has("structure"), file.getName() + " should have 'structure' field");
            assertTrue(ruleNode.has("returnType"), file.getName() + " should have 'returnType' field");
            assertTrue(ruleNode.has("ruleType"), file.getName() + " should have 'ruleType' field");
            assertTrue(ruleNode.has("uuid"), file.getName() + " should have 'uuid' field");
            assertTrue(ruleNode.has("version"), file.getName() + " should have 'version' field");
            assertTrue(ruleNode.has("metadata"), file.getName() + " should have 'metadata' field");
            assertTrue(ruleNode.has("definition"), file.getName() + " should have 'definition' field");
            
            // Check metadata structure
            JsonNode metadata = ruleNode.get("metadata");
            assertTrue(metadata.has("id"), file.getName() + " metadata should have 'id' field");
            assertTrue(metadata.has("description"), file.getName() + " metadata should have 'description' field");
        }
    }
}
