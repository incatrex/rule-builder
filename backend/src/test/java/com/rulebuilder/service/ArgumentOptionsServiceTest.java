package com.rulebuilder.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ArgumentOptionsServiceTest {

    private ArgumentOptionsService service;
    private ResourceLoader resourceLoader;

    @BeforeEach
    public void setUp() {
        resourceLoader = mock(ResourceLoader.class);
        service = new ArgumentOptionsService(resourceLoader);
    }

    @Test
    public void shouldLoadDaysOfMonthFromFile() {
        // Given
        Resource resource = new ClassPathResource("argument-options/days-of-month.json");
        when(resourceLoader.getResource("classpath:argument-options/days-of-month.json"))
                .thenReturn(resource);

        // When
        List<Map<String, Object>> options = service.getOptions("days-of-month");

        // Then
        assertNotNull(options);
        assertEquals(31, options.size());
        assertEquals(1, options.get(0).get("value"));
        assertEquals("1st", options.get(0).get("label"));
        assertEquals(31, options.get(30).get("value"));
        assertEquals("31st", options.get(30).get("label"));
    }

    @Test
    public void shouldLoadCurrenciesFromFile() {
        // Given
        Resource resource = new ClassPathResource("argument-options/currencies.json");
        when(resourceLoader.getResource("classpath:argument-options/currencies.json"))
                .thenReturn(resource);

        // When
        List<Map<String, Object>> options = service.getOptions("currencies");

        // Then
        assertNotNull(options);
        assertTrue(options.size() >= 5);
        assertEquals("USD", options.get(0).get("value"));
        assertTrue(options.get(0).get("label").toString().contains("Dollar"));
    }

    @Test
    public void shouldReturnNullForInvalidOptionsRef() {
        // Given
        Resource resource = mock(Resource.class);
        when(resourceLoader.getResource(anyString())).thenReturn(resource);
        when(resource.exists()).thenReturn(false);

        // When
        List<Map<String, Object>> options = service.getOptions("invalid-ref");

        // Then
        assertNull(options);
    }

    @Test
    public void shouldCacheOptionsAfterFirstLoad() {
        // Given
        Resource resource = new ClassPathResource("argument-options/currencies.json");
        when(resourceLoader.getResource("classpath:argument-options/currencies.json"))
                .thenReturn(resource);

        // When
        List<Map<String, Object>> options1 = service.getOptions("currencies");
        List<Map<String, Object>> options2 = service.getOptions("currencies");

        // Then
        assertSame(options1, options2, "Should return cached instance");
        verify(resourceLoader, times(1)).getResource(anyString());
    }

    @Test
    public void shouldSearchOptionsWithCaseInsensitive() {
        // Given
        Resource resource = new ClassPathResource("argument-options/currencies.json");
        when(resourceLoader.getResource("classpath:argument-options/currencies.json"))
                .thenReturn(resource);

        // When
        List<Map<String, Object>> results = service.searchOptions("currencies", "dollar");

        // Then
        assertNotNull(results);
        assertTrue(results.size() > 0);
        assertTrue(results.get(0).get("label").toString().toLowerCase().contains("dollar"));
    }

    @Test
    public void shouldReturnEmptyListForSearchWithNoMatches() {
        // Given
        Resource resource = new ClassPathResource("argument-options/currencies.json");
        when(resourceLoader.getResource("classpath:argument-options/currencies.json"))
                .thenReturn(resource);

        // When
        List<Map<String, Object>> results = service.searchOptions("currencies", "xyz123notfound");

        // Then
        assertNotNull(results);
        assertEquals(0, results.size());
    }

    @Test
    public void shouldSearchBothValueAndLabel() {
        // Given
        Resource resource = new ClassPathResource("argument-options/currencies.json");
        when(resourceLoader.getResource("classpath:argument-options/currencies.json"))
                .thenReturn(resource);

        // When - search by currency code
        List<Map<String, Object>> resultsByCode = service.searchOptions("currencies", "USD");
        // When - search by label
        List<Map<String, Object>> resultsByLabel = service.searchOptions("currencies", "Euro");

        // Then
        assertTrue(resultsByCode.size() > 0);
        assertTrue(resultsByLabel.size() > 0);
    }
}
