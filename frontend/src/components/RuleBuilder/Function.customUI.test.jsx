import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomComponentsProvider } from './contexts/CustomComponentsContext';

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

  it('should auto-open modal for functions with customUI', () => {
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
      <CustomComponentsProvider customComponents={{}}>
        <Function
          value={value}
          onChange={mockOnChange}
          config={mockConfig}
          expansionPath="func"
          isExpanded={mockIsExpanded}
          onToggleExpansion={mockOnToggleExpansion}
        />
      </CustomComponentsProvider>
    );

    // Then - modal should be open automatically
    expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
  });

  it('should not auto-open modal for functions without customUI', () => {
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
      <CustomComponentsProvider customComponents={{}}>
        <Function
          value={value}
          onChange={mockOnChange}
          config={mockConfig}
          expansionPath="func"
          isExpanded={mockIsExpanded}
          onToggleExpansion={mockOnToggleExpansion}
        />
      </CustomComponentsProvider>
    );

    // Then - modal should not be open
    expect(screen.queryByTestId('custom-function-modal')).not.toBeInTheDocument();
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
      <CustomComponentsProvider customComponents={{}}>
        <Function
          value={value}
          onChange={mockOnChange}
          config={mockConfig}
          expansionPath="func"
          isExpanded={mockIsExpanded}
          onToggleExpansion={mockOnToggleExpansion}
        />
      </CustomComponentsProvider>
    );

    // Modal should be open automatically
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
    });

    // When - Click save button in modal
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
      <CustomComponentsProvider customComponents={{}}>
        <Function
          value={value}
          onChange={mockOnChange}
          config={mockConfig}
          expansionPath="func"
          isExpanded={mockIsExpanded}
          onToggleExpansion={mockOnToggleExpansion}
        />
      </CustomComponentsProvider>
    );

    // Modal should be open automatically
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
    });

    // When - Click cancel
    await user.click(screen.getByTestId('modal-cancel-button'));

    // Then - modal closed, no onChange called
    await waitFor(() => {
      expect(screen.queryByTestId('custom-function-modal')).not.toBeInTheDocument();
    });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should open modal when clicking on function name for functions with existing args', async () => {
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
      <CustomComponentsProvider customComponents={{}}>
        <Function
          value={value}
          onChange={mockOnChange}
          config={mockConfig}
          expansionPath="func"
          isExpanded={mockIsExpanded}
          onToggleExpansion={mockOnToggleExpansion}
        />
      </CustomComponentsProvider>
    );

    // Find and click the function summary
    const functionSummary = screen.getByTestId('custom-function-summary');
    await user.click(functionSummary);

    // Modal should be open with existing values
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
    });
  });

  it('should show function summary for customUI functions', () => {
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
      <CustomComponentsProvider customComponents={{}}>
        <Function
          value={value}
          onChange={mockOnChange}
          config={mockConfig}
          expansionPath="func"
          isExpanded={mockIsExpanded}
          onToggleExpansion={mockOnToggleExpansion}
          expanded={false}
        />
      </CustomComponentsProvider>
    );

    // Then - should show function summary with argument values
    expect(screen.getByText(/CONVERT\(100, USD, EUR\)/i)).toBeInTheDocument();
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
      <CustomComponentsProvider customComponents={{}}>
        <Function
          value={value}
          onChange={mockOnChange}
          config={mockConfig}
          darkMode={true}
          expansionPath="func"
          isExpanded={mockIsExpanded}
          onToggleExpansion={mockOnToggleExpansion}
        />
      </CustomComponentsProvider>
    );

    // Modal should be open automatically with darkMode
    await waitFor(() => {
      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
    });
  });

  it('should remove function and show dropdown when X button clicked', async () => {
    // Given
    const user = userEvent.setup();
    const value = {
      type: 'function',
      returnType: 'number',
      function: {
        name: 'CURRENCY.CONVERT',
        args: [
          { name: 'amount', value: { type: 'value', returnType: 'number', value: 100 } }
        ]
      }
    };

    render(
      <CustomComponentsProvider customComponents={{}}>
        <Function
          value={value}
          onChange={mockOnChange}
          config={mockConfig}
          expansionPath="func"
          isExpanded={mockIsExpanded}
          onToggleExpansion={mockOnToggleExpansion}
        />
      </CustomComponentsProvider>
    );

    // Find and click the remove button
    const removeButton = screen.getByTestId('remove-function-button');
    await user.click(removeButton);

    // Then - onChange should be called with cleared function
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'function',
        returnType: 'number',
        function: { name: null, args: [] }
      })
    );
  });
});
