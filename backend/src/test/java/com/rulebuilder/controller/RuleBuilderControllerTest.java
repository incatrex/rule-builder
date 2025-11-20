package com.rulebuilder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rulebuilder.service.RuleBuilderService;
import com.rulebuilder.service.SchemaConfigService;
import com.rulebuilder.util.OracleSqlGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for RuleBuilderController focusing on the new UUID-generating endpoints
 */
@ExtendWith(MockitoExtension.class)
public class RuleBuilderControllerTest {

    @Mock
    private RuleBuilderService ruleBuilderService;

    @Mock
    private SchemaConfigService schemaConfigService;

    @Mock
    private OracleSqlGenerator sqlGenerator;

    @InjectMocks
    private RuleBuilderController controller;

    private ObjectMapper objectMapper = new ObjectMapper();
    private JsonNode sampleRule;

    @BeforeEach
    void setUp() {
        // Create sample rule for testing
        sampleRule = objectMapper.createObjectNode()
                .put("name", "Test Rule")
                .put("type", "CONDITION")
                .put("returnType", "BOOLEAN")
                .put("ruleId", "test-rule-123");
    }

    @Test
    void testCreateRule_Success() throws Exception {
        // Arrange
        doNothing().when(ruleBuilderService).saveRule(anyString(), anyString(), any(JsonNode.class));

        // Act
        ResponseEntity<Map<String, Object>> response = controller.createRule(sampleRule);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertNotNull(body.get("uuid"), "UUID should be generated");
        assertEquals(1, body.get("version"), "Version should start at 1");
        assertEquals("Rule created successfully", body.get("message"));
        assertNotNull(body.get("createdAt"));
        assertNotNull(body.get("rule"));
        
        // Verify UUID is valid format
        String uuid = (String) body.get("uuid");
        assertTrue(uuid.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"), 
                  "UUID should be in proper format");
        
        // Verify service was called
        verify(ruleBuilderService).saveRule(anyString(), eq("1"), any(JsonNode.class));
    }

