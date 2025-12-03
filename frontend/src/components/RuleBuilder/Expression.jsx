import React, { useState, useEffect } from 'react';
import { Space, Select, Input, InputNumber, DatePicker, Switch, TreeSelect, Typography, Button, Tooltip } from 'antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons';
import moment from 'moment';
import RuleReference from './RuleReference';
import ExpressionGroup from './ExpressionGroup';
import Function from './Function';
import { checkInternalTypeConsistency } from './utils/typeValidation';

const { Text } = Typography;

/**
 * Factory function to create expression objects
 * @param {string} type - Expression type (value, field, function, ruleRef)
 * @param {string} returnType - Return type
 * @param {*} value - Initial value
 * @returns {Object} Expression structure
 */
export const createDirectExpression = (type = 'value', returnType = 'text', value = '') => {
  const expression = {
    type,
    returnType,
    ...(type === 'value' && { value }),
    ...(type === 'field' && { field: value || null }),
    ...(type === 'function' && { function: { name: value || null, args: [] } }),
    ...(type === 'ruleRef' && { id: value || null, uuid: null, version: 1 })
  };

  return expression;
};

/**
 * Expression Component
 * 
 * A unified component for building expressions with operation support.
 * Can handle both simple expressions and multi-expression operations.
 * 
 * Simple Expression Structure:
 * - value: { type: 'value', returnType: 'text', value: 'hello' }
 * - field: { type: 'field', returnType: 'text', field: 'TABLE1.TEXT_FIELD_01' }
 * - function: { type: 'function', returnType: 'number', function: { name: 'MATH.ADD', args: [...] } }
 * - ruleRef: { type: 'ruleRef', returnType: 'boolean', id: 'RULE_ID', uuid: 'abc-123', version: 1 }
 * 
 * Expression Group Structure:
 * {
 *   "type": "expressionGroup",
 *   "returnType": "number|text|date|boolean", // inferred from expressions
 *   "expressions": [
 *     Expression | ExpressionGroup,
 *     Expression | ExpressionGroup,
 *     ...
 *   ],
 *   "operators": ["+", "-", "*", "/"]  // operators between expressions
 * }
 * 
 * Props:
 * - value: Current expression object
 * - onChange: Callback when expression changes
 * - config: Config with operators, fields, functions
 * - expectedType: Expected return type for filtering (text, number, date, boolean)
 * - darkMode: Dark mode styling
 * - compact: Compact mode
 * - propArgDef: Custom argument definition for dropdowns
 * - isLoadedRule: Whether this is a loaded rule (affects expansion state)
 * - allowedSources: Allowed value sources for filtering
 * - customComponents: Map of custom component names to implementations
 */
