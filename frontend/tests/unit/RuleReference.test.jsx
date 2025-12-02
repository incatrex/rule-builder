/**
 * RuleReference Component Unit Tests
 * 
 * Tests the ruleType constraint logic for RuleReference component
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import RuleReference from '../../src/components/RuleBuilder/RuleReference';

// Mock RuleSelector to test prop passing
vi.mock('../../src/components/RuleBuilder/RuleSelector', () => ({
  default: vi.fn(({ ruleTypeConstraint, initialRuleType, onRuleTypeChange, ...props }) => (
    <div data-testid="mock-rule-selector">
      <div data-testid="constraint-mode">{ruleTypeConstraint?.mode || 'none'}</div>
      <div data-testid="constraint-value">{ruleTypeConstraint?.value || 'none'}</div>
      <div data-testid="initial-rule-type">{initialRuleType || 'none'}</div>
      <button 
        data-testid="change-rule-type-btn"
        onClick={() => onRuleTypeChange && onRuleTypeChange('Reporting')}
      >
        Change Type
      </button>
    </div>
  ))
}));

describe('RuleReference - RuleType Constraint Logic', () => {
  const mockConfig = {
    ruleTypes: ['Reporting', 'Transformation', 'Aggregation', 'Validation', 'Condition', 'Condition Group']
  };

  test('passes const constraint to RuleSelector', () => {
    const constraint = { mode: 'const', value: 'Condition' };
    
    render(
      <RuleReference
        value={{}}
        onChange={vi.fn()}
        config={mockConfig}
        ruleTypeConstraint={constraint}
      />
    );

    expect(screen.getByTestId('constraint-mode')).toHaveTextContent('const');
    expect(screen.getByTestId('constraint-value')).toHaveTextContent('Condition');
  });

  test('passes default constraint to RuleSelector', () => {
    const constraint = { mode: 'default', value: 'Transformation' };
    
    render(
      <RuleReference
        value={{}}
        onChange={vi.fn()}
        config={mockConfig}
        ruleTypeConstraint={constraint}
      />
    );

    expect(screen.getByTestId('constraint-mode')).toHaveTextContent('default');
    expect(screen.getByTestId('constraint-value')).toHaveTextContent('Transformation');
  });

  test('passes no constraint when null', () => {
    render(
      <RuleReference
        value={{}}
        onChange={vi.fn()}
        config={mockConfig}
        ruleTypeConstraint={null}
      />
    );

    expect(screen.getByTestId('constraint-mode')).toHaveTextContent('none');
    expect(screen.getByTestId('constraint-value')).toHaveTextContent('none');
  });

  test('uses constraint value as initial ruleType when no value provided', () => {
    const constraint = { mode: 'const', value: 'Condition' };
    
    render(
      <RuleReference
        value={{}} // No ruleType in value
        onChange={vi.fn()}
        config={mockConfig}
        ruleTypeConstraint={constraint}
      />
    );

    expect(screen.getByTestId('initial-rule-type')).toHaveTextContent('Condition');
  });

  test('respects existing ruleType in value over constraint', () => {
    const constraint = { mode: 'default', value: 'Transformation' };
    
    render(
      <RuleReference
        value={{ ruleType: 'Reporting' }} // Existing value
        onChange={vi.fn()}
        config={mockConfig}
        ruleTypeConstraint={constraint}
      />
    );

    expect(screen.getByTestId('initial-rule-type')).toHaveTextContent('Reporting');
  });

  test('onChange resets rule selection when ruleType changes with default constraint', async () => {
    const constraint = { mode: 'default', value: 'Transformation' };
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <RuleReference
        value={{ 
          id: 'EXISTING_RULE',
          uuid: 'abc-123',
          version: 1,
          ruleType: 'Transformation'
        }}
        onChange={onChange}
        config={mockConfig}
        ruleTypeConstraint={constraint}
      />
    );

    const changeBtn = screen.getByTestId('change-rule-type-btn');
    await user.click(changeBtn);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleType: 'Reporting',
          id: null,
          uuid: null,
          version: null
        })
      );
    });
  });

  test('const constraint should prevent ruleType changes (tested via RuleSelector)', () => {
    const constraint = { mode: 'const', value: 'Condition' };
    const onChange = vi.fn();
    
    render(
      <RuleReference
        value={{ ruleType: 'Condition' }}
        onChange={onChange}
        config={mockConfig}
        ruleTypeConstraint={constraint}
      />
    );

    // The mock RuleSelector should show it's in const mode
    expect(screen.getByTestId('constraint-mode')).toHaveTextContent('const');
    
    // In real implementation, RuleSelector will disable the dropdown for const mode
    // This test verifies the constraint is passed correctly
  });
});
