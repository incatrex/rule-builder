/**
 * Type validation utilities for rule builder
 * Centralized logic for checking type consistency
 */

/**
 * Check if a rule has internal type consistency issues
 * (declared returnType vs actual evaluated type)
 * 
 * @param {Object} ruleData - The rule data object
 * @param {string} ruleData.structure - Rule structure (expression, condition, case)
 * @param {string} ruleData.returnType - Declared return type
 * @param {Object} ruleData.definition - Rule definition/content
 * @returns {Object} { hasInternalMismatch: boolean, declaredType: string, evaluatedType: string }
 */
export const checkInternalTypeConsistency = (ruleData) => {
  if (!ruleData) {
    return { hasInternalMismatch: false };
  }

  // Only expression structures can have this type of inconsistency
  // Conditions always return boolean, Cases always return boolean
  if (ruleData.structure !== 'expression') {
    return { hasInternalMismatch: false };
  }

  const definition = ruleData.definition;
  if (!definition) {
    return { hasInternalMismatch: false };
  }

  const declaredType = ruleData.returnType;
  const evaluatedType = definition.returnType;

  // Check if types don't match
  if (evaluatedType && declaredType && declaredType !== evaluatedType) {
    return {
      hasInternalMismatch: true,
      declaredType,
      evaluatedType
    };
  }

  return { hasInternalMismatch: false };
};

/**
 * Get formatted error message for internal type mismatch
 * 
 * @param {string} declaredType - The declared return type
 * @param {string} evaluatedType - The actual evaluated type
 * @param {boolean} verbose - Whether to include detailed explanation
 * @returns {string} Error message
 */
export const getInternalMismatchMessage = (declaredType, evaluatedType, verbose = false) => {
  if (verbose) {
    return `⚠️ Internal Inconsistency: This rule declares return type ${declaredType} but the expression actually evaluates to ${evaluatedType}. Please update the expression or change the return type.`;
  }
  return `⚠️ Rule declares return type ${declaredType} but actually evaluates to ${evaluatedType}`;
};

/**
 * Check if a rule's return type matches expected type in context
 * 
 * @param {string} ruleReturnType - The rule's declared return type
 * @param {string} expectedType - The expected type in current context
 * @returns {Object} { hasContextMismatch: boolean, ruleType: string, expectedType: string }
 */
export const checkContextTypeMatch = (ruleReturnType, expectedType) => {
  if (!ruleReturnType || !expectedType) {
    return { hasContextMismatch: false };
  }

  if (ruleReturnType !== expectedType) {
    return {
      hasContextMismatch: true,
      ruleType: ruleReturnType,
      expectedType
    };
  }

  return { hasContextMismatch: false };
};

/**
 * Get formatted error message for context type mismatch
 * 
 * @param {string} expectedType - The expected type
 * @param {string} actualType - The actual rule type
 * @returns {string} Error message
 */
export const getContextMismatchMessage = (expectedType, actualType) => {
  return `⚠️ Rule expected to return ${expectedType} but evaluates to ${actualType}`;
};
