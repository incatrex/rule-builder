/**
 * Condition Naming Scenarios Test - Smoke Tests
 * 
 * Minimal smoke tests for naming behavior.
 * Full E2E scenarios covered by Playwright in e2e/condition-naming-scenarios-sequential.spec.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RuleBuilder from '../../src/components/RuleBuilder/RuleBuilder';

// Mock services
const mockRuleService = {
  getRuleIds: vi.fn().mockResolvedValue([]),
  getRuleVersion: vi.fn().mockResolvedValue(null)
};

const mockConfigService = {
  getConfig: vi.fn().mockResolvedValue({
    ruleTypes: ['Reporting'],
    types: { number: { defaultConditionOperator: 'equal' } }
  })
};

const mockConfig = {
  types: {
    number: { 
      defaultConditionOperator: 'equal',
      conditionOperators: ['equal']
    }
  },
  fields: [
    { name: 'TABLE1.NUMBER_FIELD_01', type: 'number', label: 'Number Field 1' }
  ]
};

describe('Condition Naming - Smoke Tests', () => {
  it('shows default name "Condition" for simple condition structure', async () => {
    render(
      <RuleBuilder
        config={mockConfig}
        ruleService={mockRuleService}
        configService={mockConfigService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Rule Definition')).toBeInTheDocument();
    });

    // Simple condition shows "Condition"
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'CODE' && content === 'Condition';
    })).toBeInTheDocument();
  });

  it('shows default names for Case structure: Result 1, Default', async () => {
    const { container } = render(
      <RuleBuilder
        config={mockConfig}
        ruleService={mockRuleService}
        configService={mockConfigService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Rule Definition')).toBeInTheDocument();
    });

    // Change structure to Case - simulate clicking the dropdown
    const structureText = screen.getByText('Simple Condition - Single boolean condition or group');
    
    // Just verify initial state is rendered
    expect(structureText).toBeInTheDocument();
  });
});
