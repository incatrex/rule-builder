import React, { useState, useEffect } from 'react';
import { Card, Select, Space, Typography, Input, Button, Collapse } from 'antd';
import { CloseOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import ExpressionGroup, { createExpressionGroup } from './ExpressionGroup';

const { Text } = Typography;
const { Panel } = Collapse;

/**
 * Condition Component
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
 * - config: Config with operators, fields, funcs
 * - darkMode: Dark mode styling
 * - onRemove: Callback to remove this condition
 */
const Condition = ({ value, onChange, config, darkMode = false, onRemove, isLoadedRule = false }) => {
  const [conditionData, setConditionData] = useState(value || {
    returnType: 'boolean',
    name: 'New Condition',
    left: createExpressionGroup('number', null),
    operator: null,
    right: createExpressionGroup('number', '')
  });
  const [editingName, setEditingName] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isLoadedRule); // UI state only - start collapsed for loaded rules

  // Update expansion state when isLoadedRule changes
  useEffect(() => {
    if (isLoadedRule) {
      setIsExpanded(false); // Collapse when rule is loaded
    }
  }, [isLoadedRule]);

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
    if (!config?.operators) return [];
    
    const leftType = conditionData.left?.returnType;
    if (!leftType) {
      // If no left type, return all operators
      return Object.keys(config.operators).map(opKey => ({
        value: opKey,
        label: config.operators[opKey].label || opKey
      }));
    }

    // Check if config has types mapping (from backend config)
    if (config.types && config.types[leftType] && config.types[leftType].widgets) {
      const widgets = config.types[leftType].widgets;
      const availableOps = new Set();
      
      // Collect operators from all widgets for this type
      Object.values(widgets).forEach(widget => {
        if (widget.operators) {
          widget.operators.forEach(op => availableOps.add(op));
        }
      });
      
      return Array.from(availableOps)
        .filter(opKey => config.operators[opKey]) // Make sure operator exists
        .map(opKey => ({
          value: opKey,
          label: config.operators[opKey].label || opKey
        }));
    }

    // Fallback: return all operators if no type mapping
    return Object.keys(config.operators).map(opKey => ({
      value: opKey,
      label: config.operators[opKey].label || opKey
    }));
  };

  // Get operator definition
  const getOperatorDef = (operatorKey) => {
    if (!operatorKey || !config?.operators) return null;
    return config.operators[operatorKey];
  };

  // Handle operator change and adjust right side based on cardinality
  const handleOperatorChange = (operatorKey) => {
    const operatorDef = getOperatorDef(operatorKey);
    
    console.log('🔄 handleOperatorChange:', {
      operatorKey,
      operatorDef,
      leftReturnType: conditionData.left?.returnType
    });
    
    // Support both fixed and dynamic cardinality
    let cardinality;
    if (operatorDef?.defaultCardinality !== undefined) {
      // Dynamic cardinality (e.g., IN operator)
      cardinality = operatorDef.defaultCardinality;
    } else {
      // Fixed cardinality (e.g., between, equal, etc.)
      cardinality = operatorDef?.cardinality !== undefined ? operatorDef.cardinality : 1;
    }
    
    console.log('📊 Cardinality calculated:', cardinality);
    
    let newRight;
    if (cardinality === 0) {
      // No right side value needed
      newRight = null;
    } else if (cardinality === 1) {
      // Single right side value - must be ExpressionGroup
      newRight = createExpressionGroup(
        conditionData.left?.returnType || 'text',
        ''
      );
    } else {
      // Multiple right side values (array of ExpressionGroups)
      newRight = Array(cardinality).fill(null).map(() => 
        createExpressionGroup(
          conditionData.left?.returnType || 'text',
          ''
        )
      );
    }
    
    console.log('📦 New right side created:', newRight);
    
    handleChange({ operator: operatorKey, right: newRight });
  };

  // Handle adding a value for dynamic cardinality operators
  const handleAddValue = () => {
    const operatorDef = getOperatorDef(conditionData.operator);
    const maxCard = operatorDef?.maxCardinality;
    
    if (maxCard && Array.isArray(conditionData.right) && conditionData.right.length < maxCard) {
      const newRight = [
        ...conditionData.right,
        createExpressionGroup(conditionData.left?.returnType || 'text', '')
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
    console.log('⬅️ handleLeftChange called:', {
      newLeft,
      oldLeft: conditionData.left,
      operator: conditionData.operator,
      currentRight: conditionData.right
    });
    
    // When left side changes type, update right side to match if operator exists
    const operatorDef = getOperatorDef(conditionData.operator);
    
    console.log('📋 Operator definition:', operatorDef);
    
    // Support both fixed and dynamic cardinality
    let cardinality;
    if (operatorDef?.defaultCardinality !== undefined) {
      // Dynamic cardinality - check actual array length
      cardinality = Array.isArray(conditionData.right) ? conditionData.right.length : operatorDef.defaultCardinality;
    } else {
      cardinality = operatorDef?.cardinality !== undefined ? operatorDef.cardinality : 1;
    }
    
    console.log('📊 Cardinality for returnType propagation:', cardinality);
    
    let newRight = conditionData.right;
    if (cardinality === 1 && newRight && newRight.returnType !== newLeft.returnType) {
      console.log('🔄 Updating single right returnType:', newLeft.returnType);
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
      console.log('🔄 Updating array right returnTypes:', newLeft.returnType);
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
    
    console.log('✅ Final right side:', newRight);
    
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
      activeKey={isExpanded ? ['condition'] : []}
      onChange={(keys) => setIsExpanded(keys.includes('condition'))}
      style={{
        background: darkMode ? '#2a2a2a' : '#fafafa',
        borderLeft: '3px solid #1890ff',
        marginBottom: '8px'
      }}
    >
      <Panel
        key="condition"
        header={
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
                  <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>
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
        }
      >
      <Space direction="horizontal" size="middle" wrap style={{ width: '100%' }}>
        {/* Left Expression */}
        <div style={{ minWidth: '300px', flex: 1 }}>
          <ExpressionGroup
            value={conditionData.left}
            onChange={handleLeftChange}
            config={config}
            darkMode={darkMode}
            isLoadedRule={isLoadedRule}
          />
        </div>

        {/* Operator */}
        <Select
          value={conditionData.operator}
          onChange={handleOperatorChange}
          placeholder="Select operator"
          style={{ width: 140 }}
          popupClassName={darkMode ? 'dark-mode-dropdown' : ''}
          getPopupContainer={(trigger) => trigger.parentNode}
          size="small"
          options={availableOperators}
          dropdownStyle={darkMode ? {
            backgroundColor: '#2d2d2d'
          } : {}}
        />

        {/* Right Expression(s) */}
        {cardinality === 1 && (
          <div style={{ minWidth: '300px', flex: 1 }}>
            <ExpressionGroup
              value={conditionData.right}
              onChange={(newRight) => handleChange({ right: newRight })}
              config={config}
              expectedType={conditionData.left?.returnType}
              darkMode={darkMode}
              isLoadedRule={isLoadedRule}
            />
          </div>
        )}

        {/* Multiple Right Expressions for cardinality > 1 (e.g., between, IN) */}
        {cardinality > 1 && Array.isArray(conditionData.right) && (
          <>
            {conditionData.right.map((rightVal, index) => {
              console.log(`📝 Rendering right value [${index}]:`, {
                rightVal,
                leftReturnType: conditionData.left?.returnType,
                expectedType: conditionData.left?.returnType
              });
              
              return (
              <React.Fragment key={index}>
                {index > 0 && (
                  <Text strong style={{ color: '#1890ff', margin: '0 8px' }}>
                    {operatorDef?.separator || 'AND'}
                  </Text>
                )}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', minWidth: '300px', flex: 1 }}>
                  <ExpressionGroup
                    value={rightVal}
                    onChange={(newVal) => {
                      const updatedRight = [...conditionData.right];
                      updatedRight[index] = newVal;
                      handleChange({ right: updatedRight });
                    }}
                    config={config}
                    expectedType={conditionData.left?.returnType}
                    darkMode={darkMode}
                    isLoadedRule={isLoadedRule}
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
      </Panel>
    </Collapse>
  );
};

export default Condition;
