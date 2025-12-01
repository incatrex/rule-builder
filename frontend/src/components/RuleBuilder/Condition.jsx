import React, { useState, useEffect } from 'react';
import { Card, Select, Space, Typography, Input, Button, Collapse, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, EditOutlined, CloseOutlined, LinkOutlined, BranchesOutlined } from '@ant-design/icons';
import ConditionGroup from './ConditionGroup';
import Expression, { createDirectExpression } from "./Expression";
import RuleReference from './RuleReference';
import ConditionSourceSelector from './ConditionSourceSelector';
import { useNaming } from './contexts/NamingContext';
import {
  createDefaultCondition,
  createDefaultConditionGroup,
  createDefaultRuleRef
} from './utils/structureFactories';

const { Option } = Select;
const { Text } = Typography;

/**
 * Condition Component - Smart Router
 * 
 * Routes between single condition rendering and ConditionGroup based on type property.
 * This mirrors the Expression component architecture where Expression routes
 * between direct expressions (value/field/function/ruleRef) and ExpressionGroup.
 * 
 * Condition Structure Types:
 * 
 * 1. Single Condition (type: 'condition'):
 * {
 *   "type": "condition",
 *   "returnType": "boolean",
 *   "name": "Condition Name",
 *   "left": <Expression>,
 *   "operator": "equal",
 *   "right": <Expression>
 * }
 * 
 * 2. Condition Group (type: 'conditionGroup'):
 * {
 *   "type": "conditionGroup",
 *   "returnType": "boolean",
 *   "name": "Group Name",
 *   "conjunction": "AND",
 *   "conditions": [<Condition> | <ConditionGroup>, ...]
 * }
 * 
 * Props:
 * - value: Condition object (either single condition or group)
 * - onChange: Callback when condition changes
 * - config: Config with operators, fields, functions
 * - darkMode: Dark mode styling
 * - onRemove: Callback to remove this condition
 * - depth: Nesting depth (for ConditionGroup styling)
 * - isSimpleCondition: Whether this is a simple condition (for ConditionGroup)
 * - hideHeader: Hide Card/Collapse wrapper (used in CASE WHEN clauses)
 * - expansionPath: Unique path identifier for expansion state (e.g., 'condition-0')
 * - isExpanded: Function to check if a path is expanded
 * - onToggleExpansion: Function to toggle expansion state
 * - isNew: Boolean indicating new vs loaded rule (for expansion defaults)
 * - showAddButton: Boolean to show Add Condition button (default: true at depth 0, false otherwise)
 */
