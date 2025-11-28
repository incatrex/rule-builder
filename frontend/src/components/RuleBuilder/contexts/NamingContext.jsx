/**
 * Naming Context
 * 
 * Provides centralized naming services for rule builder components
 * to avoid prop drilling and maintain single source of truth for naming logic.
 */

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import {
  generateDefaultName,
  updateNameOnTypeChange,
  getNextNumber,
  generateResultName,
  generateElseName,
  assignNamesToTree,
  extractNumber
} from '../utils/conditionNaming';

const NamingContext = createContext(null);

/**
 * Extracts parent number from expansion path
 * Paths like 'condition-0-group-1-condition-2' map to numbering context
 * 
 * @param {string} path - Expansion path
 * @returns {string} Parent number (e.g., '1', '1.2', or '' for root)
 */
function extractParentNumberFromPath(path) {
  if (!path) return '';
  
  // Parse path segments to build numbering
  // Example paths:
  // - 'condition-0' → '' (root level, no parent)
  // - 'condition-0-condition-1' → '' (child of root group, parent has no number prefix)
  // - 'condition-0-condition-1-condition-2' → '2' (grandchild, parent is "Condition 2")
  const segments = path.split('-');
  const numbers = [];
  
  for (let i = 0; i < segments.length; i += 2) {
    const type = segments[i];
    const index = segments[i + 1];
    
    if (index !== undefined && !isNaN(index)) {
      numbers.push(parseInt(index, 10) + 1);
    }
  }
  
  // Root level (depth 1) or direct children of root (depth 2) have no parent number
  if (numbers.length <= 2) return '';
  
  // For deeper nesting, remove last number (current item) and join parent numbers
  numbers.pop();
  
  // Also remove the first number (root group number) since we want relative numbering
  numbers.shift();
  
  return numbers.join('.');
}

/**
 * Extracts position from expansion path
 * 
 * @param {string} path - Expansion path
 * @returns {number|null} Position (1-based) or null for root
 */
function extractPositionFromPath(path) {
  if (!path) return null;
  
  const segments = path.split('-');
  
  // Root level (single segment pair like 'condition-0') has no position for naming
  if (segments.length <= 2) return null;
  
  const lastIndex = segments[segments.length - 1];
  
  if (!isNaN(lastIndex)) {
    return parseInt(lastIndex, 10) + 1;
  }
  
  return null;
}

/**
 * NamingProvider component
 * Wrap your RuleBuilder content with this to provide naming services
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function NamingProvider({ children }) {
  /**
   * Get name for a new item at a given path
   */
  const getNameForNew = useCallback((type, expansionPath = '', siblings = []) => {
    const parentNumber = extractParentNumberFromPath(expansionPath);
    const nextNum = getNextNumber(siblings, parentNumber);
    return generateDefaultName(type, parentNumber, nextNum);
  }, []);
  
  /**
   * Update name when type changes
   */
  const updateName = useCallback((currentName, oldType, newType, expansionPath = '', ruleId = null) => {
    const parentNumber = extractParentNumberFromPath(expansionPath);
    const position = extractPositionFromPath(expansionPath);
    return updateNameOnTypeChange(currentName, oldType, newType, parentNumber, position, ruleId);
  }, []);
  
  /**
   * Get result name for WHEN clause in Case expressions
   */
  const getResultName = useCallback((whenClauseIndex) => {
    return generateResultName(whenClauseIndex);
  }, []);
  
  /**
   * Get ELSE clause name
   */
  const getElseName = useCallback(() => {
    return generateElseName();
  }, []);
  
  /**
   * Renumber entire tree (useful after loading or major restructuring)
   */
  const renumberTree = useCallback((tree) => {
    return assignNamesToTree(tree, '', null);
  }, []);
  
  /**
   * Get next available number at a path
   */
  const getNextNumberAtPath = useCallback((expansionPath, siblings) => {
    const parentNumber = extractParentNumberFromPath(expansionPath);
    return getNextNumber(siblings, parentNumber);
  }, []);
  
  const namingService = useMemo(() => ({
    getNameForNew,
    updateName,
    getResultName,
    getElseName,
    renumberTree,
    getNextNumberAtPath,
    // Expose utilities for advanced use cases
    extractParentNumberFromPath,
    extractPositionFromPath
  }), [getNameForNew, updateName, getResultName, getElseName, renumberTree, getNextNumberAtPath]);
  
  return (
    <NamingContext.Provider value={namingService}>
      {children}
    </NamingContext.Provider>
  );
}

/**
 * Hook to access naming services
 * 
 * @returns {Object} Naming service methods
 * @throws {Error} If used outside NamingProvider
 */
export function useNaming() {
  const context = useContext(NamingContext);
  
  if (!context) {
    throw new Error('useNaming must be used within NamingProvider');
  }
  
  return context;
}
