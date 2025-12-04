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
 * - Right side ('Condition', 'Condition Group', 'List'): Current schema values (what they're called)
 * 
 * This allows the schema values to change without breaking test logic.
 * 
 * Mappings:
 * - CONDITION: "Condition" type rules (currently 'Condition' in schema)
 * - CONDITION_GROUP: "Condition Group" type rules (currently 'Condition Group' in schema)
 * - LIST: "List" type rules (currently 'List' in schema)
 */
export const TEST_RULE_TYPES = {
  // Boolean-returning rule types
  CONDITION: 'Condition',
  CONDITION_GROUP: 'Condition Group',
  
  // Other rule types
  LIST: 'List',
  REPORTING: 'Reporting',
  TRANSFORMATION: 'Transformation',
  AGGREGATION: 'Aggregation',
  VALIDATION: 'Validation',
  
  // Common arrays for testing
  ALL_BOOLEAN: ['Condition', 'Condition Group'],
  ALL: ['Reporting', 'Transformation', 'Aggregation', 'Validation', 'Condition', 'Condition Group', 'List']
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
 * - defaultName for type 'condition' is 'Condition'
 * 
 * Example of values that SHOULD use this config:
 * - rule.ruleType = TEST_RULE_TYPES.CONDITION (currently 'Condition')
 * - ruleTypeConstraint.value = TEST_RULE_TYPES.CONDITION_GROUP (currently 'Condition Group')
 * - config.ruleTypes array
 */
