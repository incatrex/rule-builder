import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useExpansionState } from './useExpansionState';

describe('useExpansionState', () => {
  describe('New Rule (isNew = true)', () => {
    it('should default all components to expanded', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      
      // Any path should be expanded by default for new rules
      expect(result.current.isExpanded('conditionGroup-0')).toBe(true);
      expect(result.current.isExpanded('condition-0')).toBe(true);
      expect(result.current.isExpanded('anything')).toBe(true);
      expect(result.current.isExpanded('random-path')).toBe(true);
    });

    it('should allow collapsing individual components', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      
      // Collapse condition-0
      act(() => {
        result.current.toggleExpansion('condition-0');
      });
      
      // condition-0 should be collapsed
      expect(result.current.isExpanded('condition-0')).toBe(false);
      // Other paths should still be expanded
      expect(result.current.isExpanded('condition-1')).toBe(true);
      expect(result.current.isExpanded('conditionGroup-0')).toBe(true);
    });

    it('should allow re-expanding collapsed components', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      
      // Collapse then expand
      act(() => {
        result.current.toggleExpansion('condition-0');
      });
      expect(result.current.isExpanded('condition-0')).toBe(false);
      
      act(() => {
        result.current.toggleExpansion('condition-0');
      });
      expect(result.current.isExpanded('condition-0')).toBe(true);
    });

    it('should support setExpansion for explicit state control', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      
      // Explicitly collapse
      act(() => {
        result.current.setExpansion('condition-0', false);
      });
      expect(result.current.isExpanded('condition-0')).toBe(false);
      
      // Explicitly expand
      act(() => {
        result.current.setExpansion('condition-0', true);
      });
      expect(result.current.isExpanded('condition-0')).toBe(true);
    });
  });

  describe('Loaded Rule (isNew = false)', () => {
    it('should default all to collapsed except root condition group', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      // Root condition group should be expanded
      expect(result.current.isExpanded('conditionGroup-0')).toBe(true);
      
      // Everything else should be collapsed
      expect(result.current.isExpanded('condition-0')).toBe(false);
      expect(result.current.isExpanded('conditionGroup-1')).toBe(false);
      expect(result.current.isExpanded('anything-else')).toBe(false);
    });

    it('should allow expanding individual components', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      // Initially collapsed
      expect(result.current.isExpanded('condition-0')).toBe(false);
      
      // Expand it
      act(() => {
        result.current.toggleExpansion('condition-0');
      });
      
      // Now expanded
      expect(result.current.isExpanded('condition-0')).toBe(true);
      // Other paths still collapsed
      expect(result.current.isExpanded('condition-1')).toBe(false);
    });

    it('should handle case structure with all collapsed initially', () => {
      const { result } = renderHook(() => 
        useExpansionState('case', false)
      );
      
      // All case parts should be collapsed for loaded rules
      expect(result.current.isExpanded('case-when-0')).toBe(false);
      expect(result.current.isExpanded('case-then')).toBe(false);
      expect(result.current.isExpanded('case-else')).toBe(false);
    });

    it('should handle expression structure with all collapsed initially', () => {
      const { result } = renderHook(() => 
        useExpansionState('expression', false)
      );
      
      // All expressions should be collapsed for loaded rules
      expect(result.current.isExpanded('expression-0')).toBe(false);
      expect(result.current.isExpanded('expressionGroup-0')).toBe(false);
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across toggles', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      // Expand condition-0
      act(() => result.current.toggleExpansion('condition-0'));
      expect(result.current.isExpanded('condition-0')).toBe(true);
      
      // Collapse it again
      act(() => result.current.toggleExpansion('condition-0'));
      expect(result.current.isExpanded('condition-0')).toBe(false);
      
      // Expand again
      act(() => result.current.toggleExpansion('condition-0'));
      expect(result.current.isExpanded('condition-0')).toBe(true);
    });

    it('should maintain multiple independent states', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      // Expand multiple items
      act(() => {
        result.current.setExpansion('condition-0', true);
        result.current.setExpansion('condition-1', true);
        result.current.setExpansion('condition-2', false);
      });
      
      // Check all states are preserved
      expect(result.current.isExpanded('condition-0')).toBe(true);
      expect(result.current.isExpanded('condition-1')).toBe(true);
      expect(result.current.isExpanded('condition-2')).toBe(false);
      expect(result.current.isExpanded('condition-3')).toBe(false); // Default
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to new state when structure changes', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      // Expand some items
      act(() => {
        result.current.setExpansion('condition-0', true);
        result.current.setExpansion('condition-1', true);
      });
      
      expect(result.current.isExpanded('condition-0')).toBe(true);
      
      // Reset to new rule state (all expanded)
      act(() => {
        result.current.reset('condition', true);
      });
      
      // Should now behave like a new rule (all expanded by default)
      expect(result.current.isExpanded('condition-0')).toBe(true);
      expect(result.current.isExpanded('condition-1')).toBe(true);
      expect(result.current.isExpanded('anything')).toBe(true);
    });

    it('should reset to loaded state when switching to loaded rule', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      
      // Start with new rule (all expanded)
      expect(result.current.isExpanded('condition-0')).toBe(true);
      
      // Reset to loaded rule state
      act(() => {
        result.current.reset('condition', false);
      });
      
      // Should now behave like loaded rule (only root expanded)
      expect(result.current.isExpanded('conditionGroup-0')).toBe(true);
      expect(result.current.isExpanded('condition-0')).toBe(false);
    });
  });

  describe('Auto-expansion of new elements', () => {
    it('should allow setting expansion state for newly added elements', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      // Initially, condition-2 would be collapsed (loaded rule)
      expect(result.current.isExpanded('condition-2')).toBe(false);
      
      // Simulate adding a new condition and auto-expanding it
      act(() => {
        result.current.setExpansion('condition-2', true);
      });
      
      // New condition should be expanded
      expect(result.current.isExpanded('condition-2')).toBe(true);
      // Other conditions should remain collapsed
      expect(result.current.isExpanded('condition-0')).toBe(false);
      expect(result.current.isExpanded('condition-1')).toBe(false);
    });

    it('should work for new elements in new rules', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      
      // All expanded by default
      expect(result.current.isExpanded('condition-0')).toBe(true);
      
      // User collapses condition-0
      act(() => {
        result.current.toggleExpansion('condition-0');
      });
      expect(result.current.isExpanded('condition-0')).toBe(false);
      
      // Add new condition-1 and explicitly expand it
      act(() => {
        result.current.setExpansion('condition-1', true);
      });
      
      // New element should be expanded
      expect(result.current.isExpanded('condition-1')).toBe(true);
      // Existing collapsed state should be preserved
      expect(result.current.isExpanded('condition-0')).toBe(false);
    });
  });

  describe('expandAll and collapseAll', () => {
    it('should have expandAll function', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      expect(result.current.expandAll).toBeDefined();
      expect(typeof result.current.expandAll).toBe('function');
    });

    it('should have collapseAll function', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      expect(result.current.collapseAll).toBeDefined();
      expect(typeof result.current.collapseAll).toBe('function');
    });

    it('expandAll should make all items expanded', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', false)
      );
      
      // Initially collapsed (except root)
      expect(result.current.isExpanded('condition-0')).toBe(false);
      expect(result.current.isExpanded('condition-1')).toBe(false);
      
      // Expand all
      act(() => {
        result.current.expandAll();
      });
      
      // Now everything should be expanded
      expect(result.current.isExpanded('condition-0')).toBe(true);
      expect(result.current.isExpanded('condition-1')).toBe(true);
      expect(result.current.isExpanded('anything')).toBe(true);
    });

    it('collapseAll should keep root expanded for condition structure', () => {
      const { result } = renderHook(() => 
        useExpansionState('condition', true)
      );
      
      // Start with new rule (all expanded)
      expect(result.current.isExpanded('condition-0')).toBe(true);
      
      // Collapse all
      act(() => {
        result.current.collapseAll();
      });
      
      // Root should still be expanded
      expect(result.current.isExpanded('conditionGroup-0')).toBe(true);
      // Others collapsed depends on implementation
    });
  });

  describe('Group Creation Scenarios (Bug Fix Tests)', () => {
    test('Scenario 1: Converting single value to group stays expanded in loaded rule', () => {
      const { result } = renderHook(() => useExpansionState('expression', false)); // isNew=false (loaded rule)
      
      // Simulate: User has expression-0 as a simple value
      // Then clicks (+) button next to it to convert to a group
      
      // Before conversion: expression-0 would be a simple value (not expanded/collapsed concept)
      // After conversion: expression-0 becomes a group with [oldValue, newValue]
      
      // Simulate the auto-expansion call that should happen
      act(() => {
        result.current.setExpansion('expression-0', true);
      });
      
      // The newly created group should be expanded
      expect(result.current.isExpanded('expression-0')).toBe(true);
    });

    test('Scenario 2: Converting second value to group within existing group stays expanded', () => {
      const { result } = renderHook(() => useExpansionState('expression', false)); // isNew=false (loaded rule)
      
      // Simulate: Parent group expression-0 already exists and is expanded
      act(() => {
        result.current.setExpansion('expression-0', true);
      });
      
      // User clicks (+) button on second expression to convert it to a group
      // The new nested group should be at expression-0-expression-1
      act(() => {
        result.current.setExpansion('expression-0-expression-1', true);
      });
      
      // Both parent and newly created nested group should be expanded
      expect(result.current.isExpanded('expression-0')).toBe(true);
      expect(result.current.isExpanded('expression-0-expression-1')).toBe(true);
    });

    test('Scenario 3: Wrapping existing group keeps both outer and inner groups expanded', () => {
      const { result } = renderHook(() => useExpansionState('expression', false)); // isNew=false (loaded rule)
      
      // Simulate: Inner group expression-0 exists and is expanded (e.g., "1 + 2")
      act(() => {
        result.current.setExpansion('expression-0', true);
      });
      
      expect(result.current.isExpanded('expression-0')).toBe(true);
      
      // User clicks (+) button on the group to wrap it with an outer group
      // This creates: outer group at expression-0, inner group moves to expression-0-expression-0
      
      // The wrapping operation should:
      // 1. Keep outer group expanded (still at expression-0)
      // 2. Ensure inner wrapped group is expanded (now at expression-0-expression-0)
      act(() => {
        result.current.setExpansion('expression-0', true); // Outer stays expanded
        result.current.setExpansion('expression-0-expression-0', true); // Inner wrapped group
      });
      
      // Both outer and inner groups should be expanded
      expect(result.current.isExpanded('expression-0')).toBe(true);
      expect(result.current.isExpanded('expression-0-expression-0')).toBe(true);
    });

    test('All three scenarios work in new rules (default expanded)', () => {
      const { result } = renderHook(() => useExpansionState('expression', true)); // isNew=true (new rule)
      
      // In new rules, everything defaults to expanded (check !== false)
      // Paths that haven't been explicitly collapsed will return true
      
      // Scenario 1: Single value converted to group - should be expanded by default
      expect(result.current.isExpanded('expression-0')).toBe(true);
      
      // Scenario 2: Nested group created - should be expanded by default
      expect(result.current.isExpanded('expression-0-expression-1')).toBe(true);
      
      // Scenario 3: Wrapped groups - should be expanded by default
      expect(result.current.isExpanded('expression-0')).toBe(true);
      expect(result.current.isExpanded('expression-0-expression-0')).toBe(true);
      
      // Even if we explicitly set them to expanded, they should remain expanded
      act(() => {
        result.current.setExpansion('expression-0', true);
        result.current.setExpansion('expression-0-expression-0', true);
        result.current.setExpansion('expression-0-expression-1', true);
      });
      
      expect(result.current.isExpanded('expression-0')).toBe(true);
      expect(result.current.isExpanded('expression-0-expression-0')).toBe(true);
      expect(result.current.isExpanded('expression-0-expression-1')).toBe(true);
    });

    test('Scenario integration: Complex nested group creation in loaded rule', () => {
      const { result } = renderHook(() => useExpansionState('expression', false)); // isNew=false (loaded rule)
      
      // Start with a loaded rule where expression-0 is collapsed
      expect(result.current.isExpanded('expression-0')).toBe(false);
      
      // User creates a nested group at expression-0-expression-1
      act(() => {
        result.current.setExpansion('expression-0-expression-1', true);
      });
      
      // The nested group should be expanded even though parent is collapsed
      expect(result.current.isExpanded('expression-0-expression-1')).toBe(true);
      
      // Now expand the parent
      act(() => {
        result.current.setExpansion('expression-0', true);
      });
      
      // Both should be expanded
      expect(result.current.isExpanded('expression-0')).toBe(true);
      expect(result.current.isExpanded('expression-0-expression-1')).toBe(true);
      
      // Wrap the parent with an outer group (scenario 3)
      act(() => {
        result.current.setExpansion('expression-0', true); // Outer
        result.current.setExpansion('expression-0-expression-0', true); // Inner (was expression-0)
      });
      
      // All should remain expanded
      expect(result.current.isExpanded('expression-0')).toBe(true);
      expect(result.current.isExpanded('expression-0-expression-0')).toBe(true);
      
      // The deeply nested group path has changed to expression-0-expression-0-expression-1
      // It should maintain its expansion state
      act(() => {
        result.current.setExpansion('expression-0-expression-0-expression-1', true);
      });
      
      expect(result.current.isExpanded('expression-0-expression-0-expression-1')).toBe(true);
    });
  });
});
