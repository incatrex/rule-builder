/**
 * Utility functions for cleaning UI-only properties from rule data
 * before sending to parent components or API endpoints.
 */

/**
 * Remove UI-only properties from data objects
 * 
 * @param {Object|Array} obj - The object or array to clean
 * @param {Object} options - Cleaning options
 * @param {boolean} options.removeExpanded - Remove expansion state properties (default: true)
 * @param {boolean} options.removeEditing - Remove editing state properties (default: true)
 * @param {boolean} options.removePlaceholders - Remove placeholder UUIDs (default: true)
 * @param {boolean} options.removeValidation - Remove validation flags (default: true)
 * @returns {Object|Array} Cleaned copy of the input
 */
export const removeUIProperties = (obj, options = {}) => {
  const {
    removeExpanded = true,
    removeEditing = true,
    removePlaceholders = true,
    removeValidation = true
  } = options;

  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUIProperties(item, options));
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check if this key should be removed based on options
    const shouldRemove = 
      (removeExpanded && (key.includes('Expanded') || key === 'isExpanded' || key === 'isCollapsed')) ||
      (removeEditing && (key.startsWith('editing') || key.includes('editing') || key === 'editingName' || key === 'editingResultName')) ||
      (removePlaceholders && key === '__placeholderUUID') ||
      (removeValidation && (key === 'hasInternalMismatch' || key === 'internalDeclaredType' || key === 'internalEvaluatedType'));

    if (shouldRemove) {
      continue;
    }
    
    // Recursively clean nested objects
    if (value && typeof value === 'object') {
      cleaned[key] = removeUIProperties(value, options);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

/**
 * Clean rule data for sending to parent via callbacks
 * Removes all UI-only properties including expansion, editing, placeholders, and validation flags
 * 
 * @param {Object} data - Rule data object
 * @returns {Object} Cleaned rule data
 */
export const cleanRuleData = (data) => {
  return removeUIProperties(data, {
    removeExpanded: true,
    removeEditing: true,
    removePlaceholders: true,
    removeValidation: true
  });
};

/**
 * Clean rule data for API save operations
 * Removes state-related UI properties (expansion and editing flags)
 * but keeps structural properties that might be needed for validation
 * 
 * @param {Object} data - Rule data object
 * @returns {Object} Cleaned rule data ready for API
 */
export const cleanForSave = (data) => {
  return removeUIProperties(data, {
    removeExpanded: true,
    removeEditing: true,
    removePlaceholders: false,
    removeValidation: true
  });
};
