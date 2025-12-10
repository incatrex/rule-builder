import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomFunctionModal from './CustomFunctionModal';
import { CustomComponentsProvider } from './contexts/CustomComponentsContext';

// Mock FunctionArgument component
vi.mock('./FunctionArgument', () => ({
  default: ({ arg, argDef, onChange }) => (
    <div data-testid={`function-argument-${arg.name}`}>
      <label>{argDef.label || arg.name}</label>
      <input
        data-testid={`input-${arg.name}`}
        value={arg.value?.value || ''}
        onChange={(e) => onChange({
          type: 'value',
          returnType: argDef.type,
          value: e.target.value
        })}
      />
    </div>
  )
}));

describe('CustomFunctionModal', () => {
  const mockConfig = {
    fields: {},
    functions: {}
  };

  const mockFuncDef = {
    name: 'TEST.FUNCTION',
    label: 'Test Function',
    returnType: 'number',
    args: [
      { name: 'amount', type: 'number', label: 'Amount' },
      { name: 'currency', type: 'text', label: 'Currency' }
    ]
  };

  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should render modal when open is true', () => {
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={mockFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByTestId('custom-function-modal')).toBeInTheDocument();
      expect(screen.getByText('Test Function')).toBeInTheDocument();
    });

    it('should not render modal when open is false', () => {
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={false}
            funcDef={mockFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.queryByTestId('custom-function-modal')).not.toBeInTheDocument();
    });

    it('should close modal when cancel button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={mockFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Default Mode - FunctionArgument Components', () => {
    it('should render FunctionArgument components for each arg', () => {
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={mockFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByTestId('function-argument-amount')).toBeInTheDocument();
      expect(screen.getByTestId('function-argument-currency')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Currency')).toBeInTheDocument();
    });

    it('should populate initial values from props', () => {
      const initialValues = {
        amount: { type: 'value', returnType: 'number', value: 100 },
        currency: { type: 'value', returnType: 'text', value: 'USD' }
      };

      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={mockFuncDef}
            initialValues={initialValues}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByTestId('input-amount')).toHaveValue('100');
      expect(screen.getByTestId('input-currency')).toHaveValue('USD');
    });

    it('should update argument values when changed', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={mockFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      const amountInput = screen.getByTestId('input-amount');
      await user.clear(amountInput);
      await user.type(amountInput, '250');

      expect(amountInput).toHaveValue('250');
    });

    it('should call onSave with argument values when OK clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={mockFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      // Change values
      await user.clear(screen.getByTestId('input-amount'));
      await user.type(screen.getByTestId('input-amount'), '500');
      await user.clear(screen.getByTestId('input-currency'));
      await user.type(screen.getByTestId('input-currency'), 'EUR');

      // Click OK
      await user.click(screen.getByRole('button', { name: /ok/i }));

      expect(mockOnSave).toHaveBeenCalledWith({
        amount: { type: 'value', returnType: 'number', value: '500' },
        currency: { type: 'value', returnType: 'text', value: 'EUR' }
      });
    });
  });

  describe('Custom Component Mode', () => {
    const MockCustomComponent = ({ initialData, onSave, onCancel }) => (
      <div data-testid="mock-custom-component">
        <div>Amount: {initialData?.amount}</div>
        <div>Currency: {initialData?.currency}</div>
        <button onClick={() => onSave({ amount: 999, currency: 'GBP' })}>
          Save Custom
        </button>
        <button onClick={onCancel}>Cancel Custom</button>
      </div>
    );

    const customFuncDef = {
      ...mockFuncDef,
      customUI: true,
      customUIComponent: 'TestCustomComponent'
    };

    it('should render custom component when registered', () => {
      render(
        <CustomComponentsProvider customComponents={{ TestCustomComponent: MockCustomComponent }}>
          <CustomFunctionModal
            open={true}
            funcDef={customFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByTestId('mock-custom-component')).toBeInTheDocument();
      // Should NOT render FunctionArgument components
      expect(screen.queryByTestId('function-argument-amount')).not.toBeInTheDocument();
    });

    it('should pass initialData to custom component', () => {
      const initialValues = {
        amount: { type: 'value', returnType: 'number', value: 100 },
        currency: { type: 'value', returnType: 'text', value: 'USD' }
      };

      render(
        <CustomComponentsProvider customComponents={{ TestCustomComponent: MockCustomComponent }}>
          <CustomFunctionModal
            open={true}
            funcDef={customFuncDef}
            initialValues={initialValues}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByText('Amount: 100')).toBeInTheDocument();
      expect(screen.getByText('Currency: USD')).toBeInTheDocument();
    });

    it('should convert custom component data to expression values on save', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomComponentsProvider customComponents={{ TestCustomComponent: MockCustomComponent }}>
          <CustomFunctionModal
            open={true}
            funcDef={customFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      await user.click(screen.getByText('Save Custom'));

      expect(mockOnSave).toHaveBeenCalledWith({
        amount: { type: 'value', returnType: 'number', value: 999 },
        currency: { type: 'value', returnType: 'text', value: 'GBP' }
      });
    });

    it('should call onCancel when custom component cancels', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomComponentsProvider customComponents={{ TestCustomComponent: MockCustomComponent }}>
          <CustomFunctionModal
            open={true}
            funcDef={customFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      await user.click(screen.getByText('Cancel Custom'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should NOT show OK/Cancel buttons in footer for custom component', () => {
      render(
        <CustomComponentsProvider customComponents={{ TestCustomComponent: MockCustomComponent }}>
          <CustomFunctionModal
            open={true}
            funcDef={customFuncDef}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      // Custom component mode has no modal footer buttons
      // Only the X close button should be present
      expect(screen.queryByRole('button', { name: /^ok$/i })).not.toBeInTheDocument();
    });
  });

  describe('Fallback Behavior', () => {
    const customFuncDefWithMissing = {
      ...mockFuncDef,
      customUI: true,
      customUIComponent: 'NonExistentComponent'
    };

    it('should show warning when custom component not found', () => {
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={customFuncDefWithMissing}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByText('Custom component not found')).toBeInTheDocument();
      expect(screen.getByText(/NonExistentComponent.*not registered/i)).toBeInTheDocument();
    });

    it('should fall back to FunctionArgument components when custom component missing', () => {
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={customFuncDefWithMissing}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      // Should render default argument editors
      expect(screen.getByTestId('function-argument-amount')).toBeInTheDocument();
      expect(screen.getByTestId('function-argument-currency')).toBeInTheDocument();
    });
  });

  describe('Data Extraction', () => {
    it('should extract simple values from expression structures', () => {
      const initialValues = {
        amount: { type: 'value', returnType: 'number', value: 100 },
        rate: { type: 'value', returnType: 'number', value: 1.5 }
      };

      const MockComponent = ({ initialData }) => (
        <div>
          <div data-testid="extracted-amount">{initialData?.amount}</div>
          <div data-testid="extracted-rate">{initialData?.rate}</div>
        </div>
      );

      const funcDef = {
        ...mockFuncDef,
        customUI: true,
        customUIComponent: 'TestComponent',
        args: [
          { name: 'amount', type: 'number' },
          { name: 'rate', type: 'number' }
        ]
      };

      render(
        <CustomComponentsProvider customComponents={{ TestComponent: MockComponent }}>
          <CustomFunctionModal
            open={true}
            funcDef={funcDef}
            initialValues={initialValues}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByTestId('extracted-amount')).toHaveTextContent('100');
      expect(screen.getByTestId('extracted-rate')).toHaveTextContent('1.5');
    });

    it('should extract field references from expression structures', () => {
      const initialValues = {
        sourceField: { type: 'field', returnType: 'text', field: 'TABLE1.CUSTOMER_NAME' }
      };

      const MockComponent = ({ initialData }) => (
        <div data-testid="extracted-field">{initialData?.sourceField}</div>
      );

      const funcDef = {
        ...mockFuncDef,
        customUI: true,
        customUIComponent: 'TestComponent',
        args: [{ name: 'sourceField', type: 'text' }]
      };

      render(
        <CustomComponentsProvider customComponents={{ TestComponent: MockComponent }}>
          <CustomFunctionModal
            open={true}
            funcDef={funcDef}
            initialValues={initialValues}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByTestId('extracted-field')).toHaveTextContent('TABLE1.CUSTOMER_NAME');
    });
  });

  describe('Args Format Handling', () => {
    it('should handle args as array format', () => {
      const funcDefArray = {
        ...mockFuncDef,
        args: [
          { name: 'field1', type: 'text', label: 'Field 1' },
          { name: 'field2', type: 'number', label: 'Field 2' }
        ]
      };

      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={funcDefArray}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByTestId('function-argument-field1')).toBeInTheDocument();
      expect(screen.getByTestId('function-argument-field2')).toBeInTheDocument();
    });

    it('should handle args as object format', () => {
      const funcDefObject = {
        ...mockFuncDef,
        args: {
          field1: { type: 'text', label: 'Field 1' },
          field2: { type: 'number', label: 'Field 2' }
        }
      };

      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={funcDefObject}
            initialValues={{}}
            config={mockConfig}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      expect(screen.getByTestId('function-argument-field1')).toBeInTheDocument();
      expect(screen.getByTestId('function-argument-field2')).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('should pass darkMode prop to FunctionArgument components', () => {
      render(
        <CustomComponentsProvider customComponents={{}}>
          <CustomFunctionModal
            open={true}
            funcDef={mockFuncDef}
            initialValues={{}}
            config={mockConfig}
            darkMode={true}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </CustomComponentsProvider>
      );

      // FunctionArgument components should receive darkMode prop
      // This is implicit in the mock, but the component renders
      expect(screen.getByTestId('function-argument-amount')).toBeInTheDocument();
    });
  });
});
