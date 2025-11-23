/**
 * Test helpers for expansion state management
 * Provides mock expansion functions for component tests
 */

/**
 * Creates a mock expansion state that always returns expanded
 * @returns {Object} Mock expansion functions
 */
export const createMockExpansionAlwaysExpanded = () => ({
  isExpanded: () => true,
  onToggleExpansion: () => {},
  isNew: true
});

/**
 * Creates a mock expansion state that always returns collapsed
 * @returns {Object} Mock expansion functions
 */
export const createMockExpansionAlwaysCollapsed = () => ({
  isExpanded: () => false,
  onToggleExpansion: () => {},
  isNew: false
});

/**
 * Creates a controllable mock expansion state for testing expansion behavior
 * @returns {Object} Mock expansion functions with control
 */
export const createControllableMockExpansion = () => {
  const expansionMap = new Map();
  
  return {
    isExpanded: (path) => expansionMap.get(path) ?? true,
    onToggleExpansion: (path) => {
      const current = expansionMap.get(path) ?? true;
      expansionMap.set(path, !current);
    },
    setExpansion: (path, expanded) => {
      expansionMap.set(path, expanded);
    },
    getMap: () => expansionMap,
    isNew: true
  };
};

/**
 * Default expansion props for tests (all expanded)
 */
export const defaultTestExpansionProps = {
  expansionPath: 'test-path',
  isExpanded: () => true,
  onToggleExpansion: () => {},
  isNew: true
};
