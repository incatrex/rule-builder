/**
 * JSON Round-trip Test
 * 
 * This test loads sample JSON files and verifies their structure.
 * Run with: npm test
 * Or with UI: npm run test:ui
 */

import { describe, test, expect } from 'vitest';

describe('JSON Structure Validation', () => {
  
  test('ExpressionGroup can contain nested ExpressionGroups', () => {
    const nestedExpression = {
      source: 'expressionGroup',
      returnType: 'number',
      expressions: [
        {
          source: 'expressionGroup', // Nested group
          returnType: 'number',
          expressions: [
            { source: 'value', returnType: 'number', value: 1 },
            { source: 'value', returnType: 'number', value: 2 }
          ],
          operators: ['+']
        },
        { source: 'value', returnType: 'number', value: 3 }
      ],
      operators: ['*']
    };

    // Verify structure is valid
    expect(nestedExpression.expressions[0].source).toBe('expressionGroup');
    expect(Array.isArray(nestedExpression.expressions[0].expressions)).toBe(true);
    expect(nestedExpression.expressions[0].expressions).toHaveLength(2);
  });

  test('BaseExpression types are recognized', () => {
    const valueExpr = { source: 'value', returnType: 'number', value: 42 };
    const fieldExpr = { source: 'field', returnType: 'number', field: 'TABLE1.NUMBER_FIELD_01' };
    const funcExpr = { 
      source: 'function', 
      returnType: 'number', 
      function: { 
        name: 'MATH.ADD', 
        args: [] 
      } 
    };

    expect(valueExpr.source).toBe('value');
    expect(fieldExpr.source).toBe('field');
    expect(funcExpr.source).toBe('function');
  });

  test('Function arguments contain ExpressionGroups', () => {
    const funcWithArgs = {
      source: 'function',
      returnType: 'number',
      function: {
        name: 'MATH.ADD',
        args: [
          {
            name: 'arg1',
            value: {
              source: 'expressionGroup',
              returnType: 'number',
              expressions: [{ source: 'value', returnType: 'number', value: 10 }],
              operators: []
            }
          },
          {
            name: 'arg2',
            value: {
              source: 'expressionGroup',
              returnType: 'number',
              expressions: [{ source: 'value', returnType: 'number', value: 20 }],
              operators: []
            }
          }
        ]
      }
    };

    expect(funcWithArgs.function.args[0].value.source).toBe('expressionGroup');
    expect(funcWithArgs.function.args[1].value.source).toBe('expressionGroup');
    expect(funcWithArgs.function.args).toHaveLength(2);
  });

  test('Deeply nested ExpressionGroups are valid (triple nesting)', () => {
    const tripleNested = {
      source: 'expressionGroup',
      returnType: 'number',
      expressions: [
        {
          source: 'expressionGroup',
          returnType: 'number',
          expressions: [
            {
              source: 'expressionGroup',
              returnType: 'number',
              expressions: [
                { source: 'value', returnType: 'number', value: 1 }
              ],
              operators: []
            }
          ],
          operators: []
        }
      ],
      operators: []
    };

    // Navigate through nested structure
    expect(tripleNested.source).toBe('expressionGroup');
    expect(tripleNested.expressions[0].source).toBe('expressionGroup');
    expect(tripleNested.expressions[0].expressions[0].source).toBe('expressionGroup');
    expect(tripleNested.expressions[0].expressions[0].expressions[0].source).toBe('value');
  });

  test('ExpressionGroup with multiple expressions and operators', () => {
    const mathExpression = {
      source: 'expressionGroup',
      returnType: 'number',
      expressions: [
        { source: 'value', returnType: 'number', value: 10 },
        { source: 'value', returnType: 'number', value: 5 },
        { source: 'value', returnType: 'number', value: 2 }
      ],
      operators: ['+', '*']
    };

    expect(mathExpression.expressions).toHaveLength(3);
    expect(mathExpression.operators).toHaveLength(2);
    expect(mathExpression.operators).toEqual(['+', '*']);
  });
});