const Expression = ({ 
  value, 
  onChange, 
  config, 
  expectedType, 
  propArgDef = null, 
  darkMode = false, 
  compact = false, 
  expansionPath = 'expression',
  isExpanded = () => true,
  onToggleExpansion = () => {},
  onSetExpansion,
  isNew = true,
  allowedSources = null, 
  onAddExpression = null
}) => {
  // Normalize the value to ensure it's a proper structure
  const normalizeValue = (val) => {
    if (!val) {
      return {
        type: 'value',
        returnType: expectedType || 'text',
        value: expectedType === 'number' ? 0 : ''
      };
    }
    
    // If it's already a valid expression, return as-is
    if (val.type && ['value', 'field', 'function', 'ruleRef', 'expressionGroup'].includes(val.type)) {
      return val;
    }
    
    // Otherwise create a default value expression
    return {
      type: 'value',
      returnType: expectedType || 'text',
      value: expectedType === 'number' ? 0 : ''
    };
  };

  const initialValue = normalizeValue(value);
  const [source, setSource] = useState(initialValue.type || 'value');
  const [expressionData, setExpressionData] = useState(initialValue);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Use centralized expansion state
  const expanded = isExpanded(expansionPath);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      const normalized = normalizeValue(value);
      setSource(normalized.type || 'value');
      setExpressionData(normalized);
    }
  }, [value]);

  // Validate ruleRef expressions when loaded from JSON
  useEffect(() => {
    const validateRuleRef = async () => {
      // Only validate ruleRef types that have an id but are missing validation metadata
      if (expressionData.type === 'ruleRef' && 
          expressionData.uuid && 
          expressionData.hasInternalMismatch === undefined) {
        
        if (!config?.onLoadRule) {
          console.warn('[Expression] No onLoadRule callback provided in config for ruleRef validation');
          return;
        }
        
        try {
          const version = expressionData.version || 'latest';
          const ruleData = await config.onLoadRule(expressionData.uuid, version);
          
          if (ruleData) {
            // Check for internal consistency
            const consistencyCheck = checkInternalTypeConsistency(ruleData);
            
            if (consistencyCheck.hasInternalMismatch) {
              console.warn(
                `[Expression] Loaded ruleRef ${expressionData.id} has internal type mismatch: ` +
                `declares ${consistencyCheck.declaredType} but evaluates to ${consistencyCheck.evaluatedType}`
              );
            }
            
            // Update expressionData with validation metadata
            const updatedData = {
              ...expressionData,
              hasInternalMismatch: consistencyCheck.hasInternalMismatch,
              internalDeclaredType: consistencyCheck.declaredType,
              internalEvaluatedType: consistencyCheck.evaluatedType
            };
            
            setExpressionData(updatedData);
            
            // Also notify parent component
            if (onChange) {
              onChange(updatedData);
            }
          }
        } catch (error) {
          console.error('Error validating ruleRef:', error);
        }
      }
    };
    
    validateRuleRef();
  }, [expressionData.type, expressionData.id, expressionData.uuid, expressionData.hasInternalMismatch]);

  // Handle single-item expression groups by extracting the expression
  if (expressionData.type === 'expressionGroup') {
    if (expressionData.expressions && expressionData.expressions.length === 1) {
      // Single-item ExpressionGroup - extract the expression and handle it directly
      const singleExpression = expressionData.expressions[0];
      
      // Update the expression data to the single expression but keep ExpressionGroup wrapper for saving
      const handleSingleExpressionChange = (newExpression) => {
        // If the inner Expression created a multi-item ExpressionGroup, pass it through unchanged
        if (newExpression.type === 'expressionGroup' && newExpression.expressions?.length > 1) {
          if (onChange) onChange(newExpression);
          return;
        }
        
        // Otherwise, wrap single expression in ExpressionGroup
        const updatedGroup = {
          ...expressionData,
          expressions: [newExpression],
          returnType: newExpression.returnType || expressionData.returnType
        };
        if (onChange) onChange(updatedGroup);
      };
      
      // Re-render with the single expression
      return (
        <Expression
          value={singleExpression}
          onChange={handleSingleExpressionChange}
          config={config}
          expectedType={expectedType}
          darkMode={darkMode}
          compact={compact}
          expansionPath={expansionPath}
          isExpanded={isExpanded}
          onToggleExpansion={onToggleExpansion}
          onSetExpansion={onSetExpansion}
          isNew={isNew}
          allowedSources={allowedSources}
          propArgDef={propArgDef}
        />
      );
    } else if (expressionData.expressions && expressionData.expressions.length > 1) {
      // Multi-item ExpressionGroup - delegate to ExpressionGroup component
      return (
        <ExpressionGroup
          value={expressionData}
          onChange={onChange}
          config={config}
          expectedType={expectedType}
          darkMode={darkMode}
          compact={compact}
          expansionPath={expansionPath}
          isExpanded={isExpanded}
          onToggleExpansion={onToggleExpansion}
          onSetExpansion={onSetExpansion}
          isNew={isNew}
          allowedSources={allowedSources}
          argDef={propArgDef}
          onAddExpressionAfterGroup={() => {
            console.log('[onAddExpressionAfterGroup] Wrapping group at path:', expansionPath);
            // Wrap current group with a new expression in an outer group
            const currentReturnType = expressionData.returnType || expectedType || 'text';
            const defaultOperatorKey = config?.types?.[currentReturnType]?.defaultExpressionOperator || 'add';
            const defaultOperator = config?.expressionOperators?.[defaultOperatorKey]?.symbol || '+';
            
            const newExpression = {
              type: 'value',
              returnType: currentReturnType,
              value: currentReturnType === 'number' ? 0 : currentReturnType === 'boolean' ? false : ''
            };
            
            const outerGroup = {
              type: 'expressionGroup',
              returnType: currentReturnType,
              expressions: [expressionData, newExpression],
              operators: [defaultOperator]
            };
            
            // Auto-expand BOTH the outer group AND the inner wrapped group
            if (onSetExpansion) {
              console.log('[onAddExpressionAfterGroup] Setting expansion to TRUE for outer group path:', expansionPath);
              onSetExpansion(expansionPath, true);
              
              // Also expand the inner group (the old group that's now wrapped at index 0)
              const innerGroupPath = `${expansionPath}-expression-0`;
              console.log('[onAddExpressionAfterGroup] Setting expansion to TRUE for inner wrapped group path:', innerGroupPath);
              onSetExpansion(innerGroupPath, true);
            }
            
            console.log('[onAddExpressionAfterGroup] Calling onChange with outer group');
            onChange(outerGroup);
          }}
        />
      );
    } else {
      // Empty expressionGroup - treat as empty expression
      return null;
    }
  }

  // Check if we can add operators
  const canAddOperators = () => {
    const currentType = expressionData.returnType || expectedType;
    return currentType === 'number' || currentType === 'text';
  };

  // Convert this expression into an ExpressionGroup
  const convertToGroup = () => {
    // Extract the actual expression from single-item ExpressionGroup if needed
    let actualExpression = expressionData;
    if (expressionData.type === 'expressionGroup' && expressionData.expressions?.length === 1) {
      actualExpression = expressionData.expressions[0];
    }
    
    const exprType = actualExpression.returnType || 'number';
    // Get default operator key from config (e.g., 'add', 'concat')
    const defaultOperatorKey = config?.types?.[exprType]?.defaultExpressionOperator || 'add';
    // Convert operator key to symbol (e.g., 'add' -> '+', 'concat' -> '&')
    const defaultOperator = config?.expressionOperators?.[defaultOperatorKey]?.symbol || '+';
    const expressionGroup = {
      type: 'expressionGroup',
      returnType: exprType,
      expressions: [
        actualExpression,
        { 
          type: 'value', 
          returnType: exprType, 
          value: exprType === 'text' ? '' : 0 
        }
      ],
      operators: [defaultOperator]
    };
    
    console.log('[convertToGroup] Converting expression to group at path:', expansionPath);
    console.log('[convertToGroup] Current isExpanded:', isExpanded ? isExpanded(expansionPath) : 'no isExpanded fn');
    
    // Auto-expand the newly created expression group BEFORE changing data
    // This ensures expansion state is set before React re-renders
    if (onSetExpansion) {
      console.log('[convertToGroup] Setting expansion to TRUE for path:', expansionPath);
      onSetExpansion(expansionPath, true);
    } else {
      console.log('[convertToGroup] WARNING: onSetExpansion is not available!');
    }
    
    if (onChange) {
      console.log('[convertToGroup] Calling onChange with new expressionGroup');
      onChange(expressionGroup);
    }
  };

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    let newData;
    
    if (newSource === 'value') {
      newData = { 
        type: 'value', 
        returnType: expectedType || 'text', 
        value: '' 
      };
    } else if (newSource === 'field') {
      newData = { 
        type: 'field', 
        returnType: expectedType || 'text',
        field: null 
      };
    } else if (newSource === 'function') {
      newData = { 
        type: 'function', 
        returnType: expectedType || 'text',
        function: { name: null, args: [] } 
      };
    } else if (newSource === 'ruleRef') {
      newData = { 
        type: 'ruleRef', 
        returnType: expectedType || 'boolean',
        id: null,
        uuid: null,
        version: null
      };
    }
    
    setExpressionData(newData);
    onChange(newData);
  };

  const handleValueChange = (updates) => {
    const updated = { ...expressionData, ...updates };
    setExpressionData(updated);
    onChange(updated);
  };

  // Build tree data from hierarchical fields
  const buildFieldTreeData = (fieldsObj, parentKey = '') => {
    if (!fieldsObj) return [];
    
    const treeData = [];
    Object.keys(fieldsObj).forEach(key => {
      const field = fieldsObj[key];
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      
      if (field.type === '!struct' && field.subfields) {
        treeData.push({
          title: field.label || key,
          value: fullKey,
          selectable: false,
          children: buildFieldTreeData(field.subfields, fullKey)
        });
      } else {
        if (!expectedType || field.type === expectedType) {
          treeData.push({
            title: field.label || key,
            value: fullKey,
            type: field.type
          });
        }
      }
    });
    return treeData;
  };

  // Build tree data from hierarchical functions (same structure as fields)
  const buildFuncTreeData = (functionsObj, parentKey = '') => {
    if (!functionsObj) return [];
    
    const treeData = [];
    Object.keys(functionsObj).forEach(key => {
      const func = functionsObj[key];
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      
      if (func.type === '!struct' && func.subfields) {
        // Always include category nodes, but filter their children
        const children = buildFuncTreeData(func.subfields, fullKey);
        
        // Only include the category if it has children (after filtering)
        if (children.length > 0) {
          treeData.push({
            title: func.label || key,
            value: fullKey,
            selectable: false,
            children: children
          });
        }
      } else {
        // Only include leaf functions that match the expected type (or if no type filter)
        if (!expectedType || func.returnType === expectedType) {
          treeData.push({
            title: func.label || key,
            value: fullKey,
            returnType: func.returnType
          });
        }
      }
    });
    return treeData;
  };

  // Get function definition by path
  const getFuncDef = (funcPath) => {
    if (!funcPath || !config?.functions) return null;
    
    const parts = funcPath.split('.');
    let current = config.functions;
    
    for (const part of parts) {
      if (!current[part]) return null;
      current = current[part];
      
      if (current.type === '!struct' && current.subfields) {
        current = current.subfields;
      }
    }
    
    return current;
  };

  // Get field definition
  const getFieldDef = (fieldPath) => {
    if (!fieldPath || !config?.fields) return null;
    
    const parts = fieldPath.split('.');
    let current = config.fields;
    
    for (const part of parts) {
      if (!current[part]) return fieldPath;
      current = current[part];
      
      if (current.type === '!struct' && current.subfields) {
        current = current.subfields;
      }
    }
    
    return current;
  };

  const renderSourceSelector = () => {
    // Priority order for determining available sources:
    // 1. allowedSources prop (explicit override)
    // 2. propArgDef.valueSources (from function argument definition)
    // 3. config.settings.defaultValueSources (global default)
    // 4. hardcoded default
    const availableSources = allowedSources || 
                           propArgDef?.valueSources || 
                           config?.settings?.defaultValueSources || 
                           ['value', 'field', 'function', 'ruleRef'];
    
    const sourceIconMap = {
      'value': <NumberOutlined />,
      'field': <FieldTimeOutlined />,
      'function': <FunctionOutlined />,
      'ruleRef': <LinkOutlined />
    };
    
    const sourceLabelMap = {
      'value': 'Value',
      'field': 'Field',
      'function': 'Function',
      'ruleRef': 'Rule'
    };
    
    const sourceOptions = availableSources.map(src => ({
      label: sourceLabelMap[src] || src,
      value: src,
      icon: sourceIconMap[src]
    }));
    
    // If there's only one source available, show just the icon (no dropdown)
    if (availableSources.length === 1) {
      const singleSource = availableSources[0];
      const icon = sourceIconMap[singleSource];
      return (
        <span 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '32px',
            height: '24px',
            fontSize: '14px',
            color: 'rgba(0, 0, 0, 0.45)'
          }}
          title={sourceLabelMap[singleSource]}
        >
          {icon}
        </span>
      );
    }
    
    return (
      <Select
        data-testid={expansionPath ? `expression-source-selector-${expansionPath}` : 'expression-source-selector'}
        value={source}
        onChange={handleSourceChange}
        style={{ width: isDropdownOpen ? 120 : 50, minWidth: 50, transition: 'width 0.2s' }}
        size="small"
        onDropdownVisibleChange={setIsDropdownOpen}
        // When closed, show only icon
        labelRender={(props) => {
          const option = sourceOptions.find(opt => opt.value === props.value);
          return isDropdownOpen ? (
            <Space size={4}>
              {option?.icon}
              <span>{option?.label}</span>
            </Space>
          ) : (
            <span style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              {option?.icon}
            </span>
          );
        }}
        options={sourceOptions}
        optionRender={(option) => (
          <Space size={4}>
            {option.icon}
            <span>{option.label}</span>
          </Space>
        )}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
    );
  };

  const renderValueInput = () => {
    const returnType = expressionData.returnType || 'text';
    
    // Check if this is a custom dropdown argument
    if (propArgDef?.widget === 'select' && propArgDef?.options) {
      return (
        <Select
          value={expressionData.value || propArgDef.defaultValue}
          onChange={(val) => handleValueChange({ value: val })}
          style={{ width: '120px', minWidth: '120px' }}
          placeholder="Select option"
          options={propArgDef.options}
        />
      );
    }
    
    // Check if this is a custom multiselect dropdown argument
    if (propArgDef?.widget === 'multiselect' && propArgDef?.options) {
      return (
        <Select
          mode="multiple"
          value={expressionData.value || [propArgDef.defaultValue].filter(Boolean)}
          onChange={(val) => handleValueChange({ value: val })}
          style={{ width: '150px', minWidth: '150px' }}
          placeholder="Select options"
          options={propArgDef.options}
        />
      );
    }
    
    switch (returnType) {
      case 'number':
        return (
          <InputNumber
            value={expressionData.value || 0}
            onChange={(val) => handleValueChange({ value: val })}
            style={{ width: '100%' }}
            placeholder="Enter number"
          />
        );
      case 'date':
        return (
          <DatePicker
            value={expressionData.value ? moment(expressionData.value) : null}
            onChange={(date) => handleValueChange({ value: date ? date.format('YYYY-MM-DD') : null })}
            style={{ width: '100%' }}
          />
        );
      case 'boolean':
        return (
          <Switch
            checked={expressionData.value || false}
            onChange={(checked) => handleValueChange({ value: checked })}
          />
        );
      case 'text':
      default:
        return (
          <Input
            value={expressionData.value || ''}
            onChange={(e) => handleValueChange({ value: e.target.value })}
            placeholder="Enter text"
            style={{ width: '100%' }}
          />
        );
    }
  };

  const renderFieldSelector = () => {
    const fieldTreeData = buildFieldTreeData(config?.fields || {});
    
    // Check if this should be a multiselect field picker
    const isMultiselect = propArgDef?.widget === 'multiselect';
    
    if (isMultiselect) {
      // Helper to get field label from path
      const getFieldLabel = (path) => {
        const findInTree = (nodes, targetPath) => {
          for (const node of nodes) {
            if (node.value === targetPath) return node.title;
            if (node.children) {
              const found = findInTree(node.children, targetPath);
              if (found) return found;
            }
          }
          return null;
        };
        return findInTree(fieldTreeData, path) || path;
      };
      
      return (
        <TreeSelect
          treeCheckable
          showCheckedStrategy="SHOW_CHILD"
          value={expressionData.value || []}
          onChange={(fieldPaths) => {
            handleValueChange({ 
              value: fieldPaths,
              returnType: 'text' // multiselect returns array of field paths
            });
          }}
          treeData={fieldTreeData}
          placeholder="Select fields"
          style={{ width: '100%', minWidth: '200px' }}
          className="multiselect-wrap-tags"
          popupClassName="compact-tree-select"
          treeIcon={false}
          showSearch
          treeDefaultExpandAll
          dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
          tagRender={(props) => {
            const { label, value, closable, onClose } = props;
            return (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 7px',
                marginRight: '4px',
                background: '#f0f0f0',
                border: '1px solid #d9d9d9',
                borderRadius: '2px',
                fontSize: '12px'
              }}>
                {getFieldLabel(value)}
                {closable && (
                  <span 
                    onClick={onClose}
                    style={{ marginLeft: '4px', cursor: 'pointer', fontSize: '10px' }}
                  >
                    ×
                  </span>
                )}
              </span>
            );
          }}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      );
    }
    
    return (
      <TreeSelect
        value={expressionData.field || null}
        onChange={(fieldPath) => {
          const fieldDef = getFieldDef(fieldPath);
          handleValueChange({ 
            field: fieldPath,
            returnType: fieldDef?.type || expectedType || 'text'
          });
        }}
        treeData={fieldTreeData}
        placeholder="Select field"
        style={{ width: '100%', minWidth: '200px' }}
        popupClassName="compact-tree-select"
        treeIcon={false}
        showSearch
        treeDefaultExpandAll
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
    );
  };

  const renderFunctionBuilder = () => {
    return (
      <Function
        value={expressionData}
        onChange={handleValueChange}
        config={config}
        darkMode={darkMode}
        expansionPath={expansionPath}
        isExpanded={isExpanded}
        onToggleExpansion={onToggleExpansion}
        expanded={expanded}
        expectedType={expectedType}
        isNew={isNew}
      />
    );
  };

  const renderRuleSelector = () => {
    // Build ruleRef object from expressionData
    const ruleRef = {
      id: expressionData.id || null,
      uuid: expressionData.uuid || null,
      version: expressionData.version || null,
      returnType: expressionData.returnType || null,
      ruleType: expressionData.ruleType || null,
      hasInternalMismatch: expressionData.hasInternalMismatch,
      internalDeclaredType: expressionData.internalDeclaredType,
      internalEvaluatedType: expressionData.internalEvaluatedType
    };

    const handleRuleRefChange = (newRuleRef) => {
      handleValueChange({
        id: newRuleRef.id,
        uuid: newRuleRef.uuid,
        version: newRuleRef.version,
        returnType: newRuleRef.returnType,
        ruleType: newRuleRef.ruleType,
        hasInternalMismatch: newRuleRef.hasInternalMismatch,
        internalDeclaredType: newRuleRef.internalDeclaredType,
        internalEvaluatedType: newRuleRef.internalEvaluatedType
      });
    };
    
    return (
      <RuleReference
        value={ruleRef}
        onChange={handleRuleRefChange}
        config={config}
        darkMode={darkMode}
        expectedType={expectedType}
        compact={false}
        ruleTypeConstraint={{ mode: 'default', value: 'Transformation' }}
      />
    );
  };

  return (
    <div
      style={{ width: '100%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Space.Compact style={{ width: '100%', alignItems: 'flex-start' }}>
        <div style={{ paddingTop: '6px' }}>
          {renderSourceSelector()}
        </div>
        <div style={{ flex: 1, marginLeft: '8px' }}>
          <Space style={{ width: '100%' }} size={0}>
            <div style={{ flex: 1 }}>
              {source === 'value' && renderValueInput()}
              {source === 'field' && renderFieldSelector()}
              {source === 'function' && renderFunctionBuilder()}
              {source === 'ruleRef' && renderRuleSelector()}
            </div>
            {/* Add Expression button - always visible but subtle */}
            {canAddOperators() && !compact && onAddExpression && (
              <Tooltip title="Add Expression">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={onAddExpression}
                  data-testid="expression-add-button"
                  style={{ 
                    minWidth: 'auto', 
                    padding: '0',
                    marginLeft: '2px',
                    color: isHovered ? (darkMode ? '#1890ff' : '#1890ff') : (darkMode ? '#666' : '#bbb'),
                    transition: 'color 0.2s'
                  }}
                />
              </Tooltip>
            )}
            {/* Group button - always visible but subtle */}
            {canAddOperators() && !compact && (
              <Tooltip title="Group with new Expression">
                <Button
                  type="text"
                  size="small"
                  onClick={convertToGroup}
                  data-testid="expression-group-button"
                  style={{ 
                    minWidth: 'auto', 
                    padding: '0',
                    marginLeft: '2px',
                    color: isHovered ? (darkMode ? '#1890ff' : '#1890ff') : (darkMode ? '#666' : '#bbb'),
                    fontSize: '12px',
                    fontWeight: 'bold',
                    transition: 'color 0.2s'
                  }}
                >
                  (+)
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      </Space.Compact>
    </div>
  );
};

/**
 * Factory function to create a new single-item ExpressionGroup structure
 * This ensures the structure is defined in one place and follows the new pattern
 */
export const createExpressionGroup = (returnType = 'text', defaultValue = '') => ({
  type: 'expressionGroup',
  returnType,
  expressions: [{
    type: 'value',
    returnType,
    value: defaultValue
  }],
  operators: []
});

export default Expression;
