import React, { createContext, useContext } from 'react';

/**
 * Context for providing custom function components throughout the RuleBuilder tree
 * This eliminates prop drilling through multiple component layers
 */
const CustomComponentsContext = createContext({});

/**
 * Provider component to wrap the RuleBuilder with custom components
 */
export const CustomComponentsProvider = ({ children, customComponents = {} }) => {
  return (
    <CustomComponentsContext.Provider value={customComponents}>
      {children}
    </CustomComponentsContext.Provider>
  );
};

/**
 * Hook to access custom components from any component in the tree
 */
export const useCustomComponents = () => {
  return useContext(CustomComponentsContext);
};

export default CustomComponentsContext;