    @Test
    void testCreateRule_ServiceThrowsException() throws Exception {
        // Arrange
        doThrow(new RuntimeException("Database error"))
                .when(ruleBuilderService).saveRule(anyString(), anyString(), any(JsonNode.class));

        // Act
        ResponseEntity<Map<String, Object>> response = controller.createRule(sampleRule);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().containsKey("error"));
        assertEquals("Database error", response.getBody().get("error"));
    }

    @Test
    void testUpdateRule_Success() throws Exception {
        // Arrange
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        ArrayNode history = objectMapper.createArrayNode();
        history.add(objectMapper.createObjectNode().put("version", 2));
        history.add(objectMapper.createObjectNode().put("version", 1));
        
        when(ruleBuilderService.getRuleHistory(uuid)).thenReturn(history);
        doNothing().when(ruleBuilderService).saveRule(anyString(), anyString(), any(JsonNode.class));

        // Act
        ResponseEntity<Map<String, Object>> response = controller.updateRule(uuid, sampleRule);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertEquals(uuid, body.get("uuid"), "UUID should be preserved");
        assertEquals(3, body.get("version"), "Version should be incremented to 3");
        assertEquals("Rule updated successfully", body.get("message"));
        assertNotNull(body.get("updatedAt"));
        
        // Verify service was called with new version
        verify(ruleBuilderService).saveRule(anyString(), eq("3"), any(JsonNode.class));
    }

    @Test
    void testUpdateRule_FirstVersion() throws Exception {
        // Arrange
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        JsonNode emptyHistory = objectMapper.createArrayNode();
        
        when(ruleBuilderService.getRuleHistory(uuid)).thenReturn(emptyHistory);
        doNothing().when(ruleBuilderService).saveRule(anyString(), anyString(), any(JsonNode.class));

        // Act
        ResponseEntity<Map<String, Object>> response = controller.updateRule(uuid, sampleRule);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertEquals(1, body.get("version"), "Version should start at 1 for first update");
        
        verify(ruleBuilderService).saveRule(anyString(), eq("1"), any(JsonNode.class));
    }

    @Test
    void testUpdateRule_ServiceThrowsException() throws Exception {
        // Arrange
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        
        when(ruleBuilderService.getRuleHistory(uuid))
                .thenThrow(new RuntimeException("Rule not found"));

        // Act
        ResponseEntity<Map<String, Object>> response = controller.updateRule(uuid, sampleRule);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().containsKey("error"));
        assertEquals("Rule not found", response.getBody().get("error"));
    }

    @Test
    void testFindMaxVersionForRule_WithVersions() throws Exception {
        // Arrange
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        ArrayNode history = objectMapper.createArrayNode();
        history.add(objectMapper.createObjectNode().put("version", 1));
        history.add(objectMapper.createObjectNode().put("version", 3));
        history.add(objectMapper.createObjectNode().put("version", 2));
        history.add(objectMapper.createObjectNode().put("version", 5));
        
        when(ruleBuilderService.getRuleHistory(uuid)).thenReturn(history);

        // Act - Use reflection to test private method
        java.lang.reflect.Method method = controller.getClass().getDeclaredMethod("findMaxVersionForRule", String.class);
        method.setAccessible(true);
        int maxVersion = (int) method.invoke(controller, uuid);

        // Assert
        assertEquals(5, maxVersion, "Should find maximum version");
    }

    @Test
    void testFindMaxVersionForRule_NoVersions() throws Exception {
        // Arrange
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        JsonNode emptyHistory = objectMapper.createArrayNode();
        
        when(ruleBuilderService.getRuleHistory(uuid)).thenReturn(emptyHistory);

        // Act - Use reflection to test private method
        java.lang.reflect.Method method = controller.getClass().getDeclaredMethod("findMaxVersionForRule", String.class);
        method.setAccessible(true);
        int maxVersion = (int) method.invoke(controller, uuid);

        // Assert
        assertEquals(0, maxVersion, "Should return 0 for no versions");
    }

    @Test
    void testRuleUuidInjection_CreateRule() throws Exception {
        // Arrange
        ObjectNode inputRule = objectMapper.createObjectNode();
        inputRule.put("name", "Test Rule");
        inputRule.put("type", "CONDITION");
        inputRule.put("returnType", "BOOLEAN");

        doNothing().when(ruleBuilderService).saveRule(anyString(), anyString(), any(JsonNode.class));

        // Act
        ResponseEntity<Map<String, Object>> response = controller.createRule(inputRule);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        
        ObjectNode savedRule = (ObjectNode) response.getBody().get("rule");
        assertTrue(savedRule.has("uuId"), "Rule should have UUID injected");
        assertTrue(savedRule.has("version"), "Rule should have version injected");
        assertEquals(1, savedRule.get("version").asInt(), "Version should be 1");
        
        // Verify original input was not modified
        assertFalse(inputRule.has("uuId"), "Original input should not be modified");
    }

    @Test
    void testRuleUuidInjection_UpdateRule() throws Exception {
        // Arrange
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        ObjectNode inputRule = objectMapper.createObjectNode();
        inputRule.put("name", "Updated Rule");
        inputRule.put("ruleId", "test-rule-123");
        
        // Input rule might have old UUID/version that should be overwritten
        inputRule.put("uuId", "old-uuid");
        inputRule.put("version", 999);
        
        ArrayNode history = objectMapper.createArrayNode();
        history.add(objectMapper.createObjectNode().put("version", 1));
        when(ruleBuilderService.getRuleHistory(uuid)).thenReturn(history);
        doNothing().when(ruleBuilderService).saveRule(anyString(), anyString(), any(JsonNode.class));

        // Act
        ResponseEntity<Map<String, Object>> response = controller.updateRule(uuid, inputRule);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        ObjectNode savedRule = (ObjectNode) response.getBody().get("rule");
        assertEquals(uuid, savedRule.get("uuId").asText(), "Rule should have correct UUID");
        assertEquals(2, savedRule.get("version").asInt(), "Rule should have incremented version");
        
        // Verify original input still has old values (deep copy used)
        assertEquals("old-uuid", inputRule.get("uuId").asText(), "Original should be unchanged");
        assertEquals(999, inputRule.get("version").asInt(), "Original should be unchanged");
    }

    // Test existing endpoints still work
    @Test
    void testGetFields_Success() throws Exception {
        // Arrange
        JsonNode fields = objectMapper.createArrayNode().add("field1").add("field2");
        when(ruleBuilderService.getFields()).thenReturn(fields);

        // Act
        ResponseEntity<JsonNode> response = controller.getFields();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(fields, response.getBody());
        verify(ruleBuilderService).getFields();
    }

    @Test
    void testGetConfig_Success() throws Exception {
        // Arrange
        JsonNode config = objectMapper.createObjectNode().put("setting", "value");
        when(schemaConfigService.getConfig()).thenReturn(config);

        // Act
        ResponseEntity<JsonNode> response = controller.getConfig();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(config, response.getBody());
        verify(schemaConfigService).getConfig();
    }

    @Test
    void testValidateRule_Success() throws Exception {
        // Arrange
        JsonNode validationResult = objectMapper.createObjectNode().put("valid", true);
        when(ruleBuilderService.validateRule(any(JsonNode.class))).thenReturn(validationResult);

        // Act
        ResponseEntity<JsonNode> response = controller.validateRule(sampleRule);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(validationResult, response.getBody());
        verify(ruleBuilderService).validateRule(sampleRule);
    }
}