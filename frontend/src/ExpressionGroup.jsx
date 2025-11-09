import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Space, Select, Input, InputNumber, DatePicker, Switch, TreeSelect, Card, Typography, Button, Tag } from 'antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined, PlusOutlined, CloseOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Text } = Typography;

/**
 * ExpressionGroup Component
 * 
 * Replaces the Expression component with support for mathematical operations.
 * Every expression is now an ExpressionGroup that can contain:
 * - A single expression (simple case)
 * - Multiple expressions connected by operators (mathematical expressions)
 * 
 * JSON Structure:
 * {
 *   "source": "expressionGroup",
 *   "returnType": "number|text|date|boolean", // inferred from expressions
 *   "firstExpression": BaseExpression | ExpressionGroup,
 *   "additionalExpressions": [
 *     {
 *       "operator": "+" | "-" | "*" | "/",
 *       "expression": BaseExpression | ExpressionGroup
 *     }
 *   ]
 * }
 * 
 * BaseExpression (leaf expressions):
 * - value: { source: 'value', returnType: 'text', value: 'hello' }
 * - field: { source: 'field', returnType: 'text', field: 'TABLE1.TEXT_FIELD_01' }
 * - function: { source: 'function', returnType: 'number', name: 'MATH.ADD', args: [...] }
 * 
 * Props:
 * - value: Current expression group object
 * - onChange: Callback when expression group changes
 * - config: Config with operators, fields, funcs
 * - expectedType: Expected return type for filtering (text, number, date, boolean)
 * - darkMode: Dark mode styling
 * - compact: Compact mode
 */
