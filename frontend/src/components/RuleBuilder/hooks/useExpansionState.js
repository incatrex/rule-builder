import { useState, useCallback } from 'react';

/**
 * Hook to manage expansion state for all collapsible components
 * 
 * @param {string} structure - Rule structure type (condition, case, expression)
 * @param {boolean} isNew - Is this a new rule or loaded rule
 * @returns {Object} Expansion state management functions
 */
export const useExpansionState = (structure, isNew) => {
  const [expansionMap, setExpansionMap] = useState(() => 
    generateInitialState(structure, isNew)
  );
  const [currentIsNew, setCurrentIsNew] = useState(isNew);

  function generateInitialState(structure, isNew) {
    if (isNew) {
      // For new rules: empty map means everything expanded by default
      return {};
    }
    
    // For loaded rules: explicitly set what should be expanded
    const state = {};
    if (structure === 'condition') {
      // Only root condition group expanded
      state['conditionGroup-0'] = true;
    }
    // Everything else collapsed (not in map = collapsed)
    return state;
  }

  // Check if a path is expanded
  const isExpanded = useCallback((path) => {
    if (currentIsNew) {
      // For new rules: default is expanded unless explicitly collapsed
      return expansionMap[path] !== false;
    } else {
      // For loaded rules: default is collapsed unless explicitly expanded
      return expansionMap[path] === true;
    }
  }, [expansionMap, currentIsNew]);

  // Toggle expansion state
  const toggleExpansion = useCallback((path) => {
    setExpansionMap(prev => ({
      ...prev,
      [path]: !isExpanded(path)
    }));
  }, [isExpanded]);

  // Set expansion state explicitly
  const setExpansion = useCallback((path, expanded) => {
    setExpansionMap(prev => ({
      ...prev,
      [path]: expanded
    }));
  }, []);

  // Reset to initial state (when loading a different rule)
  const reset = useCallback((newStructure, newIsNew) => {
    setExpansionMap(generateInitialState(newStructure, newIsNew));
    setCurrentIsNew(newIsNew);
  }, []);

  // Expand all
  const expandAll = useCallback(() => {
    // Clear the map and set to "new" mode (everything expanded by default)
    setExpansionMap({});
    setCurrentIsNew(true);
  }, []);

  // Collapse all
  const collapseAll = useCallback(() => {
    const state = {};
    if (structure === 'condition') {
      state['conditionGroup-0'] = true;  // Keep root expanded
    }
    // For new rules, need to explicitly mark everything as collapsed
    // For loaded rules, empty map already means collapsed
    if (isNew) {
      // This is approximate - ideally we'd track all paths
      // For now, we set a flag that everything should be collapsed
      state['__collapseAll'] = true;
    }
    setExpansionMap(state);
  }, [structure, isNew]);

  return {
    isExpanded,
    toggleExpansion,
    setExpansion,
    reset,
    expandAll,
    collapseAll
  };
};
