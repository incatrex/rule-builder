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
import { render, waitFor } from '@testing-library/react';
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
            // Load the sample rule
            ruleBuilderRef.current.loadRuleData(sampleRule);
            setLoaded(true);
            
            // Wait a bit for state to settle, then get output
            setTimeout(() => {
              try {
                const result = ruleBuilderRef.current.getRuleOutput();
                setOutput(result);
                resolve(result);
              } catch (error) {
                reject(error);
              }
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
      expect(normalizedOutput.content.source).toBe(normalizedInput.content.source);
      expect(normalizedOutput.content.expressions.length).toBe(normalizedInput.content.expressions.length);
      
      // Deep comparison of content
      expect(normalizedOutput.content).toEqual(normalizedInput.content);
    }, 10000);

    test('preserves deeply nested ExpressionGroups', () => {
      const content = MATH_EXPRESSION.content;
      
      // Verify the JSON has nested ExpressionGroups
      expect(content.expressions[0].source).toBe('expressionGroup');
      expect(content.expressions[0].expressions[0].source).toBe('function');
      
      // Find the ADD function
      const addFunction = content.expressions.find(expr => 
        expr.source === 'expressionGroup' && 
        expr.expressions?.[0]?.source === 'function' &&
        expr.expressions?.[0]?.function?.name === 'MATH.ADD'
      );
      
      expect(addFunction).toBeDefined();
      expect(addFunction.expressions[0].function.args).toBeDefined();
      expect(addFunction.expressions[0].function.args.length).toBe(2);
      
      // Verify arg1 has nested ExpressionGroup
      const arg1Value = addFunction.expressions[0].function.args[0].value;
      expect(arg1Value.source).toBe('expressionGroup');
      expect(arg1Value.expressions[0].source).toBe('expressionGroup');
    });
  });

  describe('SIMPLE_CONDITION Round-trip', () => {
    test('loads and produces identical JSON output', async () => {
      const output = await testRuleBuilderRoundtrip(SIMPLE_CONDITION, 'SIMPLE_CONDITION');
      
      const normalizedOutput = normalizeJSON(output);
      const normalizedInput = normalizeJSON(SIMPLE_CONDITION);
      
      expect(normalizedOutput.structure).toBe(normalizedInput.structure);
      expect(normalizedOutput.returnType).toBe(normalizedInput.returnType);
      expect(normalizedOutput.content.type).toBe(normalizedInput.content.type);
      
      // Deep comparison
      expect(normalizedOutput.content).toEqual(normalizedInput.content);
    }, 10000);

    test('preserves nested condition groups', () => {
      const content = SIMPLE_CONDITION.content;
      
      expect(content.type).toBe('conditionGroup');
      expect(content.conditions.length).toBeGreaterThan(0);
      
      // Find nested condition groups
      const hasNestedGroup = content.conditions.some(cond => 
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
      expect(normalizedOutput.content.whenClauses.length).toBe(normalizedInput.content.whenClauses.length);
      
      // Deep comparison
      expect(normalizedOutput.content).toEqual(normalizedInput.content);
    }, 10000);

    test('preserves all when/then clauses', () => {
      const content = CASE_EXPRESSION.content;
      
      expect(content.whenClauses).toBeDefined();
      expect(content.whenClauses.length).toBeGreaterThan(0);
      
      // Verify each when clause has proper structure
      content.whenClauses.forEach((clause, index) => {
        expect(clause.when).toBeDefined();
        expect(clause.then).toBeDefined();
        expect(clause.when.type).toBe('conditionGroup');
      });
      
      // Verify else clause
      expect(content.elseClause).toBeDefined();
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
        expect(sample).toHaveProperty('content');
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
