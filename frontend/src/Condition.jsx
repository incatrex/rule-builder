import React from 'react';
import { Card, Space, Select, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import ExpressionBuilder from './ExpressionBuilder';

/**
 * Condition Component - Represents a single rule in a condition group
 * 
 * Structure: [Left Expression] [Operator] [Right Expression] [Remove Button]
 * 
 * @param {Object} value - Condition data: { type: 'rule', id, left, operator, right }
 * @param {Function} onChange - Callback when condition changes
 * @param {Function} onRemove - Callback to remove this condition
 * @param {Object} config - RAQB config with operators, fields, and funcs
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
const Condition = ({ value, onChange, onRemove, config, darkMode = false }) => {
  
  // Get the current operator definition
  const operatorDef = config?.operators?.[value.operator];
  const operatorCardinality = operatorDef?.cardinality ?? 1;
  
  // Determine available operators (could filter by type in the future)
  const availableOperators = config?.operators ? Object.keys(config.operators) : [];
  
  const handleOperatorChange = (newOperator) => {
    const newOpDef = config.operators[newOperator];
    const newValue = { ...value, operator: newOperator };
    
    // If cardinality is 0 (like "is_empty"), remove right side
    if (newOpDef?.cardinality === 0) {
      delete newValue.right;
    } else if (!value.right) {
      // If switching to operator that needs right side, initialize it
      newValue.right = { 
        type: 'value', 
        valueType: 'text', 
        value: '' 
      };
    }
    
    onChange(newValue);
  };
  
  return (
    <Card 
      size="small" 
      style={{ 
        background: darkMode ? '#2a2a2a' : '#fafafa',
        borderLeft: '3px solid #1890ff'
      }}
    >
      <Space direction="horizontal" size="middle" wrap style={{ width: '100%' }}>
        {/* Left Expression */}
        <div style={{ minWidth: '200px' }}>
          <ExpressionBuilder
            value={value.left || { type: 'value', valueType: 'text', value: '' }}
            onChange={(left) => onChange({ ...value, left })}
            config={config}
            darkMode={darkMode}
          />
        </div>
        
        {/* Operator Selector */}
        <Select
          value={value.operator}
          onChange={handleOperatorChange}
          style={{ width: 140 }}
          size="small"
        >
          {availableOperators.map(opKey => {
            const op = config.operators[opKey];
            return (
              <Select.Option key={opKey} value={opKey}>
                {op.label || opKey}
              </Select.Option>
            );
          })}
        </Select>
        
        {/* Right Expression (only if operator cardinality > 0) */}
        {operatorCardinality > 0 && (
          <div style={{ minWidth: '200px' }}>
            <ExpressionBuilder
              value={value.right || { type: 'value', valueType: 'text', value: '' }}
              onChange={(right) => onChange({ ...value, right })}
              config={config}
              darkMode={darkMode}
            />
          </div>
        )}
        
        {/* Remove Button */}
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />}
          onClick={onRemove}
          title="Remove condition"
        />
      </Space>
    </Card>
  );
};

export default Condition;
