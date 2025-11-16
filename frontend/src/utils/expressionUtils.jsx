/**
 * Utility functions for smart Expression/ExpressionGroup routing
 * Following the aligned ConditionGroup/Condition pattern
 */
import React from 'react';
import Expression from '../Expression';
import ExpressionGroup from '../ExpressionGroup';

/**
 * @deprecated SmartExpression is no longer needed. Use Expression component directly.
 * The Expression component now handles routing internally - it delegates multi-item
 * expressionGroups to ExpressionGroup automatically. This utility is kept for backward
 * compatibility but should not be used in new code.
 * 
 * Smart component that renders either Expression or ExpressionGroup based on data structure
 * @param {Object} props - Component props
 * @param {Object} props.value - Expression data (Expression or ExpressionGroup)
 * @param {Function} props.onChange - Change handler
 * @param {Object} props.config - Configuration
 * @param {string} props.expectedType - Expected return type
 * @param {boolean} props.darkMode - Dark mode
 * @param {boolean} props.compact - Compact mode
 * @param {boolean} props.isLoadedRule - Is loaded rule
 * @param {Array} props.allowedSources - Allowed sources
 * @param {Object} props.propArgDef - Prop arg definition
 * @param {boolean} props.disableOperations - Disable operations
 * @returns {React.Component} Either Expression or ExpressionGroup component
 */
export const SmartExpression = (props) => {
  console.warn('SmartExpression is deprecated. Use Expression component directly instead.');
  const { value, ...otherProps } = props;
  
  // Just delegate to Expression - it handles routing now
  return <Expression value={value} {...otherProps} />;
};

/**
 * Check if data should be rendered as ExpressionGroup (multi-expression)
 * @param {Object} data - Expression data
 * @returns {boolean} True if should use ExpressionGroup component
 */
export const shouldUseExpressionGroup = (data) => {
  return data?.type === 'expressionGroup' && data.expressions?.length > 1;
};

/**
 * Check if data should be rendered as Expression (single expression)
 * @param {Object} data - Expression data  
 * @returns {boolean} True if should use Expression component
 */
export const shouldUseExpression = (data) => {
  return !shouldUseExpressionGroup(data);
};

/**
 * Normalize data for Expression component (handle single-item ExpressionGroups)
 * @param {Object} data - Expression data
 * @returns {Object} Normalized data for Expression component
 */
export const normalizeForExpression = (data) => {
  if (data?.type === 'expressionGroup' && data.expressions?.length === 1) {
    // Single-item ExpressionGroup - return as-is (Expression component will handle unwrapping)
    return data;
  }
  return data;
};

/**
 * Factory function to create single expression wrapped in ExpressionGroup format
 * @param {string} type - Expression type (value, field, function, ruleRef)
 * @param {string} returnType - Return type
 * @param {*} value - Initial value
 * @returns {Object} Single-item ExpressionGroup structure
 */
export const createSingleExpressionGroup = (type = 'value', returnType = 'text', value = '') => {
  const expression = {
    type,
    returnType,
    ...(type === 'value' && { value }),
    ...(type === 'field' && { field: null }),
    ...(type === 'function' && { function: { name: null, args: [] } }),
    ...(type === 'ruleRef' && { id: null, uuid: null, version: 1 })
  };

  return {
    type: 'expressionGroup',
    returnType,
    expressions: [expression],
    operators: []
  };
};

/**
 * Creates a direct expression (not wrapped in ExpressionGroup)
 * Used for schema compliance - single expressions should be direct
 * @param {string} type - Expression type (value, field, function, ruleRef)
 * @param {string} returnType - Return type
 * @param {*} value - Initial value
 * @returns {Object} Direct expression structure
 */
export const createDirectExpression = (type = 'value', returnType = 'text', value = '') => {
  const expression = {
    type,
    returnType,
    ...(type === 'value' && { value }),
    ...(type === 'field' && { field: value || null }),
    ...(type === 'function' && { function: { name: value || null, args: [] } }),
    ...(type === 'ruleRef' && { id: value || null, uuid: null, version: 1 })
  };

  return expression;
};

/**
 * Factory function to create multi-expression ExpressionGroup
 * @param {string} returnType - Return type  
 * @param {Array} expressions - Array of expressions
 * @param {Array} operators - Array of operators
 * @returns {Object} Multi-expression ExpressionGroup structure
 */
export const createMultiExpressionGroup = (returnType = 'number', expressions = [], operators = []) => {
  // Ensure at least 2 expressions
  while (expressions.length < 2) {
    expressions.push({
      type: 'value',
      returnType,
      value: returnType === 'text' ? '' : 0
    });
  }
  
  // Ensure operators array matches expressions (length - 1)
  while (operators.length < expressions.length - 1) {
    operators.push('+');
  }
  
  return {
    type: 'expressionGroup',
    returnType,
    expressions,
    operators
  };
};