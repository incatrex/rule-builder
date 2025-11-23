import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useExpansionState } from '../useExpansionState';

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
});
