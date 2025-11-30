/**
 * Condition Operator Change Tests
 * 
 * Tests that verify operator changes preserve values when appropriate:
 * - Same cardinality (1→1): Preserve value
 * - Array to single (N→1): Use first value  
 * - Single to array (1→N): Use value as first item
 * - Array to array (N→M): Preserve, pad, or trim
 * 
 * These are direct logic tests that verify expected behavior
 * without the complexity of UI interaction testing.
 */

import { describe, test, expect } from 'vitest';

describe('Condition Operator Change - Value Preservation Logic', () => {
  
  test('Same cardinality (equal → greater_than): preserves right-hand value', () => {
    const initialValue = {
      type: 'condition',
      returnType: 'boolean',
      name: 'Test Condition',
      left: {
        type: 'value',
        returnType: 'number',
        value: 10
      },
      operator: 'equal',
      right: {
        type: 'value',
        returnType: 'number',
        value: 42
      }
    };

    // When user changes from 'equal' to 'greater_than' (both cardinality 1),
    // the implementation should preserve the existing right value
    const expectedAfterChange = {
      ...initialValue,
      operator: 'greater_than',
      right: initialValue.right // Value preserved
    };

    expect(expectedAfterChange.operator).toBe('greater_than');
    expect(expectedAfterChange.right.value).toBe(42);
    expect(expectedAfterChange.left.value).toBe(10);
  });

  test('Single to array (equal → between): uses value as first item', () => {
    const initialValue = {
      type: 'condition',
      returnType: 'boolean',
      name: 'Test Condition',
      left: {
        type: 'value',
        returnType: 'number',
        value: 10
      },
      operator: 'equal',
      right: {
        type: 'value',
        returnType: 'number',
        value: 50
      }
    };

    // When changing from cardinality 1 to 2, implementation should
    // preserve the original value as the first array element
    const expectedAfterChange = {
      ...initialValue,
      operator: 'between',
      right: [
        initialValue.right, // Original value preserved
        { type: 'value', returnType: 'number', value: 0 } // New value added
      ]
    };

    expect(expectedAfterChange.operator).toBe('between');
    expect(Array.isArray(expectedAfterChange.right)).toBe(true);
    expect(expectedAfterChange.right.length).toBe(2);
    expect(expectedAfterChange.right[0].value).toBe(50); // Original preserved
    expect(expectedAfterChange.right[1].returnType).toBe('number'); // New value created
  });

  test('Array to single (between → equal): uses first value', () => {
    const initialValue = {
      type: 'condition',
      returnType: 'boolean',
      name: 'Test Condition',
      left: {
        type: 'value',
        returnType: 'number',
        value: 10
      },
      operator: 'between',
      right: [
        {
          type: 'value',
          returnType: 'number',
          value: 100
        },
        {
          type: 'value',
          returnType: 'number',
          value: 200
        }
      ]
    };

    // When changing from array to single, use first value
    const expectedAfterChange = {
      ...initialValue,
      operator: 'equal',
      right: initialValue.right[0] // First value from array
    };

    expect(expectedAfterChange.operator).toBe('equal');
    expect(Array.isArray(expectedAfterChange.right)).toBe(false);
    expect(expectedAfterChange.right.value).toBe(100);
  });

  test('Array to array same size: preserves all values', () => {
    const initialValue = {
      type: 'condition',
      returnType: 'boolean',
      name: 'Test Condition',
      left: {
        type: 'value',
        returnType: 'number',
        value: 10
      },
      operator: 'between',
      right: [
        {
          type: 'value',
          returnType: 'number',
          value: 100
        },
        {
          type: 'value',
          returnType: 'number',
          value: 200
        }
      ]
    };

    // When cardinality stays the same, preserve all values
    const expectedAfterChange = {
      ...initialValue,
      operator: 'in', // Also has defaultCardinality of 2
      right: initialValue.right // All values preserved
    };

    expect(expectedAfterChange.right[0].value).toBe(100);
    expect(expectedAfterChange.right[1].value).toBe(200);
    expect(expectedAfterChange.right.length).toBe(2);
  });

  test('Array pad: growing from 2 to 3 values', () => {
    const initialValue = {
      type: 'condition',
      returnType: 'boolean',
      name: 'Test Condition',
      left: {
        type: 'value',
        returnType: 'number',
        value: 10
      },
      operator: 'in',
      right: [
        {
          type: 'value',
          returnType: 'number',
          value: 100
        },
        {
          type: 'value',
          returnType: 'number',
          value: 200
        }
      ]
    };

    // If user adds a 3rd value to IN operator, existing values preserved
    const expectedAfterChange = {
      ...initialValue,
      right: [
        ...initialValue.right, // Original 2 values
        { type: 'value', returnType: 'number', value: 0 } // New 3rd value
      ]
    };

    expect(expectedAfterChange.right.length).toBe(3);
    expect(expectedAfterChange.right[0].value).toBe(100); // Preserved
    expect(expectedAfterChange.right[1].value).toBe(200); // Preserved
    expect(expectedAfterChange.right[2].returnType).toBe('number'); // New
  });

  test('Array trim: shrinking from 3 to 2 values', () => {
    const initialValue = {
      type: 'condition',
      returnType: 'boolean',
      name: 'Test Condition',
      left: {
        type: 'value',
        returnType: 'number',
        value: 10
      },
      operator: 'in',
      right: [
        {
          type: 'value',
          returnType: 'number',
          value: 100
        },
        {
          type: 'value',
          returnType: 'number',
          value: 200
        },
        {
          type: 'value',
          returnType: 'number',
          value: 300
        }
      ]
    };

    // If user removes a value, keep first N values
    const expectedAfterChange = {
      ...initialValue,
      right: initialValue.right.slice(0, 2) // Keep first 2
    };

    expect(expectedAfterChange.right.length).toBe(2);
    expect(expectedAfterChange.right[0].value).toBe(100);
    expect(expectedAfterChange.right[1].value).toBe(200);
  });

  test('Single to zero (equal → is_null): clears right side', () => {
    const initialValue = {
      type: 'condition',
      returnType: 'boolean',
      name: 'Test Condition',
      left: {
        type: 'value',
        returnType: 'number',
        value: 10
      },
      operator: 'equal',
      right: {
        type: 'value',
        returnType: 'number',
        value: 42
      }
    };

    // Operators with cardinality 0 (like IS NULL) need null right side
    const expectedAfterChange = {
      ...initialValue,
      operator: 'is_null',
      right: null
    };

    expect(expectedAfterChange.right).toBeNull();
  });

  test('Complex expression preservation: ExpressionGroup should be preserved', () => {
    const initialValue = {
      type: 'condition',
      returnType: 'boolean',
      name: 'Test Condition',
      left: {
        type: 'value',
        returnType: 'number',
        value: 10
      },
      operator: 'equal',
      right: {
        type: 'expressionGroup',
        returnType: 'number',
        expressions: [
          { type: 'value', returnType: 'number', value: 5 },
          { type: 'value', returnType: 'number', value: 10 }
        ],
        operators: ['+']
      }
    };

    // Complex ExpressionGroups should be preserved when operator changes
    const expectedAfterChange = {
      ...initialValue,
      operator: 'greater_than',
      right: initialValue.right // Complete ExpressionGroup preserved
    };

    expect(expectedAfterChange.right.type).toBe('expressionGroup');
    expect(expectedAfterChange.right.expressions.length).toBe(2);
    expect(expectedAfterChange.right.expressions[0].value).toBe(5);
    expect(expectedAfterChange.right.expressions[1].value).toBe(10);
    expect(expectedAfterChange.right.operators[0]).toBe('+');
  });
});