const ExpressionGroup = ({ value, onChange, config, expectedType, darkMode = false, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Normalize the value to ensure it's a proper ExpressionGroup structure
  const normalizeValue = (val) => {
    if (!val) {
      return {
        source: 'expressionGroup',
        returnType: expectedType || 'number',
        firstExpression: { source: 'value', returnType: expectedType || 'number', value: '' },
        additionalExpressions: []
      };
    }
    
    // If it's already an ExpressionGroup, return as-is
    if (val.source === 'expressionGroup') {
      return val;
    }
    
    // If it's a BaseExpression (field, value, function), wrap it as the firstExpression
    return {
      source: 'expressionGroup',
      returnType: val.returnType || expectedType || 'number',
      firstExpression: val,
      additionalExpressions: []
    };
  };
  
  const [groupData, setGroupData] = useState(normalizeValue(value));
  const isUpdatingFromProps = useRef(false);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      isUpdatingFromProps.current = true;
      setGroupData(normalizeValue(value));
      setTimeout(() => {
        isUpdatingFromProps.current = false;
      }, 0);
    }
  }, [value]);

  // Notify parent of changes (only if not updating from props)
  useEffect(() => {
    if (onChange && !isUpdatingFromProps.current) {
      onChange(groupData);
    }
  }, [groupData]);

  const handleChange = (updates) => {
    const newData = { ...groupData, ...updates };
    
    // Auto-infer return type from expressions
    const inferredType = inferReturnType(newData);
    if (inferredType) {
      newData.returnType = inferredType;
    }
    
    setGroupData(newData);
  };

  const inferReturnType = (data) => {
    // If we have mathematical operators, result should be number
    if (data.additionalExpressions && data.additionalExpressions.length > 0) {
      const hasNumericalOperators = data.additionalExpressions.some(ae => 
        ['+', '-', '*', '/'].includes(ae.operator)
      );
      if (hasNumericalOperators) {
        return 'number';
      }
    }
    
    // Start with first expression's return type, but default to number for mathematical expressions
    let type = getExpressionReturnType(data.firstExpression);
    
    // Default to number for mathematical expressions (when no specific type is determined)
    if (type === 'text' && data.source === 'expressionGroup') {
      type = 'number';
    }
    
    return type;
  };

  const getExpressionReturnType = (expr) => {
    if (!expr) return 'number'; // Default to number for mathematical expressions
    if (expr.source === 'expressionGroup') {
      return expr.returnType || 'number';
    }
    return expr.returnType || 'number'; // Default to number instead of text
  };

  const updateFirstExpression = (newExpression) => {
    handleChange({ firstExpression: newExpression });
  };

  const updateAdditionalExpression = (index, updates) => {
    const additionalExpressions = [...(groupData.additionalExpressions || [])];
    additionalExpressions[index] = { ...additionalExpressions[index], ...updates };
    handleChange({ additionalExpressions });
  };

  const addExpression = () => {
    const additionalExpressions = [...(groupData.additionalExpressions || [])];
    additionalExpressions.push({
      operator: '+',
      expression: { 
        source: 'value', 
        returnType: 'number', 
        value: 0 
      }
    });
    handleChange({ additionalExpressions });
  };

  const removeExpression = (index) => {
    const additionalExpressions = [...(groupData.additionalExpressions || [])];
    additionalExpressions.splice(index, 1);
    handleChange({ additionalExpressions });
  };

  const canAddOperators = () => {
    // Only allow operators if first expression is numeric
    const firstType = getExpressionReturnType(groupData.firstExpression);
    return firstType === 'number';
  };

  const hasMultipleExpressions = () => {
    return groupData.additionalExpressions && groupData.additionalExpressions.length > 0;
  };

  const renderCompactView = () => {
    if (!hasMultipleExpressions()) {
      // Single expression - render the child directly without parentheses
      return (
        <ExpressionGroup
          value={groupData.firstExpression}
          onChange={updateFirstExpression}
          config={config}
          expectedType={expectedType}
          darkMode={darkMode}
          compact={true}
        />
      );
    }

    // Multiple expressions - show compact mathematical notation
    const firstSummary = getExpressionSummary(groupData.firstExpression);
    const additionalSummaries = (groupData.additionalExpressions || []).map(ae => 
      `${ae.operator} ${getExpressionSummary(ae.expression)}`
    );

    return (
      <Space size={4} style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(true)}>
        <RightOutlined style={{ fontSize: '10px', color: darkMode ? '#888' : '#666' }} />
        <Text code style={{ fontSize: '12px' }}>
          ({firstSummary} {additionalSummaries.join(' ')})
        </Text>
        <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px' }}>
          {groupData.returnType}
        </Tag>
      </Space>
    );
  };

  const getExpressionSummary = (expr) => {
    if (!expr) return '?';
    
    if (expr.source === 'expressionGroup') {
      if (expr.additionalExpressions && expr.additionalExpressions.length > 0) {
        return '(...)'; // Nested group
      } else {
        return getExpressionSummary(expr.firstExpression);
      }
    }
    
    switch (expr.source) {
      case 'value':
        return expr.value !== undefined ? String(expr.value) : '?';
      case 'field':
        return getFieldDisplayName(expr.field, config?.fields) || '?';
      case 'function':
        return expr.function?.name?.split('.').pop() || 'func';
      default:
        return '?';
    }
  };

  // Memoized expression preview calculation
  const expressionPreview = useMemo(() => {
    // Use the same logic as expanded view for consistency
    const firstSummary = getExpressionSummary(groupData.firstExpression);
    if (!groupData.additionalExpressions?.length) {
      return firstSummary || 'Mathematical Expression';
    }
    
    const additionalSummaries = groupData.additionalExpressions.map(ae => 
      `${ae.operator} ${getExpressionSummary(ae.expression)}`
    );
    
    return `${firstSummary} ${additionalSummaries.join(' ')}`;
  }, [groupData, config?.fields]);

  const renderExpandedView = () => {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Header for multi-expression groups */}
        {hasMultipleExpressions() && (
          <Space size={4} style={{ marginBottom: '4px' }}>
            <Button
              type="text"
              size="small"
              icon={<DownOutlined />}
              onClick={() => setIsExpanded(false)}
              style={{ padding: 0, minWidth: 'auto', color: darkMode ? '#888' : '#666' }}
            />
            <Text 
              type="secondary" 
              style={{ 
                fontSize: '11px',
                fontFamily: 'monospace',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title="Click to expand expression"
            >
              {expressionPreview}
            </Text>
            <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px' }}>
              {groupData.returnType}
            </Tag>
          </Space>
        )}

        {/* First Expression with Add Button */}
        <div style={{ paddingLeft: hasMultipleExpressions() ? '16px' : '0' }}>
          <Space style={{ width: '100%' }} size="small">
            <div style={{ flex: 1 }}>
              <BaseExpression
                value={groupData.firstExpression}
                onChange={updateFirstExpression}
                config={config}
                expectedType={hasMultipleExpressions() ? 'number' : expectedType}
                darkMode={darkMode}
                compact={compact}
              />
            </div>
            
            {/* Add Operation Button */}
            {canAddOperators() && (
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={addExpression}
                style={{ 
                  minWidth: 'auto', 
                  padding: '0 4px',
                  color: darkMode ? '#52c41a' : '#52c41a' // Green color to indicate add action
                }}
                title="Add Operation"
              />
            )}
          </Space>
        </div>

        {/* Additional Expressions with Operators */}
        {(groupData.additionalExpressions || []).map((additionalExpr, index) => (
          <div key={index} style={{ paddingLeft: '16px' }}>
            <Space style={{ width: '100%' }} size="small">
              {/* Operator */}
              <Select
                value={additionalExpr.operator}
                onChange={(op) => updateAdditionalExpression(index, { operator: op })}
                style={{ width: '50px' }}
                size="small"
                options={[
                  { value: '+', label: '+' },
                  { value: '-', label: '-' },
                  { value: '*', label: '*' },
                  { value: '/', label: '/' }
                ]}
              />
              
              {/* Expression */}
              <div style={{ flex: 1 }}>
                <ExpressionGroup
                  value={additionalExpr.expression}
                  onChange={(expr) => updateAdditionalExpression(index, { expression: expr })}
                  config={config}
                  expectedType="number"
                  darkMode={darkMode}
                  compact={compact}
                />
              </div>

              {/* Remove Button */}
              <Button
                type="text"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => removeExpression(index)}
                style={{ minWidth: 'auto', padding: '0 4px' }}
                title="Remove Operation"
              />
            </Space>
          </div>
        ))}

        {/* Type Warning */}
        {!canAddOperators() && groupData.additionalExpressions?.length > 0 && (
          <div style={{ paddingLeft: '16px' }}>
            <Text type="warning" style={{ fontSize: '11px' }}>
              ⚠ Mathematical operations require numeric expressions
            </Text>
          </div>
        )}
      </Space>
    );
  };

  // For single expressions in compact mode, render without the group wrapper
  if (compact && !hasMultipleExpressions()) {
    return (
      <BaseExpression
        value={groupData.firstExpression}
        onChange={updateFirstExpression}
        config={config}
        expectedType={expectedType}
        darkMode={darkMode}
        compact={compact}
      />
    );
  }

  return (
    <div style={{ 
      width: '100%',
      padding: '8px',
      borderRadius: '6px',
      backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
    }}
    >
      {isExpanded ? renderExpandedView() : renderCompactView()}
    </div>
  );
};

