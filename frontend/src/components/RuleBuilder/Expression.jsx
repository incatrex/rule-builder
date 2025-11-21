import React, { useState, useEffect } from 'react';
import { Space, Select, Input, InputNumber, DatePicker, Switch, TreeSelect, Card, Typography, Button, Tag, Alert, Tooltip } from 'antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined, PlusOutlined, CloseOutlined, DownOutlined, RightOutlined, LinkOutlined } from '@ant-design/icons';
import moment from 'moment';
import RuleSelector from './RuleSelector';
import ExpressionGroup from './ExpressionGroup';

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
 */
const Expression = ({ value, onChange, config, expectedType, propArgDef = null, darkMode = false, compact = false, isLoadedRule = false, allowedSources = null, onAddExpression = null }) => {
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
  // Start collapsed for loaded rules, even in compact mode
  const [isExpanded, setIsExpanded] = useState(!isLoadedRule);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Update expansion state when isLoadedRule changes from true to false (i.e., editing after load)
  // In compact mode for nested expressions, expand after initial render
  useEffect(() => {
    if (!isLoadedRule && compact) {
      setIsExpanded(true); // Expand nested expressions once editing starts
    }
  }, [isLoadedRule, compact]);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      const normalized = normalizeValue(value);
      setSource(normalized.type || 'value');
      setExpressionData(normalized);
    }
  }, [value]);

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
          isLoadedRule={isLoadedRule}
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
          isLoadedRule={isLoadedRule}
          allowedSources={allowedSources}
          argDef={propArgDef}
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
    
    const expressionGroup = {
      type: 'expressionGroup',
      returnType: actualExpression.returnType || 'number',
      expressions: [
        actualExpression,
        { 
          type: 'value', 
          returnType: actualExpression.returnType || 'number', 
          value: actualExpression.returnType === 'text' ? '' : 0 
        }
      ],
      operators: ['+']
    };
    
    if (onChange) {
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
      if (!current[part]) return null;
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

  const getFunctionSummary = (funcData) => {
    if (!funcData || !funcData.name) return '?';
    
    const funcName = funcData.name.split('.').pop();
    const args = funcData.args || [];
    
    const argSummaries = args.map(arg => {
      if (!arg.value) return '?';
      const expr = arg.value;
      
      switch (expr.type) {
        case 'value':
          // Handle array values (multiselect fields)
          if (Array.isArray(expr.value)) {
            if (expr.value.length === 0) return '[]';
            // Map field paths to display names
            const fieldLabels = expr.value.map(fieldPath => 
              getFieldDisplayName(fieldPath, config?.fields) || fieldPath
            );
            return `[${fieldLabels.join(', ')}]`;
          }
          return expr.value !== undefined ? String(expr.value) : '?';
        case 'field':
          // Handle single field (could also be multiselect stored in value array)
          if (Array.isArray(expr.value)) {
            if (expr.value.length === 0) return '[]';
            const fieldLabels = expr.value.map(fieldPath => 
              getFieldDisplayName(fieldPath, config?.fields) || fieldPath
            );
            return `[${fieldLabels.join(', ')}]`;
          }
          return getFieldDisplayName(expr.field, config?.fields) || '?';
        case 'function':
          return getFunctionSummary(expr.function);
        case 'expressionGroup':
          if (expr.expressions && expr.expressions.length > 1) {
            const nestedSummaries = expr.expressions.map((nestedExpr, index) => {
              const summary = nestedExpr.type === 'value' ? (nestedExpr.value !== undefined ? String(nestedExpr.value) : '?')
                : nestedExpr.type === 'field' ? getFieldDisplayName(nestedExpr.field, config?.fields) || '?'
                : nestedExpr.type === 'function' ? getFunctionSummary(nestedExpr.function)
                : '?';
              let operator = '';
              if (index > 0 && expr.operators?.[index - 1]) {
                const operatorSymbol = expr.operators[index - 1].split(' ')[0];
                operator = ` ${operatorSymbol} `;
              }
              return operator + summary;
            });
            return `(${nestedSummaries.join('')})`;
          } else if (expr.expressions && expr.expressions.length === 1) {
            return getFunctionSummary(expr.expressions[0]);
          }
          return '?';
        default:
          return '?';
      }
    });
    
    return `${funcName}(${argSummaries.join(', ')})`;
  };

  const getFieldDisplayName = (fieldPath, fields) => {
    if (!fieldPath || !fields) return fieldPath;
    
    const parts = fieldPath.split('.');
    let current = fields;
    
    for (const part of parts) {
      if (!current[part]) return fieldPath;
      current = current[part];
      
      if (current.type === '!struct' && current.subfields) {
        current = current.subfields;
      }
    }
    
    return current.label || parts[parts.length - 1];
  };

  const renderFunctionBuilder = () => {
    const funcTreeData = buildFuncTreeData(config?.functions || {});
    const funcDef = getFuncDef(expressionData.function?.name);
    
    // Render collapsed view when not expanded and function has args
    if (!isExpanded && funcDef && expressionData.function?.args && expressionData.function.args.length > 0) {
      return (
        <Space size={4} style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(true)}>
          <RightOutlined style={{ fontSize: '10px', color: darkMode ? '#888' : '#666' }} />
          <Text code style={{ fontSize: '12px' }}>
            {getFunctionSummary(expressionData.function)}
          </Text>
          <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px' }}>
            {expressionData.returnType || 'unknown'}
          </Tag>
        </Space>
      );
    }
    
    return (
      <Card
        size="small"
        style={{
          background: darkMode ? '#2a2a2a' : '#fafafa',
          border: `1px solid ${darkMode ? '#555555' : '#d9d9d9'}`
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Function selector with collapse button */}
          <Space size={4} style={{ width: '100%' }}>
            {funcDef && expressionData.function?.args && expressionData.function.args.length > 0 && (
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                style={{ padding: 0, color: darkMode ? '#e0e0e0' : 'inherit', flexShrink: 0 }}
              />
            )}
            <TreeSelect
              value={expressionData.function?.name || null}
              onChange={(funcPath) => {
                const funcDef = getFuncDef(funcPath);
                let initialArgs = [];
                
                if (funcDef?.dynamicArgs) {
                  // Handle dynamic args - create minimum number of args
                  const minArgs = funcDef.dynamicArgs.minArgs || 2;
                  for (let i = 0; i < minArgs; i++) {
                    initialArgs.push({
                      name: `arg${i + 1}`,
                      value: { 
                        type: 'value', 
                        returnType: funcDef.dynamicArgs.type || funcDef.dynamicArgs.argType || 'text', // Support both new 'type' and legacy 'argType'
                        value: funcDef.dynamicArgs.defaultValue ?? ''
                      }
                    });
                  }
                } else if (funcDef?.args) {
                  // Handle fixed args - support both array and object formats
                  
                  if (Array.isArray(funcDef.args)) {
                    // Array format: [{name: "arg1", type: "text", ...}, ...]
                    initialArgs = funcDef.args.map(argDef => {
                      const initialType = argDef.valueSources?.length === 1 ? argDef.valueSources[0] : 'value';
                      return {
                        name: argDef.name,
                        value: {
                          type: initialType,
                          returnType: argDef.type || 'text',
                          value: argDef.defaultValue ?? ''
                        }
                      };
                    });
                  } else {
                    // Object format: {arg1: {type: "text", ...}, ...}
                    initialArgs = Object.keys(funcDef.args).map(argKey => {
                      const argDef = funcDef.args[argKey];
                      const initialType = argDef.valueSources?.length === 1 ? argDef.valueSources[0] : 'value';
                      return {
                        name: argKey,
                        value: { 
                          type: initialType, 
                          returnType: argDef.type || 'text',
                          value: argDef.defaultValue ?? ''
                        }
                      };
                    });
                  }
                }
                
                handleValueChange({ 
                  returnType: funcDef?.returnType || expectedType || 'text',
                  function: {
                    name: funcPath,
                    args: initialArgs
                  }
                });
                
                // Expand when a function is selected
                setIsExpanded(true);
              }}
              treeData={funcTreeData}
              placeholder="Select function"
              style={{ flex: 1 }}
              showSearch
              treeDefaultExpandAll
              popupClassName="compact-tree-select"
              treeIcon={false}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </Space>

          {/* Function arguments */}
          {funcDef && expressionData.function?.args && expressionData.function.args.length > 0 && isExpanded && (
            <Card
              size="small"
              title={
                <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>
                  Arguments
                </Text>
              }
              style={{
                background: darkMode ? '#2a2a2a' : '#fafafa',
                border: `1px solid ${darkMode ? '#555555' : '#d9d9d9'}`
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {expressionData.function.args.map((arg, index) => {
                    const isDynamicArgs = funcDef?.dynamicArgs;
                    
                    // Handle both array and object formats for args
                    let argDef;
                    if (isDynamicArgs) {
                      argDef = funcDef.dynamicArgs || funcDef.argSpec;
                    } else if (Array.isArray(funcDef.args)) {
                      argDef = funcDef.args.find(a => a.name === arg.name);
                    } else {
                      argDef = funcDef.args[arg.name];
                    }
                    const expectedArgType = isDynamicArgs ? (funcDef.dynamicArgs.type || funcDef.dynamicArgs.argType) : argDef?.type;
                    
                    return (
                      <div key={index} style={{ 
                        paddingLeft: '12px', 
                        borderLeft: darkMode ? '2px solid #555555' : '2px solid #d9d9d9' 
                      }}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {isDynamicArgs ? `Arg ${index + 1}` : (argDef?.label || arg.name)}
                              {expectedArgType && (
                                <Tag color="blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                                  {expectedArgType}
                                </Tag>
                              )}
                            </Text>
                            {isDynamicArgs && expressionData.function.args.length > (funcDef.dynamicArgs.minArgs || 2) && (
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedArgs = [...expressionData.function.args];
                                  updatedArgs.splice(index, 1);
                                  handleValueChange({ function: { ...expressionData.function, args: updatedArgs } });
                                }}
                                title="Remove argument"
                              />
                            )}
                          </Space>
                          <Expression
                            value={arg.value}
                            onChange={(newValue) => {
                              const updatedArgs = [...expressionData.function.args];
                              updatedArgs[index] = { ...arg, value: newValue };
                              handleValueChange({ function: { ...expressionData.function, args: updatedArgs } });
                            }}
                            config={config}
                            expectedType={expectedArgType}
                            propArgDef={argDef}
                            darkMode={darkMode}
                            isLoadedRule={isLoadedRule}
                          />
                        </Space>
                      </div>
                    );
                  })}
                  {/* Add argument button for dynamic args */}
                  {funcDef?.dynamicArgs && (!funcDef.dynamicArgs.maxArgs || 
                    expressionData.function.args.length < funcDef.dynamicArgs.maxArgs) && (
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        const newArgs = [...expressionData.function.args];
                        newArgs.push({
                          name: `arg${newArgs.length + 1}`,
                          value: { 
                            type: 'value', 
                            returnType: funcDef.dynamicArgs.type || funcDef.dynamicArgs.argType || 'text', // Support both new 'type' and legacy 'argType'
                            value: funcDef.dynamicArgs.defaultValue ?? ''
                          }
                        });
                        handleValueChange({ function: { ...expressionData.function, args: newArgs } });
                      }}
                      style={{ width: '100%' }}
                    >
                      Add Argument
                    </Button>
                  )}
                </Space>
            </Card>
          )}
        </Space>
      </Card>
    );
  };

  const renderRuleSelector = () => {
    const ruleKey = expressionData.id && expressionData.uuid 
      ? `${expressionData.id}.${expressionData.uuid}`
      : null;
    
    // Check if rule return type matches expected type
    const hasTypeMismatch = expressionData.returnType && expectedType && 
      expressionData.returnType !== expectedType;
    
    return (
      <Card
        size="small"
        style={{
          background: darkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${darkMode ? '#555555' : '#d9d9d9'}`
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Rule selector */}
          <RuleSelector
            value={ruleKey}
            onChange={(selection) => {
              if (!selection) {
                handleValueChange({
                  id: null,
                  uuid: null,
                  version: null,
                  returnType: expectedType || 'boolean',
                  ruleType: null
                });
                return;
              }
              
              const { metadata } = selection;
              handleValueChange({
                id: metadata.ruleId,
                uuid: metadata.uuid,
                version: metadata.version,
                returnType: metadata.returnType,
                ruleType: metadata.ruleType
              });
            }}
            darkMode={darkMode}
            placeholder="Select a rule..."
            showReturnType={true}
            showRuleTypeFilter={true}
            ruleTypes={config.ruleTypes || []}
            initialRuleType={expressionData.ruleType}
          />
          
          {/* Warning for type mismatch */}
          {hasTypeMismatch && (
            <Alert
              message="Return Type Mismatch"
              description={`This rule returns ${expressionData.returnType}, but ${expectedType} is expected.`}
              type="warning"
              showIcon
              closable={false}
              style={{ fontSize: '12px' }}
            />
          )}
          
          {/* Selected rule info */}
          {expressionData.id && (
            <div style={{
              fontSize: '11px',
              color: darkMode ? '#888' : '#666',
              padding: '8px',
              background: darkMode ? '#2a2a2a' : '#f5f5f5',
              borderRadius: '4px'
            }}>
              <div><strong>Rule ID:</strong> {expressionData.id}</div>
              <div><strong>Version:</strong> {expressionData.version}</div>
              <div><strong>Returns:</strong> <Tag color="blue" style={{ fontSize: '10px' }}>{expressionData.returnType}</Tag></div>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div
      style={{ width: '100%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Space.Compact style={{ width: '100%' }}>
        {/* Group button - always visible but subtle */}
        {canAddOperators() && !compact && (
          <Tooltip title="Group">
            <Button
              type="text"
              size="small"
              onClick={convertToGroup}
              data-testid="expression-group-button"
              style={{ 
                minWidth: 'auto', 
                padding: '0 6px',
                color: isHovered ? (darkMode ? '#1890ff' : '#1890ff') : (darkMode ? '#666' : '#bbb'),
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'color 0.2s'
              }}
            >
              ()
            </Button>
          </Tooltip>
        )}
        {renderSourceSelector()}
        <div style={{ flex: 1, marginLeft: '8px' }}>
          <Space style={{ width: '100%' }} size="small">
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
                    padding: '0 4px',
                    color: isHovered ? (darkMode ? '#1890ff' : '#1890ff') : (darkMode ? '#666' : '#bbb'),
                    transition: 'color 0.2s'
                  }}
                />
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
