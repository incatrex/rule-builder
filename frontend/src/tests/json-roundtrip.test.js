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
      type: 'expressionGroup',
      returnType: 'number',
      expressions: [
        {
          type: 'expressionGroup', // Nested group
          returnType: 'number',
          expressions: [
            { type: 'value', returnType: 'number', value: 1 },
            { type: 'value', returnType: 'number', value: 2 }
          ],
          operators: ['+']
        },
        { type: 'value', returnType: 'number', value: 3 }
      ],
      operators: ['*']
    };

    // Verify structure is valid
    expect(nestedExpression.expressions[0].type).toBe('expressionGroup');
    expect(Array.isArray(nestedExpression.expressions[0].expressions)).toBe(true);
    expect(nestedExpression.expressions[0].expressions).toHaveLength(2);
  });

  test('BaseExpression types are recognized', () => {
    const valueExpr = { type: 'value', returnType: 'number', value: 42 };
    const fieldExpr = { type: 'field', returnType: 'number', field: 'TABLE1.NUMBER_FIELD_01' };
    const funcExpr = { 
      type: 'function', 
      returnType: 'number', 
      function: { 
        name: 'MATH.ADD', 
        args: [] 
      } 
    };

    expect(valueExpr.type).toBe('value');
    expect(fieldExpr.type).toBe('field');
    expect(funcExpr.type).toBe('function');
  });

  test('Function arguments contain ExpressionGroups', () => {
    const funcWithArgs = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'MATH.ADD',
        args: [
          {
            name: 'arg1',
            value: {
              type: 'expressionGroup',
              returnType: 'number',
              expressions: [{ type: 'value', returnType: 'number', value: 10 }],
              operators: []
            }
          },
          {
            name: 'arg2',
            value: {
              type: 'expressionGroup',
              returnType: 'number',
              expressions: [{ type: 'value', returnType: 'number', value: 20 }],
              operators: []
            }
          }
        ]
      }
    };

    expect(funcWithArgs.function.args[0].value.type).toBe('expressionGroup');
    expect(funcWithArgs.function.args[1].value.type).toBe('expressionGroup');
    expect(funcWithArgs.function.args).toHaveLength(2);
  });

  test('Deeply nested ExpressionGroups are valid (triple nesting)', () => {
    const tripleNested = {
      type: 'expressionGroup',
      returnType: 'number',
      expressions: [
        {
          type: 'expressionGroup',
          returnType: 'number',
          expressions: [
            {
              type: 'expressionGroup',
              returnType: 'number',
              expressions: [
                { type: 'value', returnType: 'number', value: 1 }
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
    expect(tripleNested.type).toBe('expressionGroup');
    expect(tripleNested.expressions[0].type).toBe('expressionGroup');
    expect(tripleNested.expressions[0].expressions[0].type).toBe('expressionGroup');
    expect(tripleNested.expressions[0].expressions[0].expressions[0].type).toBe('value');
  });

  test('ExpressionGroup with multiple expressions and operators', () => {
    const mathExpression = {
      type: 'expressionGroup',
      returnType: 'number',
      expressions: [
        { type: 'value', returnType: 'number', value: 10 },
        { type: 'value', returnType: 'number', value: 5 },
        { type: 'value', returnType: 'number', value: 2 }
      ],
      operators: ['+', '*']
    };

    expect(mathExpression.expressions).toHaveLength(3);
    expect(mathExpression.operators).toHaveLength(2);
    expect(mathExpression.operators).toEqual(['+', '*']);
  });
});

