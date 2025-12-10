package com.rulebuilder.controller;

import com.rulebuilder.service.ArgumentOptionsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ArgumentOptionsController.class)
public class ArgumentOptionsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ArgumentOptionsService argumentOptionsService;

    @Test
    public void shouldReturnDaysOfMonthOptions() throws Exception {
        // Given
        List<Map<String, Object>> daysOfMonth = Arrays.asList(
            createOption(1, "1st"),
            createOption(2, "2nd"),
            createOption(3, "3rd")
        );
        when(argumentOptionsService.getOptions("days-of-month")).thenReturn(daysOfMonth);

        // When/Then
        mockMvc.perform(get("/api/v1/rules/ui/config/argument-options/days-of-month"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].value").value(1))
                .andExpect(jsonPath("$[0].label").value("1st"));
    }

    @Test
    public void shouldReturnCurrencyOptions() throws Exception {
        // Given
        List<Map<String, Object>> currencies = Arrays.asList(
            createOption("USD", "US Dollar ($)"),
            createOption("EUR", "Euro (€)")
        );
        when(argumentOptionsService.getOptions("currencies")).thenReturn(currencies);

        // When/Then
        mockMvc.perform(get("/api/v1/rules/ui/config/argument-options/currencies"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].value").value("USD"))
                .andExpect(jsonPath("$[0].label").value("US Dollar ($)"));
    }

    @Test
    public void shouldReturn404ForInvalidOptionsRef() throws Exception {
        // Given
        when(argumentOptionsService.getOptions("invalid-ref")).thenReturn(null);

        // When/Then
        mockMvc.perform(get("/api/v1/rules/ui/config/argument-options/invalid-ref"))
                .andExpect(status().isNotFound());
    }

    @Test
    public void shouldReturnEmptyArrayForMissingFile() throws Exception {
        // Given
        when(argumentOptionsService.getOptions("missing")).thenReturn(Arrays.asList());

        // When/Then
        mockMvc.perform(get("/api/v1/rules/ui/config/argument-options/missing"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    public void shouldSupportSearchParameter() throws Exception {
        // Given
        List<Map<String, Object>> filteredOptions = Arrays.asList(
            createOption("USD", "US Dollar ($)")
        );
        when(argumentOptionsService.searchOptions("currencies", "dollar")).thenReturn(filteredOptions);

        // When/Then
        mockMvc.perform(get("/api/v1/rules/ui/config/argument-options/currencies")
                        .param("q", "dollar"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].value").value("USD"));
    }

    @Test
    public void shouldHandleEmptySearchParameter() throws Exception {
        // Given
        List<Map<String, Object>> allOptions = Arrays.asList(
            createOption("USD", "US Dollar ($)"),
            createOption("EUR", "Euro (€)")
        );
        when(argumentOptionsService.getOptions("currencies")).thenReturn(allOptions);

        // When/Then
        mockMvc.perform(get("/api/v1/rules/ui/config/argument-options/currencies")
                        .param("q", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    private Map<String, Object> createOption(Object value, String label) {
        Map<String, Object> option = new HashMap<>();
        option.put("value", value);
        option.put("label", label);
        return option;
    }
}
