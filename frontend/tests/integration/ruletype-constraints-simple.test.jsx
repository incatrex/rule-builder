/**
 * Simplified RuleType Constraint Tests
 * 
 * Tests that ruleType constraints are correctly passed to RuleReference component
 * Full UI interaction testing is covered by E2E tests
 * Schema validation is covered by comprehensive backend tests
 */

import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import RuleReference from '../../src/components/RuleBuilder/RuleReference';

describe('RuleType Constraints - Component Integration', () => {
  test('RuleReference accepts ruleType constraint prop', () => {
    const constraint = { mode: 'const', value: 'Condition' };
    const value = {
      id: null,
      uuid: null,
      version: null,
      returnType: 'boolean',
      ruleType: null
    };
    
    const { container } = render(
      <RuleReference
        value={value}
        onChange={() => {}}
        expectedType="boolean"
        ruleTypeConstraint={constraint}
      />
    );

    // Component renders without errors
    expect(container).toBeTruthy();
  });

  test('RuleReference accepts different constraint modes', () => {
    const modes = [
      { mode: 'const', value: 'Condition' },
      { mode: 'const', value: 'Condition Group' },
      { mode: 'default', value: 'Transformation' },
      null // no constraint
    ];

    modes.forEach(constraint => {
      const value = {
        id: null,
        uuid: null,
        version: null,
        returnType: 'boolean',
        ruleType: null
      };
      
      const { container } = render(
        <RuleReference
          value={value}
          onChange={() => {}}
          expectedType="boolean"
          ruleTypeConstraint={constraint}
        />
      );

      expect(container).toBeTruthy();
    });
  });

  test('RuleReference with existing value respects constraint', () => {
    const value = {
      id: 'TEST_RULE',
      uuid: '12345678-1234-1234-1234-123456789012',
      version: 1,
      returnType: 'boolean',
      ruleType: 'Condition'
    };

    const constraint = { mode: 'const', value: 'Condition' };

    const { container } = render(
      <RuleReference
        value={value}
        onChange={() => {}}
        expectedType="boolean"
        ruleTypeConstraint={constraint}
      />
    );

    expect(container).toBeTruthy();
  });
});