const Condition = ({ 
  value, 
  onChange, 
  config, 
  darkMode = false, 
  onRemove, 
  depth = 0, 
  isSimpleCondition = false, 
  hideHeader = false,
  expansionPath = 'condition-0',
  isExpanded,
  onToggleExpansion,
  onSetExpansion,
  isNew = false,
  showAddButton
}) => {
  // Use naming context
  const naming = useNaming();
  // Normalize the value to ensure it's a proper structure
  const normalizeValue = (val) => {
    if (!val) {
      return createDefaultCondition(config, 'New Condition');
    }
    
    // If it's already a valid condition structure, return as-is
    if (val.type && ['condition', 'conditionGroup'].includes(val.type)) {
      return val;
    }
    
    // Otherwise create a default condition
    return createDefaultCondition(config, 'New Condition');
  };

  const initialValue = normalizeValue(value);
  const [conditionData, setConditionData] = useState(initialValue);
  const [editingName, setEditingName] = useState(false);
  
  // Track source type: 'condition', 'conditionGroup', or 'ruleRef'
  const determineSourceType = (data) => {
    if (data.ruleRef) return 'ruleRef';
    if (data.type === 'condition') return 'condition';
    return 'conditionGroup';
  };
  const [sourceType, setSourceType] = useState(determineSourceType(conditionData));
  
  // Use centralized expansion state
  const expanded = isExpanded(expansionPath);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      const normalized = normalizeValue(value);
      setConditionData(normalized);
      setSourceType(determineSourceType(normalized));
    }
  }, [value]);

  // Delegate all ConditionGroups to ConditionGroup component (including single-item groups)
  if (conditionData.type === 'conditionGroup') {
    return (
      <ConditionGroup
        value={conditionData}
        onChange={onChange}
        config={config}
        darkMode={darkMode}
        onRemove={onRemove}
        depth={depth}
        hideHeader={hideHeader}
        expansionPath={expansionPath}
        isExpanded={isExpanded}
        onToggleExpansion={onToggleExpansion}
        onSetExpansion={onSetExpansion}
        isNew={isNew}
      />
    );
  }

  // Single condition rendering
  const handleChange = (updates) => {
    const updated = { ...conditionData, ...updates };
    setConditionData(updated);
    onChange(updated);
  };

  // Handle source type changes (condition, conditionGroup, or ruleRef)
  const handleSourceChange = (newSourceType) => {
    const oldSourceType = sourceType;
    console.log('[Condition.handleSourceChange]', { oldSourceType, newSourceType, currentData: conditionData });
    setSourceType(newSourceType);
    
    if (newSourceType === 'ruleRef') {
      // Switching to ruleRef - preserve name until rule selected
      const newName = naming.updateName(
        conditionData.name,
        oldSourceType === 'conditionGroup' ? 'conditionGroup' : 'condition',
        'ruleRef',
        expansionPath,
        null // No rule ID yet
      );
      
      const newData = createDefaultRuleRef(newName);
      console.log('[Condition.handleSourceChange] Created ruleRef:', newData);
      setConditionData(newData);
      onChange(newData);
    } else if (newSourceType === 'condition') {
      // Switching to single condition
      if (conditionData.type === 'conditionGroup' && conditionData.conditions?.length > 0) {
        // If coming from a group, extract the first condition
        const firstCondition = conditionData.conditions[0];
        
        // Update name appropriately
        const newName = naming.updateName(
          conditionData.name,
          'conditionGroup',
          'condition',
          expansionPath
        );
        
        const updated = {
          ...firstCondition,
          name: newName
        };
        setConditionData(updated);
        onChange(updated);
      } else {
        // Otherwise create a new empty condition
        const { ruleRef, conjunction, conditions, ...rest } = conditionData;
        
        const newName = naming.updateName(
          conditionData.name,
          oldSourceType,
          'condition',
          expansionPath
        );
        
        const newData = createDefaultCondition(config, newName);
        setConditionData(newData);
        onChange(newData);
      }
    } else {
      // Switching to conditionGroup - wrap existing content + add new condition
      // Update group name
      console.log('[Condition] Converting to conditionGroup:', {
        currentName: conditionData.name,
        oldSourceType,
        expansionPath
      });
      
      const groupName = naming.updateName(
        conditionData.name,
        oldSourceType,
        'conditionGroup',
        expansionPath
      );
      
      // Extract the number from the original position to use for child naming
      // Use naming context to determine the proper parent number based on path
      // E.g., if this is "Condition 1" (at depth 2), children should be "1.1", "1.2"
      // E.g., if this is root "Condition" (at depth 1), children should be "1", "2"
      const child1Name = naming.getNameForNew('condition', expansionPath, []);
      const child2Name = naming.getNameForNew('condition', expansionPath, [{ name: child1Name }]);
      
      // Keep the existing condition with proper name
      const wrappedExistingCondition = {
        ...conditionData,
        name: child1Name
      };
      
      // Create new condition with proper name
      const newCondition = createDefaultCondition(config, child2Name);
      
      // Create group
      const newData = createDefaultConditionGroup(
        config,
        groupName,
        [wrappedExistingCondition, newCondition]
      );
      
      console.log('[Condition] Created new group data:', newData);
      
      setConditionData(newData);
      onChange(newData);
      
      // Auto-expand both conditions in the new group
      if (onSetExpansion) {
        onSetExpansion(`${expansionPath}-condition-0`, true);
        onSetExpansion(`${expansionPath}-condition-1`, true);
      }
    }
    
    // Ensure the item stays expanded after source change
    if (onSetExpansion) {
      onSetExpansion(expansionPath, true);
    }
  };

  // Handle rule reference changes
  const handleRuleRefChange = (newRuleRef) => {
    // Update name to rule ID when rule is selected, or revert when cleared
    let newName = conditionData.name;
    if (newRuleRef && newRuleRef.id) {
      // Rule selected - use rule ID as name
      newName = naming.updateName(
        conditionData.name,
        'ruleRef',
        'ruleRef',
        expansionPath,
        newRuleRef.id
      );
    } else if (!newRuleRef || !newRuleRef.id) {
      // Rule cleared - revert to auto-generated name
      newName = naming.updateName(
        conditionData.name,
        'ruleRef',
        'ruleRef',
        expansionPath,
        null
      );
    }
    
    const updated = {
      ...conditionData,
      name: newName,
      ruleRef: { ...newRuleRef, returnType: 'boolean' }
    };
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
    const oldOperatorDef = getOperatorDef(conditionData.operator);
    
    // Calculate new cardinality
    let newCardinality;
    if (operatorDef?.defaultCardinality !== undefined) {
      // Dynamic cardinality (e.g., IN operator)
      newCardinality = operatorDef.defaultCardinality;
    } else {
      // Fixed cardinality (e.g., between, equal, etc.)
      newCardinality = operatorDef?.cardinality !== undefined ? operatorDef.cardinality : 1;
    }
    
    // Calculate old cardinality
    let oldCardinality;
    if (oldOperatorDef?.defaultCardinality !== undefined) {
      oldCardinality = Array.isArray(conditionData.right) ? conditionData.right.length : oldOperatorDef.defaultCardinality;
    } else {
      oldCardinality = oldOperatorDef?.cardinality !== undefined ? oldOperatorDef.cardinality : 1;
    }
    
    let newRight;
    if (newCardinality === 0) {
      // No right side value needed
      newRight = null;
    } else if (newCardinality === 1 && oldCardinality === 1) {
      // Same cardinality - preserve existing value
      newRight = conditionData.right;
    } else if (newCardinality === 1) {
      // Changed to single value - try to preserve first value if coming from array
      if (Array.isArray(conditionData.right) && conditionData.right.length > 0) {
        newRight = conditionData.right[0];
      } else {
        newRight = createDirectExpression(
          'value',
          conditionData.left?.returnType || 'text',
          ''
        );
      }
    } else {
      // Multiple right side values (array of direct expressions)
      if (Array.isArray(conditionData.right) && conditionData.right.length > 0) {
        // Preserve existing values and pad/trim as needed
        if (conditionData.right.length === newCardinality) {
          newRight = conditionData.right;
        } else if (conditionData.right.length < newCardinality) {
          // Need more values - add new ones
          newRight = [
            ...conditionData.right,
            ...Array(newCardinality - conditionData.right.length).fill(null).map(() => 
              createDirectExpression('value', conditionData.left?.returnType || 'text', '')
            )
          ];
        } else {
          // Need fewer values - trim
          newRight = conditionData.right.slice(0, newCardinality);
        }
      } else if (oldCardinality === 1 && conditionData.right) {
        // Converting single value to array - use it as first item
        newRight = [
          conditionData.right,
          ...Array(newCardinality - 1).fill(null).map(() => 
            createDirectExpression('value', conditionData.left?.returnType || 'text', '')
          )
        ];
      } else {
        // Create new array
        newRight = Array(newCardinality).fill(null).map(() => 
          createDirectExpression(
            'value',
            conditionData.left?.returnType || 'text',
            ''
          )
        );
      }
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

  // Render the comparison content (left operator right)
  const renderComparisonContent = () => (
    <Space direction="horizontal" size="middle" wrap style={{ width: '100%' }}>
      {/* Left Expression */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Expression
          value={conditionData.left}
          onChange={handleLeftChange}
          config={config}
          darkMode={darkMode}
          expansionPath={`${expansionPath}-left`}
          isExpanded={isExpanded}
          onToggleExpansion={onToggleExpansion}
          onSetExpansion={onSetExpansion}
          isNew={isNew}
        />
      </div>

      {/* Operator */}
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
            expansionPath={`${expansionPath}-right`}
            isExpanded={isExpanded}
            onToggleExpansion={onToggleExpansion}
            onSetExpansion={onSetExpansion}
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
                  expansionPath={`${expansionPath}-right-${index}`}
                  isExpanded={isExpanded}
                  onToggleExpansion={onToggleExpansion}
                  onSetExpansion={onSetExpansion}
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
  );

  // When hideHeader is true, render content directly without Collapse wrapper
  if (hideHeader && sourceType !== 'conditionGroup' && sourceType !== 'ruleRef') {
    return renderComparisonContent();
  }

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
          <Space 
            style={{ width: '100%', justifyContent: 'space-between' }}
            data-testid={`condition-header-${(conditionData.name || 'unnamed').replace(/\s+/g, '-').toLowerCase()}`}
          >
            <Space size="small">
              <Space size="small" align="center">
                <ConditionSourceSelector
                  value={sourceType}
                  onChange={handleSourceChange}
                  expansionPath={expansionPath}
                />
              </Space>
              {editingName ? (
                <Input
                  data-testid="condition-name-input"
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
                    data-testid="condition-edit-icon"
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
      <div data-testid="condition-content" data-source-type={sourceType}>
        {sourceType === 'ruleRef' ? (
          <RuleReference
            value={conditionData.ruleRef || {}}
            onChange={handleRuleRefChange}
            config={config}
            darkMode={darkMode}
            expectedType="boolean"
          />
        ) : sourceType === 'conditionGroup' ? (
          <ConditionGroup
            value={conditionData}
            onChange={(newData) => {
              setConditionData(newData);
              onChange(newData);
            }}
            config={config}
            darkMode={darkMode}
            onRemove={onRemove}
            depth={depth + 1}
            isSimpleCondition={false}
            hideHeader={hideHeader}
            expansionPath={expansionPath}
            isExpanded={isExpanded}
            onToggleExpansion={onToggleExpansion}
            onSetExpansion={onSetExpansion}
            isNew={isNew}
          />
        ) : (
          renderComparisonContent()
        )}
        
        {/* Add Condition button - converts to group (only at parent level) */}
        {(showAddButton !== undefined ? showAddButton : depth === 0) && (
          <div style={{ marginTop: '12px' }}>
            <Button
              type="primary"
              size="small"
              icon={<BranchesOutlined />}
              onClick={() => handleSourceChange('conditionGroup')}
            >
              Add Condition
            </Button>
          </div>
        )}
      </div>
        )
      }]}
    />
  );
};

export default Condition;
