/**
 * Structure Factory Functions
 * 
 * Centralized creation of rule builder structures (conditions, groups, expressions)
 * to ensure consistency and reduce code duplication across components.
 */

import { createDirectExpression } from '../Expression';

/**
 * Creates a default single condition with proper structure
 * 
 * @param {Object} config - Rule builder configuration
 * @param {string} name - Name for the condition
 * @param {string} defaultType - Default return type for expressions (default: 'number')
 * @returns {Object} Condition object
 */
export function createDefaultCondition(config, name, defaultType = 'number') {
  const defaultField = config?.defaultField || 'TABLE1.NUMBER_FIELD_01';
  const defaultOperator = config?.types?.[defaultType]?.defaultConditionOperator || 'equal';
  
  return {
    type: 'condition',
    returnType: 'boolean',
    name,
    left: createDirectExpression('field', defaultType, defaultField),
    operator: defaultOperator,
    right: createDirectExpression('value', defaultType, 0)
  };
}

/**
 * Creates a default condition group with proper structure
 * 
 * @param {Object} config - Rule builder configuration
 * @param {string} name - Name for the group
 * @param {Array} children - Child conditions (if null, creates 2 default conditions)
 * @param {string} conjunction - AND or OR (default: 'AND')
 * @returns {Object} ConditionGroup object
 */
export function createDefaultConditionGroup(config, name, children = null, conjunction = 'AND') {
  const defaultChildren = children || [
    createDefaultCondition(config, 'Condition 1'),
    createDefaultCondition(config, 'Condition 2')
  ];
  
  return {
    type: 'conditionGroup',
    returnType: 'boolean',
    name,
    conjunction,
    not: false,
    conditions: defaultChildren
  };
}

/**
 * Creates a default rule reference structure
 * 
 * @param {string} name - Name for the rule reference (or rule ID if already selected)
 * @returns {Object} RuleRef condition object
 */
export function createDefaultRuleRef(name) {
  return {
    type: 'condition',
    returnType: 'boolean',
    name,
    ruleRef: {
      id: null,
      uuid: null,
      version: 1,
      returnType: 'boolean'
    }
  };
}

/**
 * Creates a default expression with proper structure
 * 
 * @param {string} sourceType - 'value', 'field', 'function', or 'ruleRef'
 * @param {string} returnType - Return type of the expression
 * @param {*} defaultValue - Default value based on source type
 * @param {string} name - Name for the expression (used in Case THEN/ELSE)
 * @returns {Object} Expression object
 */
export function createDefaultExpression(sourceType, returnType, defaultValue = null, name = null) {
  const expression = createDirectExpression(sourceType, returnType, defaultValue);
  
  // Add name if provided (for Case expressions)
  if (name) {
    return { ...expression, name };
  }
  
  return expression;
}

/**
 * Creates a default WHEN clause for Case expressions
 * 
 * @param {Object} config - Rule builder configuration
 * @param {string} conditionName - Name for the WHEN condition
 * @param {string} resultName - Name for the THEN result
 * @param {string} returnType - Return type for the result expression
 * @returns {Object} WhenClause object with when/then
 */
export function createDefaultWhenClause(config, conditionName, resultName, returnType) {
  return {
    when: createDefaultCondition(config, conditionName),
    then: createDefaultExpression('value', returnType, getDefaultValueForType(returnType), resultName)
  };
}

/**
 * Creates a default ELSE clause for Case expressions
 * 
 * @param {string} returnType - Return type for the result expression
 * @param {string} name - Name for the ELSE result (default: "Default")
 * @returns {Object} Expression object for ELSE
 */
export function createDefaultElseClause(returnType, name = 'Default') {
  return createDefaultExpression('value', returnType, getDefaultValueForType(returnType), name);
}

/**
 * Gets default value based on return type
 * 
 * @param {string} returnType - The return type
 * @returns {*} Default value for that type
 */
function getDefaultValueForType(returnType) {
  const defaults = {
    number: 0,
    string: '',
    boolean: false,
    date: null
  };
  
  return defaults[returnType] !== undefined ? defaults[returnType] : null;
}

/**
 * Creates a default Case expression structure
 * 
 * @param {Object} config - Rule builder configuration
 * @param {string} returnType - Return type for the case expression
 * @param {Array} whenClauses - Initial WHEN clauses (if null, creates one default)
 * @returns {Object} Case definition with whenClauses and else
 */
export function createDefaultCaseExpression(config, returnType, whenClauses = null) {
  const defaultWhenClauses = whenClauses || [
    createDefaultWhenClause(config, 'Condition 1', 'Result 1', returnType)
  ];
  
  return {
    whenClauses: defaultWhenClauses,
    else: createDefaultElseClause(returnType, 'Default')
  };
}
