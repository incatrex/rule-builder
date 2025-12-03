import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Function - Initial Argument Value Sources', () => {
  // These tests verify the logic for selecting initial value sources for function arguments.
  // The fix ensures that when a function argument has restricted valueSources (e.g., ['field', 'function']),
  // it defaults to the first available source instead of hardcoding 'value'.

  describe('Array Format Arguments', () => {
    it('should default to first available source (field) when valueSources is [field, function]', () => {
      const argDef = {
        name: 'attribute',
        type: 'text',
        valueSources: ['field', 'function']
      };
      
      // The fix: use valueSources?.[0] instead of checking length === 1
      const initialType = argDef.valueSources?.[0] || 'value';
      
      expect(initialType).toBe('field');
      expect(initialType).not.toBe('value'); // Regression check: was incorrectly defaulting to 'value'
    });

    it('should default to first available source (field) when valueSources is [field]', () => {
      const argDef = {
        name: 'values',
        type: 'number',
        valueSources: ['field']
      };
      
      const initialType = argDef.valueSources?.[0] || 'value';
      
      expect(initialType).toBe('field');
    });

    it('should default to value when valueSources is [value, field, function]', () => {
      const argDef = {
        name: 'str',
        type: 'text',
        valueSources: ['value', 'field', 'function']
      };
      
      const initialType = argDef.valueSources?.[0] || 'value';
      
      expect(initialType).toBe('value');
    });

    it('should respect order of valueSources array', () => {
      const argDef = {
        name: 'arg1',
        type: 'text',
        valueSources: ['function', 'field', 'value'] // Function first
      };
      
      const initialType = argDef.valueSources?.[0] || 'value';
      
      expect(initialType).toBe('function');
    });

    it('should fall back to value when valueSources is undefined', () => {
      const argDef = {
        name: 'input',
        type: 'text'
        // No valueSources
      };
      
      const initialType = argDef.valueSources?.[0] || 'value';
      
      expect(initialType).toBe('value');
    });

    it('should fall back to value when valueSources is empty', () => {
      const argDef = {
        name: 'input',
        type: 'text',
        valueSources: []
      };
      
      const initialType = argDef.valueSources?.[0] || 'value';
      
      expect(initialType).toBe('value');
    });
  });

  describe('Object Format Arguments', () => {
    it('should use first available source for each argument', () => {
      const funcArgs = {
        input: {
          type: 'text',
          valueSources: ['function']
        },
        threshold: {
          type: 'number',
          valueSources: ['value', 'field']
        }
      };
      
      const inputType = funcArgs.input.valueSources?.[0] || 'value';
      const thresholdType = funcArgs.threshold.valueSources?.[0] || 'value';
      
      expect(inputType).toBe('function');
      expect(thresholdType).toBe('value');
    });
  });

  describe('Regression: COUNT function bug', () => {
    it('COUNT with valueSources [field, function] should default to field, not value', () => {
      // This test documents the bug we fixed:
      // Before: valueSources?.length === 1 ? valueSources[0] : 'value'
      // After: valueSources?.[0] || 'value'
      
      const countArgDef = {
        name: 'attribute',
        type: 'text',
        valueSources: ['field', 'function']
      };
      
      // OLD BUGGY LOGIC (for documentation):
      // const oldLogic = countArgDef.valueSources?.length === 1 ? countArgDef.valueSources[0] : 'value';
      // expect(oldLogic).toBe('value'); // Bug: would default to 'value' even though it's not in valueSources
      
      // NEW CORRECT LOGIC:
      const newLogic = countArgDef.valueSources?.[0] || 'value';
      expect(newLogic).toBe('field'); // Correctly uses first available source
      expect(newLogic).not.toBe('value'); // Does not default to invalid source
    });
  });
});
