/**
 * Centralized factory functions for creating rule data structures.
 * This ensures consistency across the application and provides a single source of truth.
 */

/**
 * Create a base expression with the specified type
 */
export const createExpression = (type = 'value', returnType = 'number', additionalProps = {}) => {
  const baseExpression = {
    type,
    returnType
  };

  // Add type-specific properties
  switch (type) {
    case 'value':
      return { ...baseExpression, value: '', ...additionalProps };
    case 'field':
      return { ...baseExpression, field: null, ...additionalProps };
    case 'function':
      return { 
        ...baseExpression, 
        function: { name: '', args: [] },
        ...additionalProps 
      };
    default:
      return { ...baseExpression, ...additionalProps };
  }
};

/**
 * Create an expression group with the new structure (expressions[] + operators[])
 */
export const createExpressionGroup = (returnType = 'number', initialExpression = null) => {
  const firstExpression = initialExpression || createExpression('value', returnType);
  
  return {
    type: 'expressionGroup',
    returnType,
    expressions: [firstExpression],
    operators: []
  };
};

/**
 * Create a condition
 */
export const createCondition = () => {
  return {
    type: 'condition',
    returnType: 'boolean',
    name: 'Condition 1',
    left: createExpressionGroup('number', createExpression('field', 'number')),
    operator: null,
    right: createExpressionGroup('number', createExpression('value', 'number'))
  };
};

/**
 * Create a condition group
 */
export const createConditionGroup = (name = 'Main Condition') => {
  return {
    type: 'conditionGroup',
    returnType: 'boolean',
    name,
    conjunction: 'AND',
    not: false,
    conditions: []
  };
};

/**
 * Create a when clause for case structures
 */
export const createWhenClause = (clauseNumber = 1) => {
  return {
    when: createConditionGroup(`Condition ${clauseNumber}`),
    then: createExpressionGroup('number', createExpression('value', 'number')),
    resultName: `Result ${clauseNumber}`
  };
};

/**
 * Create a function argument with expression group value
 */
export const createFunctionArgument = (name, argType = 'text', defaultValue = '') => {
  const expression = createExpression('value', argType, { value: defaultValue });
  
  return {
    name,
    value: createExpressionGroup(argType, expression)
  };
};
