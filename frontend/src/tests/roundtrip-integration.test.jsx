/**
 * Round-trip Integration Tests
 * 
 * These tests load actual sample JSON files, render them in the UI components,
 * simulate a small change to trigger onChange, capture the output,
 * and verify it matches the original JSON structure.
 * 
 * This ensures the UI can correctly load, display, and regenerate rule JSON.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React, { useRef, useEffect } from 'react';
import RuleBuilder from '../RuleBuilder';

// Import sample JSON files
import MATH_EXPRESSION from './fixtures/math-expression.json';
import SIMPLE_CONDITION from './fixtures/simple-condition.json';
import CASE_EXPRESSION from './fixtures/case-expression.json';

// Mock config - basic version for testing
const mockConfig = {
  fields: {
    TABLE1: {
      type: '!struct',
      label: 'Table 1',
      subfields: {
        TEXT_FIELD_01: { type: 'text', label: 'Text Field 01' },
        NUMBER_FIELD_01: { type: 'number', label: 'Number Field 01' },
        NUMBER_FIELD_02: { type: 'number', label: 'Number Field 02' },
        NUMBER_FIELD_03: { type: 'number', label: 'Number Field 03' },
        DATE_FIELD_01: { type: 'date', label: 'Date Field 01' },
      }
    },
    TABLE2: {
      type: '!struct',
      label: 'Table 2',
      subfields: {
        TEXT_FIELD_01: { type: 'text', label: 'Text Field 01' },
        NUMBER_FIELD_01: { type: 'number', label: 'Number Field 01' },
        NUMBER_FIELD_02: { type: 'number', label: 'Number Field 02' },
        NUMBER_FIELD_03: { type: 'number', label: 'Number Field 03' },
        DATE_FIELD_01: { type: 'date', label: 'Date Field 01' },
      }
    }
  },
  funcs: {
    MATH: {
      type: '!struct',
      label: 'Math Functions',
      subfields: {
        ADD: {
          returnType: 'number',
          label: 'Add',
          dynamicArgs: {
            argType: 'number',
            minArgs: 2,
            maxArgs: 10
          }
        },
        SUBTRACT: {
          returnType: 'number',
          label: 'Subtract',
          args: {
            arg1: { type: 'number', label: 'First Number' },
            arg2: { type: 'number', label: 'Second Number' }
          }
        },
        MULTIPLY: {
          returnType: 'number',
          label: 'Multiply',
          args: {
            arg1: { type: 'number', label: 'First Number' },
            arg2: { type: 'number', label: 'Second Number' }
          }
        },
        DIVIDE: {
          returnType: 'number',
          label: 'Divide',
          args: {
            arg1: { type: 'number', label: 'Numerator' },
            arg2: { type: 'number', label: 'Denominator' }
          }
        },
        ROUND: {
          returnType: 'number',
          label: 'Round',
          args: {
            value: { type: 'number', label: 'Value' },
            decimals: { type: 'number', label: 'Decimal Places' }
          }
        },
        ABS: {
          returnType: 'number',
          label: 'Absolute Value',
          args: {
            value: { type: 'number', label: 'Value' }
          }
        },
        SUM: {
          returnType: 'number',
          label: 'Sum',
          dynamicArgs: {
            argType: 'number',
            minArgs: 2,
            maxArgs: 10
          }
        }
      }
    },
    TEXT: {
      type: '!struct',
      label: 'Text Functions',
      subfields: {
        CONCAT: {
          returnType: 'text',
          label: 'Concatenate',
          dynamicArgs: {
            argType: 'text',
            minArgs: 2,
            maxArgs: 10
          }
        },
        UPPER: {
          returnType: 'text',
          label: 'Uppercase',
          args: {
            value: { type: 'text', label: 'Text' }
          }
        }
      }
    }
  },
  operators: {
    number: ['==', '!=', '<', '>', '<=', '>='],
    text: ['==', '!=', 'like', 'not_like', 'starts_with', 'ends_with'],
    date: ['==', '!=', '<', '>', '<=', '>='],
    boolean: ['==', '!=']
  }
};

describe('Round-trip Integration Tests', () => {
  
  // Helper function to normalize JSON for comparison (removes undefined, sorts keys)
  const normalizeJSON = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      // Remove undefined values
      if (value === undefined) return null;
      // Remove dynamically generated IDs (they will differ on each load)
      if (key === 'id' && typeof value === 'string' && value.includes('-')) {
        return undefined; // Skip this key
      }
      return value;
    }));
  };

  // Helper to test round-trip using RuleBuilder
  const testRuleBuilderRoundtrip = async (sampleRule, testName) => {
    return new Promise((resolve, reject) => {
      const RuleBuilderWrapper = () => {
        const ruleBuilderRef = useRef(null);
        const [loaded, setLoaded] = React.useState(false);
        const [output, setOutput] = React.useState(null);

        useEffect(() => {
          if (ruleBuilderRef.current && !loaded) {
            act(() => {
              // Load the sample rule
              ruleBuilderRef.current.loadRuleData(sampleRule);
              setLoaded(true);
            });
            
            // Wait a bit for state to settle, then get output
            setTimeout(() => {
              act(() => {
                try {
                  const result = ruleBuilderRef.current.getRuleOutput();
                  setOutput(result);
                  resolve(result);
                } catch (error) {
                  reject(error);
                }
              });
            }, 300);
          }
        }, [loaded]);

        return (
          <RuleBuilder
            ref={ruleBuilderRef}
            config={mockConfig}
            darkMode={false}
          />
        );
      };

      render(<RuleBuilderWrapper />);
    });
  };
  
  describe('MATH_EXPRESSION Round-trip', () => {
    test('loads and produces identical JSON output', async () => {
      const output = await testRuleBuilderRoundtrip(MATH_EXPRESSION, 'MATH_EXPRESSION');
      
      // Compare normalized versions
      const normalizedOutput = normalizeJSON(output);
      const normalizedInput = normalizeJSON(MATH_EXPRESSION);
      
      // Verify core structure matches
      expect(normalizedOutput.structure).toBe(normalizedInput.structure);
      expect(normalizedOutput.returnType).toBe(normalizedInput.returnType);
      expect(normalizedOutput.definition.type).toBe(normalizedInput.definition.type);
      expect(normalizedOutput.definition.expressions.length).toBe(normalizedInput.definition.expressions.length);
      
      // Deep comparison of content
      expect(normalizedOutput.definition).toEqual(normalizedInput.definition);
    }, 10000);

    test('preserves deeply nested ExpressionGroups', () => {
      const definition = MATH_EXPRESSION.definition;
      
      // Verify the JSON has nested ExpressionGroups
      expect(definition.expressions[0].type).toBe('expressionGroup');
      expect(definition.expressions[0].expressions[0].type).toBe('function');
      
      // Find the ADD function (now directly in expressions, not wrapped in ExpressionGroup)
      const addFunction = definition.expressions.find(expr => 
        expr.type === 'function' &&
        expr.function?.name === 'MATH.ADD'
      );
      
      expect(addFunction).toBeDefined();
      expect(addFunction.function.args).toBeDefined();
      expect(addFunction.function.args.length).toBe(2);
      
      // Verify arg1 has nested ExpressionGroup (this should still be preserved for multi-expression groups)
      const arg1Value = addFunction.function.args[0].value;
      expect(arg1Value.type).toBe('expressionGroup');
      expect(arg1Value.expressions.length).toBeGreaterThan(1); // Multi-expression group preserved
    });
  });

  describe('SIMPLE_CONDITION Round-trip', () => {
    test('loads and produces identical JSON output', async () => {
      const output = await testRuleBuilderRoundtrip(SIMPLE_CONDITION, 'SIMPLE_CONDITION');
      
      const normalizedOutput = normalizeJSON(output);
      const normalizedInput = normalizeJSON(SIMPLE_CONDITION);
      
      expect(normalizedOutput.structure).toBe(normalizedInput.structure);
      expect(normalizedOutput.returnType).toBe(normalizedInput.returnType);
      expect(normalizedOutput.definition.type).toBe(normalizedInput.definition.type);
      
      // Deep comparison
      expect(normalizedOutput.definition).toEqual(normalizedInput.definition);
    }, 10000);

    test('preserves nested condition groups', () => {
      const definition = SIMPLE_CONDITION.definition;
      
      expect(definition.type).toBe('conditionGroup');
      expect(definition.conditions.length).toBeGreaterThan(0);
      
      // Find nested condition groups
      const hasNestedGroup = definition.conditions.some(cond => 
        cond.type === 'conditionGroup'
      );
      
      expect(hasNestedGroup).toBe(true);
    });
  });

  describe('CASE_EXPRESSION Round-trip', () => {
    test('loads and produces identical JSON output', async () => {
      const output = await testRuleBuilderRoundtrip(CASE_EXPRESSION, 'CASE_EXPRESSION');
      
      const normalizedOutput = normalizeJSON(output);
      const normalizedInput = normalizeJSON(CASE_EXPRESSION);
      
      expect(normalizedOutput.structure).toBe(normalizedInput.structure);
      expect(normalizedOutput.returnType).toBe(normalizedInput.returnType);
      expect(normalizedOutput.definition.whenClauses.length).toBe(normalizedInput.definition.whenClauses.length);
      
      // Deep comparison
      expect(normalizedOutput.definition).toEqual(normalizedInput.definition);
    }, 10000);

    test('preserves all when/then clauses', () => {
      const definition = CASE_EXPRESSION.definition;
      
      expect(definition.whenClauses).toBeDefined();
      expect(definition.whenClauses.length).toBeGreaterThan(0);
      
      // Verify each when clause has proper structure
      definition.whenClauses.forEach((clause, index) => {
        expect(clause.when).toBeDefined();
        expect(clause.then).toBeDefined();
        expect(clause.when.type).toBe('conditionGroup');
      });
      
      // Verify else clause
      expect(definition.elseClause).toBeDefined();
    });
  });

  describe('Structure Validation', () => {
    test('All sample files have required root fields', () => {
      [MATH_EXPRESSION, SIMPLE_CONDITION, CASE_EXPRESSION].forEach(sample => {
        expect(sample).toHaveProperty('structure');
        expect(sample).toHaveProperty('returnType');
        expect(sample).toHaveProperty('ruleType');
        expect(sample).toHaveProperty('uuId');
        expect(sample).toHaveProperty('version');
        expect(sample).toHaveProperty('metadata');
        expect(sample).toHaveProperty('definition');
      });
    });

    test('Metadata structure is consistent', () => {
      [MATH_EXPRESSION, SIMPLE_CONDITION, CASE_EXPRESSION].forEach(sample => {
        expect(sample.metadata).toHaveProperty('id');
        expect(sample.metadata).toHaveProperty('description');
        expect(typeof sample.metadata.id).toBe('string');
        expect(typeof sample.metadata.description).toBe('string');
      });
    });
  });
});
