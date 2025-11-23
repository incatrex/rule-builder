import React, { useState, useEffect } from 'react';
import { Card, Select, Space, Typography, Input, Button, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import Expression, { createDirectExpression } from "./Expression";

const { Option } = Select;
const { Text } = Typography;

/**
 * SingleCondition Component
 * 
 * Represents a single condition with left expression, operator, and right expression.
 * Follows structure: <condition returnType="boolean">
 *   <left>:<expression>
 *   <operator>
 *   <right>:<expression>
 * 
 * Props:
 * - value: Condition object { name, left, operator, right }
 * - onChange: Callback when condition changes
 * - config: Config with operators, fields, functions
 * - darkMode: Dark mode styling
 * - onRemove: Callback to remove this condition
 * - expansionPath: Path identifier for expansion state
 * - isExpanded: Function (path) => boolean to check expansion state
 * - onToggleExpansion: Function (path) => void to toggle expansion
 * - isNew: Boolean indicating if this is a newly created condition (auto-expand) or loaded (selective expand)
 */
const SingleCondition = ({ 
  value, 
  onChange, 
  config, 
  darkMode = false, 
  onRemove,
  expansionPath = 'singleCondition',
  isExpanded: isExpandedFn = () => true,
  onToggleExpansion = () => {},
  isNew = true
}) => {
  const [conditionData, setConditionData] = useState(value || {
    returnType: 'boolean',
    name: 'New Condition',
    left: createDirectExpression('field', 'number', 'TABLE1.NUMBER_FIELD_01'),
    operator: config?.types?.number?.defaultConditionOperator || 'equal',
    right: createDirectExpression('value', 'number', 0)
  });
  const [editingName, setEditingName] = useState(false);
  
  // Use centralized expansion state
  const expanded = isExpandedFn(expansionPath);

  useEffect(() => {
    if (value) {
      setConditionData(value);
    }
  }, [value]);

  const handleChange = (updates) => {
    const updated = { ...conditionData, ...updates };
    setConditionData(updated);
    onChange(updated);
  };

  // Get available operators based on left expression return type
  const getAvailableOperators = () => {
    if (!config?.conditionOperators) return [];
    
    const leftType = conditionData.left?.returnType;
    if (!leftType) {
      // If no left type, return all operators
      return Object.keys(config.conditionOperators).map(opKey => ({
        value: opKey,
        label: config.conditionOperators[opKey].label || opKey
      }));
    }

    // Check if config has types mapping with validConditionOperators
    if (config.types && config.types[leftType] && config.types[leftType].validConditionOperators) {
      const validOps = config.types[leftType].validConditionOperators;
      
      return validOps
        .filter(opKey => config.conditionOperators[opKey]) // Make sure operator exists
        .map(opKey => ({
          value: opKey,
          label: config.conditionOperators[opKey].label || opKey
        }));
    }

    // Fallback: return all operators if no type mapping
    return Object.keys(config.conditionOperators).map(opKey => ({
      value: opKey,
      label: config.conditionOperators[opKey].label || opKey
    }));
  };

  // Get operator definition
  const getOperatorDef = (operatorKey) => {
    if (!operatorKey || !config?.conditionOperators) return null;
    return config.conditionOperators[operatorKey];
  };

  // Handle operator change and adjust right side based on cardinality
  const handleOperatorChange = (operatorKey) => {
    const operatorDef = getOperatorDef(operatorKey);
    
    // Support both fixed and dynamic cardinality
    let cardinality;
    if (operatorDef?.defaultCardinality !== undefined) {
      // Dynamic cardinality (e.g., IN operator)
      cardinality = operatorDef.defaultCardinality;
    } else {
      // Fixed cardinality (e.g., between, equal, etc.)
      cardinality = operatorDef?.cardinality !== undefined ? operatorDef.cardinality : 1;
    }
    
    let newRight;
    if (cardinality === 0) {
      // No right side value needed
      newRight = null;
    } else if (cardinality === 1) {
      // Single right side value - direct expression (schema-compliant)
      newRight = createDirectExpression(
        'value',
        conditionData.left?.returnType || 'text',
        ''
      );
    } else {
      // Multiple right side values (array of direct expressions)
      newRight = Array(cardinality).fill(null).map(() => 
        createDirectExpression(
          'value',
          conditionData.left?.returnType || 'text',
          ''
        )
      );
    }
    
    handleChange({ operator: operatorKey, right: newRight });
  };

  // Handle adding a value for dynamic cardinality operators
  const handleAddValue = () => {
    const operatorDef = getOperatorDef(conditionData.operator);
    const maxCard = operatorDef?.maxCardinality;
    
    if (maxCard && Array.isArray(conditionData.right) && conditionData.right.length < maxCard) {
      const newRight = [
        ...conditionData.right,
        createDirectExpression('value', conditionData.left?.returnType || 'text', '')
      ];
      handleChange({ right: newRight });
    }
  };

  // Handle removing a value for dynamic cardinality operators
  const handleRemoveValue = (index) => {
    const operatorDef = getOperatorDef(conditionData.operator);
    const minCard = operatorDef?.minCardinality || 1;
    
    if (Array.isArray(conditionData.right) && conditionData.right.length > minCard) {
      const newRight = conditionData.right.filter((_, i) => i !== index);
      handleChange({ right: newRight });
    }
  };

  // Handle left expression change
  const handleLeftChange = (newLeft) => {
    // When left side changes type, update right side to match if operator exists
    const operatorDef = getOperatorDef(conditionData.operator);
    
    
    // Support both fixed and dynamic cardinality
    let cardinality;
    if (operatorDef?.defaultCardinality !== undefined) {
      // Dynamic cardinality - check actual array length
      cardinality = Array.isArray(conditionData.right) ? conditionData.right.length : operatorDef.defaultCardinality;
    } else {
      cardinality = operatorDef?.cardinality !== undefined ? operatorDef.cardinality : 1;
    }
    
    
    let newRight = conditionData.right;
    if (cardinality === 1 && newRight && newRight.returnType !== newLeft.returnType) {
      // Update returnType deeply in ExpressionGroup
      newRight = { 
        ...newRight, 
        returnType: newLeft.returnType,
        expressions: newRight.expressions?.map(expr => ({
          ...expr,
          returnType: newLeft.returnType
        })) || newRight.expressions
      };
    } else if (cardinality > 1 && Array.isArray(newRight)) {
      // Update returnType deeply in each ExpressionGroup in the array
      newRight = newRight.map(r => ({ 
        ...r, 
        returnType: newLeft.returnType,
        expressions: r.expressions?.map(expr => ({
          ...expr,
          returnType: newLeft.returnType
        })) || r.expressions
      }));
    }
    
    
    handleChange({ left: newLeft, right: newRight });
  };

  const availableOperators = getAvailableOperators();
  const operatorDef = getOperatorDef(conditionData.operator);
  
  // Calculate cardinality - support both fixed and dynamic
  const cardinality = operatorDef?.defaultCardinality !== undefined 
    ? (Array.isArray(conditionData.right) ? conditionData.right.length : operatorDef.defaultCardinality)
    : (operatorDef?.cardinality !== undefined ? operatorDef.cardinality : 1);
  
  // Check if operator supports dynamic cardinality
  const isDynamicCardinality = operatorDef?.minCardinality !== undefined || operatorDef?.maxCardinality !== undefined;
  const canAddValue = isDynamicCardinality && Array.isArray(conditionData.right) && conditionData.right.length < (operatorDef?.maxCardinality || 999);
  const canRemoveValue = isDynamicCardinality && Array.isArray(conditionData.right) && conditionData.right.length > (operatorDef?.minCardinality || 1);

  return (
    <Collapse
      activeKey={expanded ? ['condition'] : []}
      onChange={() => onToggleExpansion(expansionPath)}
      style={{
        background: darkMode ? '#2a2a2a' : '#fafafa',
        borderLeft: '3px solid #1890ff',
        marginBottom: '8px'
      }}
      items={[{
        key: 'condition',
        label: (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size="small">
              {editingName ? (
                <Input
                  size="small"
                  value={conditionData.name || ''}
                  onChange={(e) => handleChange({ name: e.target.value })}
                  onPressEnter={() => setEditingName(false)}
                  onBlur={() => setEditingName(false)}
                  autoFocus
                  style={{ 
                    width: '200px',
                    fontWeight: 'bold'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <Text code style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>
                    {conditionData.name || 'Unnamed Condition'}
                  </Text>
                  <EditOutlined 
                    style={{ fontSize: '12px', cursor: 'pointer', color: darkMode ? '#b0b0b0' : '#8c8c8c' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingName(true);
                    }}
                  />
                </>
              )}
            </Space>
            {onRemove && (
              <Button
                type="text"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                title="Remove condition"
              />
            )}
          </Space>
        ),
        children: (
      <Space direction="horizontal" size="middle" wrap style={{ width: '100%' }}>
        {/* Left Expression */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Expression
            value={conditionData.left}
            onChange={handleLeftChange}
            config={config}
            darkMode={darkMode}
            compact={true}
            expansionPath={`${expansionPath}-left`}
            isExpanded={isExpandedFn}
            onToggleExpansion={onToggleExpansion}
            isNew={isNew}
          />
        </div>

        {/* Operator */}
        {console.log('[SingleCondition] Rendering operator wrapper, darkMode:', darkMode)}
        <Select
          value={conditionData.operator}
          onChange={handleOperatorChange}
          placeholder="Select operator"
          className={`operator-select ${darkMode ? 'operator-select-dark' : ''}`}
          style={{ 
            minWidth: '60px'
          }}
          popupClassName={darkMode ? 'dark-mode-dropdown' : ''}
          getPopupContainer={(trigger) => trigger.parentNode}
          size="small"
          options={availableOperators}
          dropdownStyle={darkMode ? {
            backgroundColor: '#2d2d2d'
          } : {}}
          dropdownMatchSelectWidth={false}
        />

        {/* Right Expression(s) */}
        {cardinality === 1 && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <Expression
              value={conditionData.right}
              onChange={(newRight) => handleChange({ right: newRight })}
              config={config}
              expectedType={conditionData.left?.returnType}
              darkMode={darkMode}
              compact={true}
              expansionPath={`${expansionPath}-right`}
              isExpanded={isExpandedFn}
              onToggleExpansion={onToggleExpansion}
              isNew={isNew}
            />
          </div>
        )}

        {/* Multiple Right Expressions for cardinality > 1 (e.g., between, IN) */}
        {cardinality > 1 && Array.isArray(conditionData.right) && (
          <>
            {conditionData.right.map((rightVal, index) => {
              return (
              <React.Fragment key={index}>
                {index > 0 && (
                  <Text strong style={{ color: '#1890ff', margin: '0 8px' }}>
                    {operatorDef?.separator || 'AND'}
                  </Text>
                )}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <Expression
                    value={rightVal}
                    onChange={(newVal) => {
                      const updatedRight = [...conditionData.right];
                      updatedRight[index] = newVal;
                      handleChange({ right: updatedRight });
                    }}
                    config={config}
                    expectedType={conditionData.left?.returnType}
                    darkMode={darkMode}
                    compact={true}
                    expansionPath={`${expansionPath}-right-${index}`}
                    isExpanded={isExpandedFn}
                    onToggleExpansion={onToggleExpansion}
                    isNew={isNew}
                  />
                  {canRemoveValue && (
                    <Button 
                      size="small" 
                      icon={<CloseOutlined />} 
                      onClick={() => handleRemoveValue(index)}
                      danger
                      type="text"
                      title="Remove value"
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </div>
              </React.Fragment>
              );
            })}
            {canAddValue && (
              <Button 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={handleAddValue}
                type="dashed"
                style={{ flexShrink: 0 }}
              >
                Add Value
              </Button>
            )}
          </>
        )}
      </Space>
        )
      }]}
    />
  );
};

export default SingleCondition;
