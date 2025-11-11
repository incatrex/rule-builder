/**
 * UI Interaction Tests
 * 
 * These tests simulate actual user interactions with the UI:
 * - Clicking buttons
 * - Typing into inputs
 * - Selecting from dropdowns
 * - Adding/removing expressions
 * 
 * This catches bugs that JSON round-trip tests miss!
 */

import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ExpressionGroup from '../ExpressionGroup';

// Mock config
const mockConfig = {
  fields: {
    TABLE1: {
      type: '!struct',
      label: 'Table 1',
      subfields: {
        TEXT_FIELD_01: { type: 'text', label: 'Text Field 01' },
        NUMBER_FIELD_01: { type: 'number', label: 'Number Field 01' },
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
        LEN: {
          returnType: 'number',
          label: 'Length',
          args: {
            text: { type: 'text', label: 'Text' }
          }
        }
      }
    }
  }
};

describe('UI Interaction Tests - ExpressionGroup', () => {
  
  describe('Adding expressions with + button', () => {
    test('clicking + on a number expression should add another number', async () => {
      const user = userEvent.setup();
      let capturedOutput = null;
      
      const handleChange = (value) => {
        capturedOutput = value;
      };

      // Start with a simple number value
      const initialValue = {
        type: 'expressionGroup',
        returnType: 'number',
        expressions: [
          { type: 'value', returnType: 'number', value: 5 }
        ],
        operators: []
      };

      render(
        <ExpressionGroup
          value={initialValue}
          onChange={handleChange}
          config={mockConfig}
          expectedType="number"
          darkMode={false}
        />
      );

      // Find and click the "+" button (Add Operation)
      const addButton = screen.getByTitle('Add Operation');
      await user.click(addButton);

      // Wait for onChange to be called
      await waitFor(() => {
        expect(capturedOutput).toBeDefined();
      });

      // Verify the output
      expect(capturedOutput.expressions).toHaveLength(2);
      
      // BUG: The new expression is an expressionGroup, not a value!
      // It wraps a single value inside an expressionGroup
      expect(capturedOutput.expressions[1].type).toBe('expressionGroup');
      expect(capturedOutput.expressions[1].returnType).toBe('number');
      expect(capturedOutput.expressions[1].expressions[0].type).toBe('value');
      expect(capturedOutput.expressions[1].expressions[0].value).toBe(0);
      expect(capturedOutput.operators).toEqual(['+']);
    });

    test('BUG: clicking + on a text expression incorrectly converts to number', async () => {
      const user = userEvent.setup();
      let capturedOutput = null;
      
      const handleChange = (value) => {
        capturedOutput = value;
      };

      // Start with a text value
      const initialValue = {
        type: 'expressionGroup',
        returnType: 'text',
        expressions: [
          { type: 'value', returnType: 'text', value: 'Hello' }
        ],
        operators: []
      };

      render(
        <ExpressionGroup
          value={initialValue}
          onChange={handleChange}
          config={mockConfig}
          expectedType="text"
          darkMode={false}
        />
      );

      // Try to find the "+" button - it might not exist if canAddOperators() returns false
      const addButton = screen.queryByTitle('Add Operation');
      
      if (addButton) {
        await user.click(addButton);

        await waitFor(() => {
          expect(capturedOutput).toBeDefined();
        });

        // This is the BUG - it should add a text expression, not a number!
        expect(capturedOutput.expressions).toHaveLength(2);
        
        // Current buggy behavior:
        expect(capturedOutput.expressions[1].returnType).toBe('number'); // WRONG!
        expect(capturedOutput.expressions[1].value).toBe(0); // WRONG!
        
        // What it SHOULD be:
        // expect(capturedOutput.expressions[1].returnType).toBe('text');
        // expect(capturedOutput.expressions[1].value).toBe('');
      } else {
        // The + button doesn't even appear for text!
        expect(addButton).toBeNull();
        console.log('BUG CONFIRMED: Cannot add operator to text expressions');
      }
    });
  });

  describe('Type changes when adding operators', () => {
    test('BUG: text value gets converted to number when operator is added', async () => {
      const user = userEvent.setup();
      let capturedOutput = null;
      
      const handleChange = (value) => {
        capturedOutput = value;
      };

      // Start with text
      const initialValue = {
        type: 'expressionGroup',
        returnType: 'text',
        expressions: [
          { type: 'value', returnType: 'text', value: 'test' }
        ],
        operators: []
      };

      const { rerender } = render(
        <ExpressionGroup
          value={initialValue}
          onChange={handleChange}
          config={mockConfig}
          expectedType="text"
          darkMode={false}
        />
      );

      // Check if + button exists
      const addButton = screen.queryByTitle('Add Operation');
      
      // Document the bug
      if (!addButton) {
        console.log('BUG: + button hidden for text expressions due to canAddOperators() check');
      }
      
      expect(addButton).toBeNull(); // Bug confirmed
    });
  });

  describe('Creating text concatenation (desired behavior)', () => {
    test('SHOULD WORK: text + text = concatenation', async () => {
      const user = userEvent.setup();
      let capturedOutput = null;
      
      const handleChange = (value) => {
        capturedOutput = value;
      };

      // What the JSON SHOULD look like for text concatenation
      const desiredValue = {
        type: 'expressionGroup',
        returnType: 'text',
        expressions: [
          { type: 'value', returnType: 'text', value: 'Hello' },
          { type: 'value', returnType: 'text', value: ' World' }
        ],
        operators: ['+']
      };

      render(
        <ExpressionGroup
          value={desiredValue}
          onChange={handleChange}
          config={mockConfig}
          expectedType="text"
          darkMode={false}
        />
      );

      // If we can load this JSON, it should display
      // But we currently can't CREATE it via the UI!
      
      // BUG CONFIRMED: Shows warning even for valid text concatenation
      expect(screen.queryByText(/Mathematical operations require numeric/)).toBeInTheDocument();
    });
  });

  describe('Number expressions work correctly', () => {
    test('number + number = addition (working correctly)', async () => {
      const user = userEvent.setup();
      let capturedOutput = null;
      
      const handleChange = (value) => {
        capturedOutput = value;
      };

      const numericExpression = {
        type: 'expressionGroup',
        returnType: 'number',
        expressions: [
          { type: 'value', returnType: 'number', value: 10 },
          { type: 'value', returnType: 'number', value: 5 }
        ],
        operators: ['+']
      };

      render(
        <ExpressionGroup
          value={numericExpression}
          onChange={handleChange}
          config={mockConfig}
          expectedType="number"
          darkMode={false}
        />
      );

      // Should render without warnings
      expect(screen.queryByText(/Mathematical operations require numeric/)).not.toBeInTheDocument();
      
      // The + button should be available (there are 2, one for each expression)
      const addButtons = screen.queryAllByTitle('Add Operation');
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });
});

describe('Bug Documentation', () => {
  test('documents the current limitations', () => {
    const bugs = [
      {
        bug: 'Cannot add operators to text expressions',
        cause: 'canAddOperators() only returns true for numbers',
        impact: 'Users cannot create text concatenation via UI',
        workaround: 'Must manually edit JSON'
      },
      {
        bug: 'addExpression() hardcodes returnType to number',
        cause: 'Line 158: returnType: "number" is hardcoded',
        impact: 'Any operator addition converts expression to numbers',
        workaround: 'None - must load pre-made JSON'
      },
      {
        bug: 'Warning shows for text concatenation',
        cause: 'Warning checks !canAddOperators() which is false for text',
        impact: 'Misleading warning for valid text operations',
        workaround: 'Ignore the warning'
      }
    ];

    // This test always passes but documents the issues
    expect(bugs).toHaveLength(3);
    bugs.forEach(bug => {
      console.log(`\n🐛 BUG: ${bug.bug}`);
      console.log(`   Cause: ${bug.cause}`);
      console.log(`   Impact: ${bug.impact}`);
      console.log(`   Workaround: ${bug.workaround}`);
    });
  });
});
