import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FunctionArgument from './FunctionArgument';
import argumentOptionsService from '../../services/ArgumentOptionsService';

// Mock the ArgumentOptionsService
vi.mock('../../services/ArgumentOptionsService', () => ({
  default: {
    getOptionsForRef: vi.fn(),
    isPaginated: vi.fn()
  }
}));

// Mock Expression component to simplify testing
vi.mock('./Expression', () => ({
  default: ({ value, propArgDef, loading }) => (
    <div data-testid="expression-mock">
      <span>Expression Value: {JSON.stringify(value)}</span>
      {propArgDef?.options && (
        <span data-testid="options-count">
          Options: {propArgDef.options.length}
        </span>
      )}
      {loading && <span data-testid="loading-indicator">Loading...</span>}
    </div>
  )
}));

describe('FunctionArgument - Dynamic Options', () => {
  const mockConfig = {
    functions: {},
    fields: {}
  };

  const mockArg = {
    name: 'payday',
    value: {
      type: 'value',
      returnType: 'number',
      value: 1
    }
  };

  const mockOnChange = vi.fn();
  const mockOnRemove = vi.fn();
  const mockIsExpanded = vi.fn();
  const mockOnToggleExpansion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load dynamic options from service on mount when optionsRef specified', async () => {
    // Given
    const argDefWithOptionsRef = {
      name: 'payday',
      label: 'Pay Day',
      type: 'number',
      widget: 'select',
      optionsRef: 'daysOfMonth'
    };

    const mockOptions = [
      { value: 1, label: '1st' },
      { value: 2, label: '2nd' },
      { value: 3, label: '3rd' }
    ];

    argumentOptionsService.getOptionsForRef.mockResolvedValueOnce(mockOptions);
    argumentOptionsService.isPaginated.mockReturnValue(false);

    // When
    render(
      <FunctionArgument
        arg={mockArg}
        argDef={argDefWithOptionsRef}
        index={0}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then
    expect(argumentOptionsService.getOptionsForRef).toHaveBeenCalledWith('daysOfMonth');
    
    await waitFor(() => {
      expect(screen.getByTestId('options-count')).toHaveTextContent('Options: 3');
    });
  });

  it('should use static options when no optionsRef specified', () => {
    // Given
    const argDefWithStaticOptions = {
      name: 'caseType',
      label: 'Case Type',
      type: 'text',
      widget: 'select',
      options: [
        { value: 'UPPER', label: 'Uppercase' },
        { value: 'LOWER', label: 'Lowercase' }
      ]
    };

    // When
    render(
      <FunctionArgument
        arg={mockArg}
        argDef={argDefWithStaticOptions}
        index={0}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then
    expect(argumentOptionsService.getOptionsForRef).not.toHaveBeenCalled();
    expect(screen.getByTestId('options-count')).toHaveTextContent('Options: 2');
  });

  it('should show loading state while fetching options', async () => {
    // Given
    const argDefWithOptionsRef = {
      name: 'currency',
      label: 'Currency',
      type: 'text',
      widget: 'select',
      optionsRef: 'currencies'
    };

    // Create a promise that won't resolve immediately
    let resolvePromise;
    const loadingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    argumentOptionsService.getOptionsForRef.mockReturnValueOnce(loadingPromise);
    argumentOptionsService.isPaginated.mockReturnValue(false);

    // When
    render(
      <FunctionArgument
        arg={mockArg}
        argDef={argDefWithOptionsRef}
        index={0}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then - should show loading
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise([{ value: 'USD', label: 'US Dollar' }]);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });

  it('should detect paginated options and pass search callback', async () => {
    // Given
    const argDefWithPaginatedOptions = {
      name: 'customerId',
      label: 'Customer',
      type: 'text',
      widget: 'select',
      optionsRef: 'customers'
    };

    const mockOptions = [
      { value: 'CUST001', label: 'Acme Corp' }
    ];

    argumentOptionsService.getOptionsForRef.mockResolvedValueOnce(mockOptions);
    argumentOptionsService.isPaginated.mockReturnValue(true);

    // When
    render(
      <FunctionArgument
        arg={mockArg}
        argDef={argDefWithPaginatedOptions}
        index={0}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then
    await waitFor(() => {
      expect(argumentOptionsService.isPaginated).toHaveBeenCalledWith('customers');
    });
  });

  it('should handle API errors gracefully', async () => {
    // Given
    const argDefWithOptionsRef = {
      name: 'payday',
      label: 'Pay Day',
      type: 'number',
      widget: 'select',
      optionsRef: 'daysOfMonth'
    };

    argumentOptionsService.getOptionsForRef.mockRejectedValueOnce(
      new Error('Network error')
    );
    argumentOptionsService.isPaginated.mockReturnValue(false);

    // When
    render(
      <FunctionArgument
        arg={mockArg}
        argDef={argDefWithOptionsRef}
        index={0}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then - should still render without crashing
    await waitFor(() => {
      expect(screen.getByTestId('expression-mock')).toBeInTheDocument();
    });
  });

  it('should not load options when no widget specified', () => {
    // Given
    const argDefWithoutWidget = {
      name: 'amount',
      label: 'Amount',
      type: 'number'
      // No widget, so no options needed
    };

    // When
    render(
      <FunctionArgument
        arg={mockArg}
        argDef={argDefWithoutWidget}
        index={0}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then
    expect(argumentOptionsService.getOptionsForRef).not.toHaveBeenCalled();
  });

  it('should reload options when optionsRef changes', async () => {
    // Given
    const argDef1 = {
      name: 'field1',
      type: 'number',
      widget: 'select',
      optionsRef: 'daysOfMonth'
    };

    const argDef2 = {
      name: 'field2',
      type: 'text',
      widget: 'select',
      optionsRef: 'currencies'
    };

    argumentOptionsService.getOptionsForRef.mockResolvedValue([]);
    argumentOptionsService.isPaginated.mockReturnValue(false);

    // When
    const { rerender } = render(
      <FunctionArgument
        arg={mockArg}
        argDef={argDef1}
        index={0}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    await waitFor(() => {
      expect(argumentOptionsService.getOptionsForRef).toHaveBeenCalledWith('daysOfMonth');
    });

    vi.clearAllMocks();

    // Change optionsRef
    rerender(
      <FunctionArgument
        arg={mockArg}
        argDef={argDef2}
        index={0}
        onChange={mockOnChange}
        config={mockConfig}
        expansionPath="func"
        isExpanded={mockIsExpanded}
        onToggleExpansion={mockOnToggleExpansion}
      />
    );

    // Then
    await waitFor(() => {
      expect(argumentOptionsService.getOptionsForRef).toHaveBeenCalledWith('currencies');
    });
  });
});