/**
 * BaseExpression Component
 * 
 * Handles the basic expression types: value, field, function
 * This is what used to be the core of the Expression component
 */
const BaseExpression = ({ value, onChange, config, expectedType, darkMode = false, compact = false }) => {
  const [source, setSource] = useState(value?.source || 'value');
  const [expressionData, setExpressionData] = useState(value || { 
    source: 'value', 
    returnType: expectedType || 'number', 
    value: expectedType === 'number' || !expectedType ? 0 : '' 
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isUpdatingFromProps = useRef(false);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      isUpdatingFromProps.current = true;
      setSource(value.source || 'value');
      setExpressionData(value);
      setTimeout(() => {
        isUpdatingFromProps.current = false;
      }, 0);
    }
  }, [value]);

  // Notify parent of changes (only if not updating from props)
  useEffect(() => {
    if (onChange && !isUpdatingFromProps.current) {
      onChange(expressionData);
    }
  }, [expressionData]);

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    let newData;
    
    if (newSource === 'value') {
      newData = { 
        source: 'value', 
        returnType: expectedType || 'number', 
        value: expectedType === 'number' || !expectedType ? 0 : '' 
      };
    } else if (newSource === 'field') {
      newData = { 
        source: 'field', 
        returnType: expectedType || 'number', 
        field: null 
      };
    } else if (newSource === 'function') {
      newData = { 
        source: 'function', 
        returnType: expectedType || 'number', 
        function: { name: null, args: [] } 
      };
    }
    
    setExpressionData(newData);
  };

  const handleValueChange = (updates) => {
    const newData = { ...expressionData, ...updates };
    setExpressionData(newData);
    // Propagate change to parent
    if (onChange) {
      onChange(newData);
    }
  };

  // Source selector options
  const sourceOptions = [
    { 
      value: 'value', 
      label: 'Value', 
      icon: <NumberOutlined style={{ fontSize: '12px' }} /> 
    },
    { 
      value: 'field', 
      label: 'Field', 
      icon: <FieldTimeOutlined style={{ fontSize: '12px' }} /> 
    },
    { 
      value: 'function', 
      label: 'Function', 
      icon: <FunctionOutlined style={{ fontSize: '12px' }} /> 
    }
  ];

  const renderSourceSelector = () => {
    return (
      <Select
        value={source}
        onChange={handleSourceChange}
        style={{ width: isDropdownOpen ? 100 : 50, minWidth: 50, transition: 'width 0.2s' }}
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
            {option.data.icon}
            <span>{option.data.label}</span>
          </Space>
        )}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
    );
  };

  const renderValueInput = () => {
    const returnType = expressionData.returnType || 'text';
    
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
    // Build tree data from config fields
    const buildFieldTree = (fields, parentPath = '') => {
      const treeData = [];
      
      Object.keys(fields).forEach(key => {
        const field = fields[key];
        const fullPath = parentPath ? `${parentPath}.${key}` : key;
        
        if (field.type === '!struct' && field.subfields) {
          // Group node
          treeData.push({
            title: field.label || key,
            value: fullPath,
            key: fullPath,
            selectable: false,
            children: buildFieldTree(field.subfields, fullPath)
          });
        } else {
          // Leaf field - filter by expected type if provided
          if (!expectedType || field.type === expectedType || expectedType === 'text') {
            treeData.push({
              title: field.label || key,
              value: fullPath,
              key: fullPath,
              isLeaf: true
            });
          }
        }
      });
      
      return treeData;
    };

    const fieldTree = config?.fields ? buildFieldTree(config.fields) : [];

    return (
      <TreeSelect
        value={expressionData.field}
        onChange={(field) => {
          const fieldDef = getFieldDefinition(field, config?.fields);
          handleValueChange({ 
            field, 
            returnType: fieldDef?.type || expectedType || 'text' 
          });
        }}
        treeData={fieldTree}
        placeholder="Select field"
        style={{ width: '100%', minWidth: '200px' }}
        dropdownClassName="compact-tree-select"
        treeIcon={false}
        showSearch
        treeDefaultExpandAll={true}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
    );
  };

  const renderFunctionSelector = () => {
    // Build tree data from config functions
    const buildFunctionTree = (funcs, parentPath = '') => {
      const treeData = [];
      
      Object.keys(funcs).forEach(key => {
        const func = funcs[key];
        const fullPath = parentPath ? `${parentPath}.${key}` : key;
        
        if (func.type === '!struct' && func.subfields) {
          // Function group
          treeData.push({
            title: func.label || key,
            value: fullPath,
            key: fullPath,
            selectable: false,
            children: buildFunctionTree(func.subfields, fullPath)
          });
        } else {
          // Function - filter by expected type if provided
          if (!expectedType || func.returnType === expectedType || expectedType === 'text') {
            treeData.push({
              title: func.label || key,
              value: fullPath,
              key: fullPath
            });
          }
        }
      });
      
      return treeData;
    };

    const functionTree = config?.funcs ? buildFunctionTree(config.funcs) : [];

    return (
      <TreeSelect
        value={expressionData.function?.name}
        onChange={(funcName) => {
          const funcDef = getFunctionDefinition(funcName, config?.funcs);
          if (funcDef) {
            let args = [];
            
            if (funcDef.dynamicArgs) {
              // Handle dynamic args (like ADD function)
              const minArgs = funcDef.dynamicArgs.minArgs || 2;
              for (let i = 0; i < minArgs; i++) {
                args.push({
                  name: `arg${i + 1}`,
                  value: { 
                    source: 'expressionGroup',
                    returnType: funcDef.dynamicArgs.argType || 'text',
                    firstExpression: {
                      source: 'value', 
                      returnType: funcDef.dynamicArgs.argType || 'text', 
                      value: funcDef.dynamicArgs.defaultValue || '' 
                    },
                    additionalExpressions: []
                  }
                });
              }
            } else if (funcDef.args) {
              // Handle static args (regular functions)
              args = Object.keys(funcDef.args).map(argName => ({
                name: argName,
                value: { 
                  source: 'expressionGroup',
                  returnType: funcDef.args[argName].type || 'text',
                  firstExpression: {
                    source: 'value', 
                    returnType: funcDef.args[argName].type || 'text', 
                    value: '' 
                  },
                  additionalExpressions: []
                }
              }));
            }
            
            handleValueChange({ 
              function: { name: funcName, args },
              returnType: funcDef.returnType || expectedType || 'text'
            });
          }
        }}
        treeData={functionTree}
        placeholder="Select function"
        style={{ width: '100%', minWidth: '200px' }}
        dropdownClassName="compact-tree-select"
        treeIcon={false}
        showSearch
        treeDefaultExpandAll={true}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
    );
  };

  const renderCompactFunction = () => {
    if (!expressionData.function?.name) return null;

    const funcDef = getFunctionDefinition(expressionData.function.name, config?.funcs);
    if (!funcDef || !expressionData.function.args) return null;

    // Create a compact representation of the function call
    const getCompactArgValue = (arg) => {
      if (!arg.value) return '?';
      
      if (arg.value.source === 'value') {
        return arg.value.value !== undefined ? String(arg.value.value) : '?';
      } else if (arg.value.source === 'field') {
        return getFieldDisplayName(arg.value.field, config?.fields) || '?';
      } else if (arg.value.source === 'function') {
        const innerFuncName = arg.value.function?.name?.split('.').pop() || '?';
        return `${innerFuncName}(...)`;
      } else if (arg.value.source === 'expressionGroup') {
        // Handle ExpressionGroup - show compact representation
        if (arg.value.additionalExpressions?.length > 0) {
          return '(...)'; // Complex expression
        } else if (arg.value.firstExpression) {
          return getCompactArgValue({ value: arg.value.firstExpression });
        }
      }
      return '?';
    };

    const functionName = expressionData.function.name.split('.').pop();
    const argsStr = expressionData.function.args.map(getCompactArgValue).join(', ');

    return (
      <div 
        style={{ 
          padding: '8px 12px',
          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '13px',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
        }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text 
            style={{ 
              color: darkMode ? '#e0e0e0' : '#333',
              cursor: 'pointer'
            }}
            onClick={() => setIsExpanded(true)}
            title="Click to expand and edit function"
          >
            {functionName}({argsStr})
          </Text>
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            onClick={() => setIsExpanded(true)}
            style={{ 
              padding: '0 4px', 
              color: darkMode ? '#e0e0e0' : 'inherit',
              minWidth: 'auto'
            }}
            title="Expand function"
          />
        </Space>
      </div>
    );
  };

  const renderFunctionArgs = () => {
    if (!expressionData.function?.name) return null;

    const funcDef = getFunctionDefinition(expressionData.function.name, config?.funcs);
    if (!funcDef) return null;

    // Ensure args exist, initialize if needed
    if (!expressionData.function.args || expressionData.function.args.length === 0) {
      let args = [];
      
      if (funcDef.dynamicArgs) {
        // Handle dynamic args (like ADD function)
        const minArgs = funcDef.dynamicArgs.minArgs || 2;
        for (let i = 0; i < minArgs; i++) {
          args.push({
            name: `arg${i + 1}`,
            value: { 
              source: 'expressionGroup',
              returnType: funcDef.dynamicArgs.argType || 'text',
              firstExpression: {
                source: 'value', 
                returnType: funcDef.dynamicArgs.argType || 'text', 
                value: funcDef.dynamicArgs.defaultValue || '' 
              },
              additionalExpressions: []
            }
          });
        }
      } else if (funcDef.args) {
        // Handle static args (regular functions)
        args = Object.keys(funcDef.args).map(argName => ({
          name: argName,
          value: { 
            source: 'expressionGroup',
            returnType: funcDef.args[argName].type || 'text',
            firstExpression: {
              source: 'value', 
              returnType: funcDef.args[argName].type || 'text', 
              value: '' 
            },
            additionalExpressions: []
          }
        }));
      }
      
      // Update the function with proper args
      handleValueChange({ 
        function: { name: expressionData.function.name, args },
        returnType: funcDef.returnType || expectedType || 'text'
      });
      return null; // Will re-render after update
    }

    return (
      <Card
        size="small"
        title={
          <Space>
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{ padding: 0, color: darkMode ? '#e0e0e0' : 'inherit' }}
            />
            <div 
              style={{ 
                padding: '6px 8px',
                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
              title="Click to expand function"
            >
              <Text 
                style={{ 
                  color: darkMode ? '#e0e0e0' : '#333',
                  fontSize: '12px'
                }}
              >
              {(() => {
                // Generate collapsed function view for header
                const getCompactArgValue = (arg) => {
                  if (!arg.value) return '?';
                  
                  if (arg.value.source === 'value') {
                    return arg.value.value !== undefined ? String(arg.value.value) : '?';
                  } else if (arg.value.source === 'field') {
                    return getFieldDisplayName(arg.value.field, config?.fields) || '?';
                  } else if (arg.value.source === 'function') {
                    const innerFuncName = arg.value.function?.name?.split('.').pop() || '?';
                    return `${innerFuncName}(...)`;
                  } else if (arg.value.source === 'expressionGroup') {
                    // Handle ExpressionGroup - show compact representation
                    if (arg.value.additionalExpressions?.length > 0) {
                      return '(...)'; // Complex expression
                    } else if (arg.value.firstExpression) {
                      return getCompactArgValue({ value: arg.value.firstExpression });
                    }
                  }
                  return '?';
                };

                const functionName = expressionData.function.name.split('.').pop();
                const argsStr = expressionData.function.args.map(getCompactArgValue).join(', ');
                return `${functionName}(${argsStr})`;
              })()}
              </Text>
            </div>
          </Space>
        }
        style={{
          background: darkMode ? '#2a2a2a' : '#fafafa',
          border: `1px solid ${darkMode ? '#555555' : '#d9d9d9'}`
        }}
      >
        {isExpanded && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {expressionData.function.args.map((arg, index) => {
              // Handle both dynamic and static args
              const argDef = funcDef.args?.[arg.name] || (funcDef.dynamicArgs ? {
                type: funcDef.dynamicArgs.argType,
                label: `Argument ${index + 1}`
              } : null);
              
              return (
                <div key={index} style={{ 
                  paddingLeft: '12px', 
                  borderLeft: darkMode ? '2px solid #555555' : '2px solid #d9d9d9' 
                }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {argDef?.label || arg.name}
                          {argDef?.type && (
                            <Tag color="blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                              {argDef.type}
                            </Tag>
                          )}
                        </Text>
                      </Space>
                      {/* Remove argument button for dynamic args */}
                      {funcDef.dynamicArgs && expressionData.function.args.length > (funcDef.dynamicArgs.minArgs || 2) && (
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedArgs = [...expressionData.function.args];
                            updatedArgs.splice(index, 1);
                            // Rename remaining args to maintain sequence
                            const renamedArgs = updatedArgs.map((arg, idx) => ({
                              ...arg,
                              name: `arg${idx + 1}`
                            }));
                            handleValueChange({ function: { ...expressionData.function, args: renamedArgs } });
                          }}
                          title="Remove argument"
                          style={{ padding: '0 4px' }}
                        />
                      )}
                    </Space>
                    <ExpressionGroup
                      value={arg.value}
                      onChange={(newValue) => {
                        const updatedArgs = [...expressionData.function.args];
                        updatedArgs[index] = { ...arg, value: newValue };
                        handleValueChange({ 
                          function: { ...expressionData.function, args: updatedArgs } 
                        });
                      }}
                      config={config}
                      expectedType={argDef?.type}
                      darkMode={darkMode}
                      compact={true}
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
                      source: 'expressionGroup',
                      returnType: funcDef.dynamicArgs.argType || 'text',
                      firstExpression: {
                        source: 'value', 
                        returnType: funcDef.dynamicArgs.argType || 'text',
                        value: funcDef.dynamicArgs.defaultValue ?? ''
                      },
                      additionalExpressions: []
                    }
                  });
                  handleValueChange({ function: { ...expressionData.function, args: newArgs } });
                }}
                style={{ width: '100%', marginTop: '8px' }}
              >
                Add Argument
              </Button>
            )}
          </Space>
        )}
      </Card>
    );
  };

  return (
    <div style={{
      padding: '6px',
      borderRadius: '4px',
      backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}`,
    }}>
      <Space style={{ width: '100%' }} size="small">
        {/* Source Selector */}
        {renderSourceSelector()}
        
        {/* Value Input based on source */}
        <div style={{ flex: 1 }}>
          {source === 'value' && renderValueInput()}
          {source === 'field' && renderFieldSelector()}
          {source === 'function' && (
            expressionData.function?.name && !isExpanded ? (
              // Show compact function view when collapsed
              renderCompactFunction()
            ) : (
              // Show full function editing interface when expanded or no function selected
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {renderFunctionSelector()}
                {/* Show function arguments only when expanded and function is selected */}
                {expressionData.function?.name && renderFunctionArgs()}
              </Space>
            )
          )}
        </div>
      </Space>
    </div>
  );
};

// Helper functions
// Helper function to get field display name from field path
const getFieldDisplayName = (fieldPath, fields) => {
  if (!fieldPath || !fields) return fieldPath || '?';
  
  const pathParts = fieldPath.split('.');
  let currentFields = fields;
  let displayName = '';
  
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    const field = currentFields[part];
    
    if (!field) return fieldPath; // Fallback to original path
    
    if (i > 0) displayName += ' > ';
    displayName += field.label || part;
    
    if (field.subfields) {
      currentFields = field.subfields;
    }
  }
  
  return displayName;
};

const getFieldDefinition = (fieldPath, fields) => {
  if (!fields || !fieldPath) return null;
  
  const parts = fieldPath.split('.');
  let current = fields;
  
  for (const part of parts) {
    if (current[part]) {
      if (current[part].type === '!struct') {
        current = current[part].subfields;
      } else {
        return current[part];
      }
    } else {
      return null;
    }
  }
  
  return null;
};

const getFunctionDefinition = (funcPath, funcs) => {
  if (!funcs || !funcPath) return null;
  
  const parts = funcPath.split('.');
  let current = funcs;
  
  for (const part of parts) {
    if (current[part]) {
      if (current[part].type === '!struct') {
        current = current[part].subfields;
      } else {
        return current[part];
      }
    } else {
      return null;
    }
  }
  
  return null;
};

export default ExpressionGroup;