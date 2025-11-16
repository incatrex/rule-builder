/**
 * Schema Validation Error Translator
 * 
 * Converts technical JSON schema errors into user-friendly messages
 * that help users understand what needs to be fixed in their rules.
 */

/**
 * Rule-specific error message templates
 * These are organized by JSON path patterns and error types
 */
const ERROR_TRANSLATIONS = {
  // Field-related errors
  field: {
    patterns: [
      {
        path: /\.field$/,
        type: 'null',
        message: 'Please select a field from the dropdown'
      },
      {
        path: /\.field$/,
        type: 'required',
        message: 'A field name is required for this condition'
      }
    ]
  },

  // Operator-related errors  
  operator: {
    patterns: [
      {
        path: /\.operator$/,
        type: 'null',
        message: 'Please select an operator (equals, greater than, etc.)'
      },
      {
        path: /\.operator$/,
        type: 'enum',
        message: 'Please choose a valid comparison operator from the dropdown'
      }
    ]
  },

  // Expression structure errors
  expression: {
    patterns: [
      {
        path: /\.expressions\[\d+\]$/,
        type: 'oneOf',
        message: 'This expression needs to be either a field reference, a value, or a function call'
      },
      {
        path: /\.expressions$/,
        type: 'required',
        message: 'Expression group must contain at least one expression'
      },
      {
        path: /\.operators$/,
        type: 'required',
        message: 'Expression group is missing operators array'
      }
    ]
  },

  // Condition structure errors
  condition: {
    patterns: [
      {
        path: /\.conditions\[\d+\]$/,
        type: 'oneOf',
        message: 'This condition needs to be either a simple condition or a condition group'
      },
      {
        path: /\.conjunction$/,
        type: 'required',
        message: 'Condition group must specify how conditions are combined (AND/OR)'
      },
      {
        path: /\.not$/,
        type: 'required',
        message: 'Condition group must specify whether it is negated (true/false)'
      }
    ]
  },

  // Value-related errors
  value: {
    patterns: [
      {
        path: /\.value$/,
        type: 'required',
        message: 'Please enter a value for comparison'
      },
      {
        path: /\.value$/,
        type: 'type',
        message: 'Value type must match the expected data type'
      }
    ]
  },

  // Structure-related errors
  structure: {
    patterns: [
      {
        path: /\.type$/,
        type: 'const',
        message: 'Invalid element type - this may indicate a structural problem'
      },
      {
        path: /\.returnType$/,
        type: 'required',
        message: 'Return type must be specified (boolean, number, text, etc.)'
      }
    ]
  }
};

/**
 * Context-aware error suggestions based on rule structure
 */
const CONTEXTUAL_SUGGESTIONS = {
  newRule: {
    title: '🆕 Setting up a new rule',
    suggestions: [
      'Start by selecting a field in the left side of your condition',
      'Choose an appropriate comparison operator',
      'Enter or select a value for the right side of the condition',
      'Make sure all required fields are filled in'
    ]
  },
  
  incompleteCondition: {
    title: '🔧 Complete your condition',
    suggestions: [
      'Every condition needs: Field + Operator + Value',
      'Use the dropdowns in RuleBuilder to select valid options',
      'Switch back to RuleBuilder tab to use the visual editor'
    ]
  },

  structuralIssues: {
    title: '⚠️ Structure problems detected', 
    suggestions: [
      'The rule structure may have been manually edited incorrectly',
      'Try recreating the rule using RuleBuilder interface',
      'Check that all nested objects have the required properties'
    ]
  }
};

/**
 * Analyze errors to determine context and provide suggestions
 */
function analyzeErrorContext(errors) {
  const fieldErrors = errors.filter(err => err.path && err.path.includes('field'));
  const operatorErrors = errors.filter(err => err.path && err.path.includes('operator'));
  const structureErrors = errors.filter(err => err.path && err.path.includes('type'));
  
  if (fieldErrors.length > 0 || operatorErrors.length > 0) {
    return 'incompleteCondition';
  }
  
  if (structureErrors.length > 0) {
    return 'structuralIssues';
  }
  
  return 'newRule';
}

/**
 * Main error translation function
 */
