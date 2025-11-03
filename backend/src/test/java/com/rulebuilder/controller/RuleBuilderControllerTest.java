package com.rulebuilder.controller;

import com.rulebuilder.service.RuleBuilderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RuleBuilderController.class)
public class RuleBuilderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RuleBuilderService ruleBuilderService;

    @Test
    public void testGetFields() throws Exception {
        mockMvc.perform(get("/api/fields"))
                .andExpect(status().isOk());
    }

    @Test
    public void testGetConfig() throws Exception {
        mockMvc.perform(get("/api/config"))
                .andExpect(status().isOk());
    }
}
