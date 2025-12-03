import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Space, Alert } from 'antd';
import FunctionArgument from './FunctionArgument';
import { useCustomComponents } from '../../contexts/CustomComponentsContext';

/**
 * CustomFunctionModal Component
 * 
 * Modal dialog for functions that require custom UI (customUI: true).
 * Supports two modes:
 * 1. Custom component mode: Renders a custom component specified by customUIComponent
 * 2. Default mode: Displays function arguments using FunctionArgument components
 * 
 * Props:
 * - open: Whether the modal is visible
 * - funcDef: Function definition with args array and customUIComponent
 * - initialValues: Initial argument values object { argName: expressionValue }
 * - config: Config object with fields and functions
 * - darkMode: Dark mode styling
 * - onSave: Callback with argument values object when OK clicked
 * - onCancel: Callback when Cancel or close clicked
 */
const CustomFunctionModal = ({
  open,
  funcDef,
  initialValues = {},
  config,
  darkMode = false,
  onSave,
  onCancel
}) => {
  // Get custom components from context
  const customComponents = useCustomComponents();
  
  // Initialize argument values from initialValues or empty expressions
  const [argValues, setArgValues] = useState({});

  // Reset values when modal opens or funcDef changes
  useEffect(() => {
    if (open && funcDef) {
      const initialArgValues = {};
      
      // Handle both array and object formats for args
      const argsArray = Array.isArray(funcDef.args) 
        ? funcDef.args 
        : Object.keys(funcDef.args || {}).map(key => ({ name: key, ...funcDef.args[key] }));
      
      argsArray.forEach(argDef => {
        initialArgValues[argDef.name] = initialValues[argDef.name] || {
          type: 'value',
          returnType: argDef.type,
          value: ''
        };
      });
      setArgValues(initialArgValues);
    }
  }, [open, funcDef, initialValues]);

  // Memoize extracted simple data to prevent unnecessary re-renders
  // Only depends on initialValues since custom components manage their own state
  const simpleData = useMemo(() => {
    const data = {};
    
    console.log('[CustomFunctionModal] extractSimpleData - initialValues:', initialValues);
    
    Object.keys(initialValues).forEach(argName => {
      const expressionValue = initialValues[argName];
      // Extract the actual value from expression structure
      if (expressionValue?.type === 'value') {
        data[argName] = expressionValue.value;
      } else if (expressionValue?.type === 'field') {
        data[argName] = expressionValue.field;
      } else {
        data[argName] = expressionValue;
      }
    });
    
    console.log('[CustomFunctionModal] extractSimpleData - result:', data);
    return data;
  }, [initialValues]);

  // Convert simple data back to expression values
  const convertToExpressionValues = (simpleData) => {
    const expressionValues = {};
    
    // Handle both array and object formats for args
    const argsArray = Array.isArray(funcDef.args) 
      ? funcDef.args 
      : Object.keys(funcDef.args || {}).map(key => ({ name: key, ...funcDef.args[key] }));
    
    argsArray.forEach(argDef => {
      const value = simpleData[argDef.name];
      expressionValues[argDef.name] = {
        type: 'value',
        returnType: argDef.type,
        value: value ?? ''
      };
    });
    return expressionValues;
  };

  const handleOk = () => {
    onSave(argValues);
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleArgumentChange = (argName, newValue) => {
    setArgValues(prev => ({
      ...prev,
      [argName]: newValue
    }));
  };

  // Handle save from custom component
  const handleCustomComponentSave = (simpleData) => {
    const expressionValues = convertToExpressionValues(simpleData);
    onSave(expressionValues);
  };

  // Mock functions for FunctionArgument component
  const mockIsExpanded = () => false;
  const mockOnToggleExpansion = () => {};

  // Check if custom component should be used
  const customComponentName = funcDef?.customUIComponent;
  const CustomComponent = customComponentName ? customComponents[customComponentName] : null;
  const useCustomComponent = CustomComponent !== null && CustomComponent !== undefined;

  // Render custom component mode (no OK/Cancel buttons, component handles it)
  if (useCustomComponent) {
    return (
      <Modal
        title={funcDef?.label || funcDef?.name}
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnClose
        data-testid="custom-function-modal"
      >
        <CustomComponent
          initialData={simpleData}
          onSave={handleCustomComponentSave}
          onCancel={handleCancel}
        />
      </Modal>
    );
  }

  // Render default mode with FunctionArgument components
  return (
    <Modal
      title={funcDef?.label || funcDef?.name}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
      destroyOnClose
      data-testid="custom-function-modal"
    >
      {customComponentName && !CustomComponent && (
        <Alert
          message="Custom component not found"
          description={`The custom component "${customComponentName}" is not registered. Using default argument editor instead.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {(() => {
          // Handle both array and object formats for args
          const argsArray = Array.isArray(funcDef?.args) 
            ? funcDef.args 
            : Object.keys(funcDef?.args || {}).map(key => ({ name: key, ...funcDef.args[key] }));
          
          return argsArray.map((argDef, index) => {
            const arg = {
              name: argDef.name,
              value: argValues[argDef.name] || {
                type: 'value',
                returnType: argDef.type,
                value: ''
              }
            };

            return (
              <FunctionArgument
                key={argDef.name}
                arg={arg}
                argDef={argDef}
                index={index}
                onChange={(newValue) => handleArgumentChange(argDef.name, newValue)}
                config={config}
                darkMode={darkMode}
                expansionPath={`modal-${funcDef.name}-arg`}
                isExpanded={mockIsExpanded}
                onToggleExpansion={mockOnToggleExpansion}
                isNew={false}
              />
            );
          });
        })()}
      </Space>
    </Modal>
  );
};

export default CustomFunctionModal;
