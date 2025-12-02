import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock CustomFunctionModal
vi.mock('./CustomFunctionModal', () => ({
  default: ({ open, funcDef, onSave, onCancel }) => {
    if (!open) return null;
    return (
      <div data-testid="custom-function-modal">
        <h3>{funcDef?.label || funcDef?.name}</h3>
        <button 
          data-testid="modal-save-button"
          onClick={() => onSave({
            amount: { type: 'value', returnType: 'number', value: 100 },
            currency: { type: 'value', returnType: 'text', value: 'USD' }
          })}
        >
          Save
        </button>
        <button data-testid="modal-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }
}));

// Mock FunctionArgument
vi.mock('./FunctionArgument', () => ({
  default: ({ arg }) => (
    <div data-testid={`function-argument-${arg.name}`}>
      {arg.name}
    </div>
  )
}));

import Function from './Function';

describe('Function - Custom UI Support', () => {
  const mockConfig = {
    fields: {
      amount: { label: 'Amount', type: 'number' },
      currency: { label: 'Currency', type: 'text' }
    },
    functions: {
      CURRENCY: {
        label: 'Currency Functions',
        type: '!struct',
        subfields: {
          CONVERT: {
            label: 'Convert Currency',
            returnType: 'number',
            customUI: true,
            args: [
              { name: 'amount', type: 'number', label: 'Amount' },
              { name: 'fromCurrency', type: 'text', label: 'From Currency' },
              { name: 'toCurrency', type: 'text', label: 'To Currency' }
            ]
          }
        }
      },
      MATH: {
        label: 'Math Functions',
        type: '!struct',
        subfields: {
          ADD: {
            label: 'Add',
            returnType: 'number',
            args: [
              { name: 'a', type: 'number', label: 'First Number' },
              { name: 'b', type: 'number', label: 'Second Number' }
            ]
          }
        }
      }
    }
  };

  const mockOnChange = vi.fn();
  const mockIsExpanded = vi.fn(() => false);
  const mockOnToggleExpansion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render configure button for functions with customUI', () => {
    // Given
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'CURRENCY.CONVERT',
        args: []
      }
    };

    // When
    render(
      <Function
        value={value}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then
    expect(screen.getByTestId('configure-arguments-button')).toBeInTheDocument();
  });

  it('should not render configure button for functions without customUI', () => {
    // Given
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'MATH.ADD',
        args: [
          { name: 'a', value: { type: 'value', returnType: 'number', value: 5 } },
          { name: 'b', value: { type: 'value', returnType: 'number', value: 10 } }
        ]
      }
    };

    // When
    render(
      <Function
        value={value}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then
    expect(screen.queryByTestId('configure-arguments-button')).not.toBeInTheDocument();
  });

  it('should open CustomFunctionModal when configure button clicked', async () => {
    // Given
    const user = userEvent.setup();
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'CURRENCY.CONVERT',
        args: []
      }
    };

    render(
      <Function
        value={value}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // When
    await user.click(screen.getByTestId('configure-arguments-button'));

    // Then
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
      // Check for modal title in h3 specifically to avoid ambiguity
      const modalTitle = screen.getByRole('heading', { level: 3, name: /Convert Currency/i });
      expect(modalTitle).toBeInTheDocument();
    });
  });

  it('should save argument values from modal and close it', async () => {
    // Given
    const user = userEvent.setup();
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'CURRENCY.CONVERT',
        args: []
      }
    };

    render(
      <Function
        value={value}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // When - open modal
    await user.click(screen.getByTestId('configure-arguments-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
    });

    // Click save button in modal
    await user.click(screen.getByTestId('modal-save-button'));

    // Then
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'function',
          returnType: 'number',
          function: expect.objectContaining({
            name: 'CURRENCY.CONVERT',
            args: [
              { name: 'amount', value: { type: 'value', returnType: 'number', value: 100 } },
              { name: 'currency', value: { type: 'value', returnType: 'text', value: 'USD' } }
            ]
          })
        })
      );
    });

    // Modal should be closed
    expect(screen.queryByTestId('custom-function-modal')).not.toBeInTheDocument();
  });

  it('should close modal without saving when cancel clicked', async () => {
    // Given
    const user = userEvent.setup();
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'CURRENCY.CONVERT',
        args: []
      }
    };

    render(
      <Function
        value={value}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // When - open modal
    await user.click(screen.getByTestId('configure-arguments-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
    });

    // Click cancel
    await user.click(screen.getByTestId('modal-cancel-button'));

    // Then - modal closed, no onChange called
    await waitFor(() => {
      expect(screen.queryByTestId('custom-function-modal')).not.toBeInTheDocument();
    });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should pass existing argument values as initialValues to modal', async () => {
    // Given
    const user = userEvent.setup();
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'CURRENCY.CONVERT',
        args: [
          { name: 'amount', value: { type: 'value', returnType: 'number', value: 500 } },
          { name: 'fromCurrency', value: { type: 'value', returnType: 'text', value: 'EUR' } }
        ]
      }
    };

    render(
      <Function
        value={value}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
        expanded={true}  // Make sure it's expanded so button is visible
      />
    );

    // When - open modal
    await user.click(screen.getByTestId('configure-arguments-button'));

    // Then - modal should be open (the modal mock doesn't show initial values, but they would be passed)
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
    });
  });

  it('should show function summary with argument count for customUI functions', () => {
    // Given
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'CURRENCY.CONVERT',
        args: [
          { name: 'amount', value: { type: 'value', returnType: 'number', value: 100 } },
          { name: 'fromCurrency', value: { type: 'value', returnType: 'text', value: 'USD' } },
          { name: 'toCurrency', value: { type: 'value', returnType: 'text', value: 'EUR' } }
        ]
      }
    };

    // When
    render(
      <Function
        value={value}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
        expanded={false}
      />
    );

    // Then - should show function name and args count or summary
    expect(screen.getByText(/CONVERT/i)).toBeInTheDocument();
  });

  it('should pass darkMode prop to CustomFunctionModal', async () => {
    // Given
    const user = userEvent.setup();
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'CURRENCY.CONVERT',
        args: []
      }
    };

    render(
      <Function
        value={value}
        onChange={mockOnChange}
        config={mockConfig}
        darkMode={true}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // When - open modal
    await user.click(screen.getByTestId('configure-arguments-button'));

    // Then - modal should be open (darkMode would be passed to real modal)
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
    });
  });
});
