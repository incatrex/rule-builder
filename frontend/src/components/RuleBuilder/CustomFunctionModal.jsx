import React, { useState, useEffect } from 'react';
import { Modal, Space } from 'antd';
import FunctionArgument from './FunctionArgument';

/**
 * CustomFunctionModal Component
 * 
 * Modal dialog for functions that require custom UI (customUI: true).
 * Displays function arguments in a form-like interface and returns
 * the argument values when saved.
 * 
 * Props:
 * - open: Whether the modal is visible
 * - funcDef: Function definition with args array
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
  // Initialize argument values from initialValues or empty expressions
  const [argValues, setArgValues] = useState({});

  // Reset values when modal opens or funcDef changes
  useEffect(() => {
    if (open && funcDef) {
      const initialArgValues = {};
      (funcDef.args || []).forEach(argDef => {
        initialArgValues[argDef.name] = initialValues[argDef.name] || {
          type: 'value',
          returnType: argDef.type,
          value: ''
        };
      });
      setArgValues(initialArgValues);
    }
  }, [open, funcDef, initialValues]);

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

  // Mock functions for FunctionArgument component
  const mockIsExpanded = () => false;
  const mockOnToggleExpansion = () => {};

  return (
    <Modal
      title={funcDef?.label || funcDef?.name}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {(funcDef?.args || []).map((argDef, index) => {
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
        })}
      </Space>
    </Modal>
  );
};

export default CustomFunctionModal;
