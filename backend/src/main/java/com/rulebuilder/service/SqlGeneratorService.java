package com.rulebuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.rulebuilder.util.OracleSqlGenerator;
import org.springframework.stereotype.Service;

/**
 * Service for converting rules to SQL
 * Wraps the OracleSqlGenerator utility class
 */
@Service
public class SqlGeneratorService {

    private final OracleSqlGenerator generator = new OracleSqlGenerator();

    /**
     * Generate Oracle SQL from a rule
     * 
     * @param rule The rule data to convert
     * @return String containing the generated SQL
     * @throws Exception if there's an error generating SQL
     */
    public String generateSql(JsonNode rule) throws Exception {
        return generator.generateSql(rule);
    }

    /**
     * Generate SQL for multiple rules
     * 
     * @param rules Array of rule data
     * @return String containing all generated SQL statements
     * @throws Exception if there's an error generating SQL
     */
    public String generateSqlBatch(JsonNode[] rules) throws Exception {
        StringBuilder result = new StringBuilder();
        
        for (int i = 0; i < rules.length; i++) {
            if (i > 0) {
                result.append("\n\n-- Rule ").append(i + 1).append("\n");
            }
            result.append(generator.generateSql(rules[i]));
        }
        
        return result.toString();
    }
}
