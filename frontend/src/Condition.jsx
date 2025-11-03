import React from 'react';
import { Card, Space, Select, Button, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import ExpressionBuilder from './ExpressionBuilder';

const { Text } = Typography;

/**
 * Condition Component - Represents a single rule in a condition group
 * 
 * Structure: [Left Expression] [Operator] [Right Expression(s)] [Remove Button]
 * 
 * @param {Object} value - Condition data: { type: 'rule', id, left, operator, right }
 *                         For cardinality > 1, right is an array of expressions
 * @param {Function} onChange - Callback when condition changes
 * @param {Function} onRemove - Callback to remove this condition
 * @param {Object} config - Config object with operators, fields, and funcs
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
    const newCardinality = newOpDef?.cardinality ?? 1;
    const newValue = { ...value, operator: newOperator };
    
    // If cardinality is 0 (like "is_empty"), remove right side
    if (newCardinality === 0) {
      delete newValue.right;
    } else if (newCardinality === 1) {
      // Single value - ensure right is not an array
      if (!value.right || Array.isArray(value.right)) {
        newValue.right = { 
          type: 'value', 
          valueType: 'text', 
          value: '' 
        };
      }
    } else if (newCardinality > 1) {
      // Multiple values - ensure right is an array with correct length
      if (!Array.isArray(value.right)) {
        newValue.right = Array(newCardinality).fill(null).map(() => ({ 
          type: 'value', 
          valueType: 'text', 
          value: '' 
        }));
      } else if (value.right.length !== newCardinality) {
        // Adjust array length
        const adjusted = [...value.right];
        while (adjusted.length < newCardinality) {
          adjusted.push({ type: 'value', valueType: 'text', value: '' });
        }
        newValue.right = adjusted.slice(0, newCardinality);
      }
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
        
        {/* Right Expression(s) - handle cardinality > 0 */}
        {operatorCardinality === 1 && (
          <div style={{ minWidth: '200px' }}>
            <ExpressionBuilder
              value={value.right || { type: 'value', valueType: 'text', value: '' }}
              onChange={(right) => onChange({ ...value, right })}
              config={config}
              darkMode={darkMode}
            />
          </div>
        )}
        
        {/* Multiple Right Expressions for cardinality > 1 (e.g., between) */}
        {operatorCardinality > 1 && (
          <>
            {Array.isArray(value.right) && value.right.map((rightValue, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Text strong style={{ color: '#1890ff' }}>AND</Text>}
                <div style={{ minWidth: '200px' }}>
                  <ExpressionBuilder
                    value={rightValue || { type: 'value', valueType: 'text', value: '' }}
                    onChange={(newRightValue) => {
                      const newRight = [...value.right];
                      newRight[index] = newRightValue;
                      onChange({ ...value, right: newRight });
                    }}
                    config={config}
                    darkMode={darkMode}
                  />
                </div>
              </React.Fragment>
            ))}
          </>
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
