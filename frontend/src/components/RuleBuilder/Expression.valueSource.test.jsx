import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Expression from './Expression';

// Mock antd icons
vi.mock('@ant-design/icons', () => ({
  NumberOutlined: () => <span data-testid="icon-value">NumberIcon</span>,
  FieldTimeOutlined: () => <span data-testid="icon-field">FieldIcon</span>,
  FunctionOutlined: () => <span data-testid="icon-function">FunctionIcon</span>,
  LinkOutlined: () => <span data-testid="icon-ruleRef">RuleIcon</span>,
  DeleteOutlined: () => <span>DeleteIcon</span>,
  EditOutlined: () => <span>EditIcon</span>,
  CheckCircleOutlined: () => <span>CheckIcon</span>,
  WarningOutlined: () => <span>WarningIcon</span>,
}));

// Mock Field, FunctionComponent, RuleRefComponent
vi.mock('./Field', () => ({
  default: () => <div data-testid="field-component">Field</div>
}));

vi.mock('./Function', () => ({
  default: () => <div data-testid="function-component">Function</div>
}));

vi.mock('./RuleRef', () => ({
  default: () => <div data-testid="ruleref-component">RuleRef</div>
}));

describe('Expression - Value Source Selection', () => {
  const mockConfig = {
    fields: {
      name: { label: 'Name', type: 'text' },
      age: { label: 'Age', type: 'number' }
    },
    functions: {
      LEN: {
        label: 'Length',
        returnType: 'number',
        args: [{ type: 'text', valueSources: ['value', 'field', 'function'] }]
      },
      COUNT: {
        label: 'Count',
        returnType: 'number',
        args: [{ type: 'text', valueSources: ['field', 'function'] }]
      },
      SUM: {
        label: 'Sum',
        returnType: 'number',
        args: [{ type: 'number', valueSources: ['field'] }]
      }
    },
    operators: {
      equal: { label: '=' }
    },
    settings: {
      defaultValueSources: ['value', 'field', 'function', 'ruleRef']
    }
  };

  const mockHandleValueChange = vi.fn();
  const mockSetExpanded = vi.fn();
  const mockIsExpanded = vi.fn(() => false);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Source Selection', () => {
    it('should default to first available source when value not in valueSources', async () => {
      // COUNT function has valueSources: ['field', 'function'] (no 'value')
      const argDef = {
        type: 'text',
        valueSources: ['field', 'function']
      };

      render(
        <Expression
          value={{ type: 'field', returnType: 'text', field: 'name' }} // Start with valid source
          config={mockConfig}
          expectedType="text"
          handleValueChange={mockHandleValueChange}
          propArgDef={argDef}
          setExpanded={mockSetExpanded}
          isExpanded={mockIsExpanded}
        />
      );

      // Should show dropdown selector with field icon visible
      await waitFor(() => {
        const icon = screen.getByTestId('icon-field');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should use first available source for field-only arguments', () => {
      // SUM function has valueSources: ['field'] (only field)
      const argDef = {
        type: 'number',
        valueSources: ['field']
      };

      render(
        <Expression
          value={{ type: 'value', returnType: 'number', value: 0 }}
          config={mockConfig}
          expectedType="number"
          handleValueChange={mockHandleValueChange}
          propArgDef={argDef}
          setExpanded={mockSetExpanded}
          isExpanded={mockIsExpanded}
        />
      );

      // Should show field icon (only option, no dropdown)
      expect(screen.getByTestId('icon-field')).toBeInTheDocument();
    });

    it('should keep value source when it is in valueSources', () => {
      // LEN function has valueSources: ['value', 'field', 'function']
      const argDef = {
        type: 'text',
        valueSources: ['value', 'field', 'function']
      };

      render(
        <Expression
          value={{ type: 'value', returnType: 'text', value: 'test' }}
          config={mockConfig}
          expectedType="text"
          handleValueChange={mockHandleValueChange}
          propArgDef={argDef}
          setExpanded={mockSetExpanded}
          isExpanded={mockIsExpanded}
        />
      );

      // Should show value icon since 'value' is valid
      expect(screen.getByTestId('icon-value')).toBeInTheDocument();
    });

    it('should respect current type when valid', () => {
      const argDef = {
        type: 'text',
        valueSources: ['field', 'function']
      };

      render(
        <Expression
          value={{ type: 'function', returnType: 'text', function: { name: 'LEN', args: [] } }}
          config={mockConfig}
          expectedType="text"
          handleValueChange={mockHandleValueChange}
          propArgDef={argDef}
          setExpanded={mockSetExpanded}
          isExpanded={mockIsExpanded}
        />
      );

      // Should show function icon since 'function' is valid and current
      expect(screen.getByTestId('icon-function')).toBeInTheDocument();
    });
  });

  describe('Source Selector Dropdown', () => {
    it('should not show dropdown when only one source available', () => {
      const argDef = {
        type: 'number',
        valueSources: ['field']
      };

      render(
        <Expression
          value={{ type: 'field', returnType: 'number', field: 'age' }}
          config={mockConfig}
          expectedType="number"
          handleValueChange={mockHandleValueChange}
          propArgDef={argDef}
          setExpanded={mockSetExpanded}
          isExpanded={mockIsExpanded}
        />
      );

      // Should show just the icon
      expect(screen.getByTestId('icon-field')).toBeInTheDocument();
    });
  });

  describe('Priority Order', () => {
    it('should prioritize propArgDef.valueSources over config.settings', () => {
      const argDef = {
        type: 'text',
        valueSources: ['field'] // Only field
      };

      render(
        <Expression
          value={{ type: 'field', returnType: 'text', field: 'name' }}
          config={mockConfig} // Has defaultValueSources with all types
          expectedType="text"
          handleValueChange={mockHandleValueChange}
          propArgDef={argDef}
          setExpanded={mockSetExpanded}
          isExpanded={mockIsExpanded}
        />
      );

      // Should only show field icon, not value (from config.settings)
      expect(screen.getByTestId('icon-field')).toBeInTheDocument();
      expect(screen.queryByTestId('icon-value')).not.toBeInTheDocument();
    });

    it('should use config.settings.defaultValueSources when propArgDef not provided', () => {
      render(
        <Expression
          value={{ type: 'value', returnType: 'text', value: '' }}
          config={mockConfig}
          expectedType="text"
          handleValueChange={mockHandleValueChange}
          // No propArgDef
          setExpanded={mockSetExpanded}
          isExpanded={mockIsExpanded}
        />
      );

      // Should show value icon (first in config.settings.defaultValueSources)
      expect(screen.getByTestId('icon-value')).toBeInTheDocument();
    });

    it('should prioritize allowedSources prop over everything', () => {
      const argDef = {
        type: 'text',
        valueSources: ['value', 'field', 'function']
      };

      render(
        <Expression
          value={{ type: 'function', returnType: 'text', function: { name: 'LEN', args: [] } }}
          config={mockConfig}
          expectedType="text"
          handleValueChange={mockHandleValueChange}
          propArgDef={argDef}
          allowedSources={['function']} // Override to only function
          setExpanded={mockSetExpanded}
          isExpanded={mockIsExpanded}
        />
      );

      // Should show function icon only
      expect(screen.getByTestId('icon-function')).toBeInTheDocument();
      expect(screen.queryByTestId('icon-value')).not.toBeInTheDocument();
      expect(screen.queryByTestId('icon-field')).not.toBeInTheDocument();
    });
  });
});
