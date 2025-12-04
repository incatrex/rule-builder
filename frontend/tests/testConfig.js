/**
 * Centralized Test Configuration
 * 
 * This file contains test constants to avoid hardcoding schema-driven values
 * in test files. When the schema changes, only this file needs to be updated.
 * 
 * IMPORTANT DISTINCTION:
 * - Structure types ('condition', 'conditionGroup', etc.) are part of the rule 
 *   definition and SHOULD remain hardcoded in code and tests
 * - RuleType names are schema-driven and should come from this config
 */

/**
 * Test Rule Types
 * 
 * These map to the ruleTypes defined in your schema configuration.
 * Update these when schema changes to new rule type names.
 * 
 * Variable naming convention:
 * - Left side (CONDITION, CONDITION_GROUP, LIST): SCondition Group/original names (what they represent)
 * - Right side ('TEST_CONDITION', 'TEST_CONDITION_GROUP', 'TEST_LIST'): Current schema values (what they're called)
 * 
 * This allows the schema values to change without breaking test logic.
 * 
 * Mappings:
 * - CONDITION: "TEST_CONDITION" type rules (currently 'TEST_CONDITION' in schema)
 * - CONDITION_GROUP: "TEST_CONDITION_GROUP" type rules (currently 'TEST_CONDITION_GROUP' in schema)
 * - LIST: "TEST_LIST" type rules (currently 'TEST_LIST' in schema)
 */
export const TEST_RULE_TYPES = {
  // Boolean-returning rule types
  CONDITION: 'TEST_CONDITION',
  CONDITION_GROUP: 'TEST_CONDITION_GROUP',
  
  // Other rule types
  LIST: 'TEST_LIST',
  REPORTING: 'Reporting',
  TRANSFORMATION: 'Transformation',
  AGGREGATION: 'Aggregation',
  VALIDATION: 'Validation',
  
  // Common arrays for testing
  ALL_BOOLEAN: ['TEST_CONDITION', 'TEST_CONDITION_GROUP'],
  ALL: ['Reporting', 'Transformation', 'Aggregation', 'Validation', 'TEST_CONDITION', 'TEST_CONDITION_GROUP', 'TEST_LIST']
};

/**
 * Expected Return Types for Rule Types
 * Maps rule types to their expected return types
 */
export const RULE_TYPE_RETURN_TYPES = {
  [TEST_RULE_TYPES.CONDITION]: 'boolean',
  [TEST_RULE_TYPES.CONDITION_GROUP]: 'boolean',
  [TEST_RULE_TYPES.LIST]: 'array',
  [TEST_RULE_TYPES.REPORTING]: 'any',
  [TEST_RULE_TYPES.TRANSFORMATION]: 'any',
  [TEST_RULE_TYPES.AGGREGATION]: 'any',
  [TEST_RULE_TYPES.VALIDATION]: 'any'
};

/**
 * Mock Config for Tests
 * Standard configuration object for component tests
 */
export const TEST_MOCK_CONFIG = {
  ruleTypes: TEST_RULE_TYPES.ALL
};

/**
 * IMPORTANT: Structure Types are NOT part of this config
 * 
 * Structure types like 'condition', 'conditionGroup', 'list' are part of
 * the rule definition itself and should remain hardcoded in code and tests.
 * They are not schema-driven values.
 * 
 * Example of CORRECT hardcoded structure types:
 * - rule.structure.type = 'condition'
 * - rule.structure.type = 'conditionGroup'
 * - defaultName for type 'condition' is 'TEST_CONDITION'
 * 
 * Example of values that SHOULD use this config:
 * - rule.ruleType = TEST_RULE_TYPES.CONDITION (currently 'TEST_CONDITION')
 * - ruleTypeConstraint.value = TEST_RULE_TYPES.CONDITION_GROUP (currently 'TEST_CONDITION_GROUP')
 * - config.ruleTypes array
 */