export function translateValidationErrors(errors, ruleData = null) {
  const translatedErrors = [];
  const context = analyzeErrorContext(errors);
  
  for (const error of errors) {
    let translated = translateSingleError(error);
    
    // Add contextual information if available
    if (ruleData) {
      translated = enhanceWithContext(translated, error, ruleData);
    }
    
    translatedErrors.push(translated);
  }
  
  return {
    errors: translatedErrors,
    context: CONTEXTUAL_SUGGESTIONS[context] || CONTEXTUAL_SUGGESTIONS.newRule,
    summary: generateErrorSummary(translatedErrors)
  };
}

/**
 * Translate a single error using pattern matching
 */
function translateSingleError(error) {
  const { path, message } = error;
  
  // Extract error type from message
  const errorType = detectErrorType(message);
  
  // Try to match against known patterns
  for (const [category, config] of Object.entries(ERROR_TRANSLATIONS)) {
    for (const pattern of config.patterns) {
      if (pattern.path.test(path) && pattern.type === errorType) {
        return {
          originalPath: path,
          originalMessage: message,
          userMessage: pattern.message,
          category,
          severity: getSeverity(category, errorType),
          quickFix: getQuickFix(category, errorType)
        };
      }
    }
  }
  
  // Fallback to generic translation
  return {
    originalPath: path,
    originalMessage: message,
    userMessage: generateGenericMessage(path, message),
    category: 'general',
    severity: 'warning'
  };
}

/**
 * Detect error type from schema validation message
 */
function detectErrorType(message) {
  if (message.includes('null found')) return 'null';
  if (message.includes('is missing but it is required')) return 'required';
  if (message.includes('does not have a value in the enumeration')) return 'enum';
  if (message.includes('must be a constant value')) return 'const';
  if (message.includes('should be valid to one and only one schema')) return 'oneOf';
  if (message.includes('is not defined in the schema')) return 'additionalProperties';
  return 'unknown';
}

/**
 * Generate user-friendly message for unknown errors
 */
function generateGenericMessage(path, message) {
  const pathParts = path.split('.');
  const lastPart = pathParts[pathParts.length - 1];
  
  if (message.includes('null found')) {
    return `Please provide a value for ${lastPart}`;
  }
  
  if (message.includes('is missing')) {
    return `Required field ${lastPart} is missing`;
  }
  
  if (message.includes('enumeration')) {
    return `Please select a valid option for ${lastPart}`;
  }
  
  return `There's an issue with ${lastPart}: ${message}`;
}

/**
 * Enhance error with rule-specific context
 */
function enhanceWithContext(translated, originalError, ruleData) {
  const enhanced = { ...translated };
  
  // Add location context
  if (originalError.path.includes('conditions[0]')) {
    enhanced.location = 'First condition';
  } else if (originalError.path.includes('conditions[')) {
    const match = originalError.path.match(/conditions\[(\d+)\]/);
    if (match) {
      enhanced.location = `Condition ${parseInt(match[1]) + 1}`;
    }
  }
  
  // Add rule structure context
  if (ruleData.structure) {
    enhanced.ruleType = ruleData.structure;
    if (ruleData.structure === 'condition') {
      enhanced.hint = 'Use RuleBuilder tab to visually edit this condition';
    }
  }
  
  return enhanced;
}

/**
 * Determine severity level
 */
function getSeverity(category, errorType) {
  if (errorType === 'null' || errorType === 'required') return 'error';
  if (errorType === 'enum' || errorType === 'const') return 'warning';
  return 'info';
}

/**
 * Suggest quick fixes
 */
function getQuickFix(category, errorType) {
  const fixes = {
    field: {
      null: 'Select a field from the dropdown in RuleBuilder',
      required: 'Add a field selection to this condition'
    },
    operator: {
      null: 'Choose an operator (=, >, <, etc.) from the dropdown',
      enum: 'Select a valid comparison operator'
    },
    value: {
      null: 'Enter a comparison value',
      required: 'Provide a value for this condition'
    }
  };
  
  return fixes[category]?.[errorType] || 'Check this field in RuleBuilder';
}

/**
 * Generate summary of all errors
 */
function generateErrorSummary(errors) {
  const errorCount = errors.length;
  const categories = [...new Set(errors.map(e => e.category))];
  
  let summary = `Found ${errorCount} validation issue${errorCount > 1 ? 's' : ''}`;
  
  if (categories.includes('field') || categories.includes('operator')) {
    summary += ' - mostly incomplete condition fields';
  } else if (categories.includes('structure')) {
    summary += ' - structural problems detected';
  }
  
  return summary;
}