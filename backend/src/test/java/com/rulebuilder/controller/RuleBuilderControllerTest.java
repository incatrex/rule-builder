package com.rulebuilder.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class RuleBuilderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testGetFields() throws Exception {
        mockMvc.perform(get("/api/fields"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.TABLE1").exists())
                .andExpect(jsonPath("$.TABLE2").exists());
    }

    @Test
    public void testGetConfig() throws Exception {
        mockMvc.perform(get("/api/config"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.conjunctions").exists())
                .andExpect(jsonPath("$.operators").exists())
                .andExpect(jsonPath("$.widgets").exists());
    }

    @Test
    public void testSaveAndGetRule() throws Exception {
        String ruleJson = "{\"id\":\"test-rule\",\"type\":\"group\"}";
        
        // Save rule
        mockMvc.perform(post("/api/rules/testRule/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(ruleJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        
        // Get rule
        mockMvc.perform(get("/api/rules/testRule/1"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value("test-rule"));
    }

    @Test
    public void testGetNonExistentRule() throws Exception {
        mockMvc.perform(get("/api/rules/nonexistent/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }
}
