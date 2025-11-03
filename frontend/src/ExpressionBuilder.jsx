import React, { useState, useEffect } from 'react';
import { Space, Select, Input, InputNumber, DatePicker, Switch, TreeSelect, Card, Typography, Tag, Button } from 'antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined, DownOutlined, RightOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Text } = Typography;

/**
 * ExpressionBuilder - A reusable component for building expressions with values, fields, and functions
 * 
 * This component provides a comprehensive UI for building complex expressions that can include:
 * - Direct values (text, number, date, boolean)
 * - Field references (from hierarchical field structure)
 * - Function calls (with nested expressions as arguments)
 * 
 * Key Features:
 * - Supports unlimited nesting depth for functions
 * - Type-aware widgets (text input, number input, date picker, boolean switch)
 * - Hierarchical TreeSelect for fields and functions
 * - Each function argument is itself an ExpressionBuilder (recursive)
 * - Compatible with standard config structure (operators, fields, funcs)
 * 
 * Usage Example:
 * ```jsx
 * <ExpressionBuilder
 *   value={expressionValue}
 *   onChange={(newValue) => setExpressionValue(newValue)}
 *   config={customConfig}
 *   expectedType="number"  // Optional: filter fields/funcs by type
 *   compact={false}        // Optional: compact mode
 * />
 * ```
 * 
 * Value Structure Examples:
 * 
 * 1. Simple value:
 *    { type: 'value', valueType: 'text', value: 'hello' }
 *    { type: 'value', valueType: 'number', value: 42 }
 * 
 * 2. Field reference:
 *    { type: 'field', value: 'TABLE1.TEXT_FIELD_01' }
 * 
 * 3. Function call:
 *    {
 *      type: 'func',
 *      func: 'TEXT.CONCAT',
 *      args: {
 *        text1: { type: 'value', valueType: 'text', value: 'Hello' },
 *        text2: { type: 'field', value: 'TABLE1.TEXT_FIELD_01' }
 *      }
 *    }
 * 
 * 4. Nested function:
 *    {
 *      type: 'func',
 *      func: 'MATH.ADD',
 *      args: {
 *        num1: { type: 'value', valueType: 'number', value: 10 },
 *        num2: {
 *          type: 'func',
 *          func: 'MATH.ROUND',
 *          args: {
 *            number: { type: 'field', value: 'TABLE1.NUMBER_FIELD_01' },
 *            decimals: { type: 'value', valueType: 'number', value: 2 }
 *          }
 *        }
 *      }
 *    }
 * 
 * @param {Object} value - Current expression value { type: 'value'|'field'|'func', ... }
 * @param {Function} onChange - Callback when expression changes
 * @param {Object} config - Config object with fields and funcs
 * @param {string} expectedType - Expected return type (text, number, date, boolean) for type validation
 * @param {boolean} compact - Compact mode with smaller type selector
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
const ExpressionBuilder = ({ value, onChange, config, expectedType, compact = false, darkMode = false }) => {
  const [expressionType, setExpressionType] = useState(value?.type || 'value');
  const [expressionData, setExpressionData] = useState(value || { type: 'value', valueType: 'text', value: '' });
  const [isExpanded, setIsExpanded] = useState(true); // For collapsing functions

  // Sync with external value changes
  useEffect(() => {
    if (value) {
      setExpressionType(value.type || 'value');
      setExpressionData(value);
    }
  }, [value]);

  const handleTypeChange = (type) => {
    setExpressionType(type);
    let newData;
    
    if (type === 'value') {
      newData = { 
        type: 'value', 
        valueType: expectedType || 'text', 
        value: '' 
      };
    } else if (type === 'field') {
      newData = { 
        type: 'field', 
        value: null 
      };
    } else if (type === 'func') {
      newData = { 
        type: 'func', 
        func: null, 
        args: {} 
      };
    }
    
    setExpressionData(newData);
    onChange(newData);
  };

  const handleValueChange = (newValue) => {
    const updated = { ...expressionData, ...newValue };
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
        // Parent node (not selectable)
        treeData.push({
          title: field.label || key,
          value: fullKey,
          selectable: false,
          children: buildFieldTreeData(field.subfields, fullKey)
        });
      } else {
        // Leaf field (selectable) - optionally filter by expectedType
        if (!expectedType || field.type === expectedType) {
          treeData.push({
            title: field.label || key,
            value: fullKey,
            type: field.type
          });
        } else if (!expectedType) {
          // Include all if no type filter
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

  // Build tree data from hierarchical functions
  const buildFuncTreeData = (funcsObj, parentKey = '') => {
    if (!funcsObj) return [];
    
    const treeData = [];
    Object.keys(funcsObj).forEach(key => {
      const func = funcsObj[key];
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      
      if (func.type === '!struct' && func.subfields) {
        // Parent node (not selectable)
        treeData.push({
          title: func.label || key,
          value: fullKey,
          selectable: false,
          children: buildFuncTreeData(func.subfields, fullKey)
        });
      } else {
        // Leaf function (selectable) - optionally filter by expectedType (returnType)
        if (!expectedType || func.returnType === expectedType) {
          treeData.push({
            title: func.label || key,
            value: fullKey,
            returnType: func.returnType
          });
        } else if (!expectedType) {
          // Include all if no type filter
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

  // Get function definition by path (e.g., "TEXT.CONCAT")
  const getFuncDef = (funcPath) => {
    if (!funcPath || !config?.funcs) return null;
    
    const parts = funcPath.split('.');
    let current = config.funcs;
    
    for (const part of parts) {
      if (!current[part]) return null;
      current = current[part];
      
      // Navigate through !struct subfields
      if (current.type === '!struct' && current.subfields) {
        current = current.subfields;
      }
    }
    
    return current;
  };

  // Get field label by path
  const getFieldLabel = (fieldPath) => {
    if (!fieldPath || !config?.fields) return fieldPath;
    
    const parts = fieldPath.split('.');
    let current = config.fields;
    let label = '';
    
    for (const part of parts) {
      if (!current[part]) return fieldPath;
      current = current[part];
      
      if (current.type === '!struct' && current.subfields) {
        current = current.subfields;
      } else {
        label = current.label || part;
      }
    }
    
    return label;
  };

  // Generate text representation of an expression
  const getExpressionText = (expr) => {
    if (!expr) return '';
    
    if (expr.type === 'value') {
      if (expr.value === '' || expr.value === null || expr.value === undefined) {
        return '""';
      }
      return String(expr.value);
    }
    
    if (expr.type === 'field') {
      return getFieldLabel(expr.value);
    }
    
    if (expr.type === 'func') {
      const funcDef = getFuncDef(expr.func);
      if (!funcDef) return expr.func || 'FUNC';
      
      const funcName = funcDef.label || expr.func?.split('.').pop() || 'FUNC';
      
      if (!expr.args || Object.keys(expr.args).length === 0) {
        return `${funcName}()`;
      }
      
      // Handle dynamic args
      if (funcDef.dynamicArgs && expr.args.dynamicArgs) {
        const argTexts = expr.args.dynamicArgs.map(argValue => getExpressionText(argValue));
        return `${funcName}(${argTexts.join(', ')})`;
      }
      
      // Handle standard args
      const argTexts = Object.keys(funcDef.args || {}).map(argKey => {
        const argValue = expr.args[argKey];
        return getExpressionText(argValue);
      });
      
      return `${funcName}(${argTexts.join(', ')})`;
    }
    
    return '';
  };

  // Render value input based on type
  const renderValueWidget = () => {
    const valueType = expressionData.valueType || expectedType || 'text';
    
    switch (valueType) {
      case 'number':
        return (
          <InputNumber
            value={expressionData.value}
            onChange={(val) => handleValueChange({ value: val })}
            placeholder="Enter number"
            style={{ width: '150px' }}
          />
        );
      
      case 'date':
      case 'datetime':
        return (
          <DatePicker
            value={expressionData.value ? moment(expressionData.value) : null}
            onChange={(date) => handleValueChange({ value: date ? date.toISOString() : null })}
            placeholder="Select date"
            showTime={valueType === 'datetime'}
            style={{ width: '200px' }}
          />
        );
      
      case 'boolean':
        return (
          <Space>
            <Switch
              checked={expressionData.value === true || expressionData.value === 'true'}
              onChange={(checked) => handleValueChange({ value: checked })}
            />
            <Text>{expressionData.value ? 'True' : 'False'}</Text>
          </Space>
        );
      
      case 'text':
      default:
        return (
          <Input
            value={expressionData.value}
            onChange={(e) => handleValueChange({ value: e.target.value })}
            placeholder="Enter text"
            style={{ width: '200px' }}
          />
        );
    }
  };

  // Render field selector
  const renderFieldSelector = () => {
    const treeData = buildFieldTreeData(config?.fields);
    
    return (
      <TreeSelect
        value={expressionData.value}
        onChange={(val) => handleValueChange({ value: val })}
        placeholder="Select field"
        style={{ width: '250px' }}
        showSearch
        treeDefaultExpandAll
        filterTreeNode={(input, treeNode) =>
          treeNode.title?.toLowerCase().includes(input.toLowerCase())
        }
        treeData={treeData}
      />
    );
  };

  // Render function selector with arguments
  const renderFunctionSelector = () => {
    const treeData = buildFuncTreeData(config?.funcs);
    const funcDef = getFuncDef(expressionData.func);
    
    // If collapsed, show text representation in an input box
    if (!isExpanded && expressionData.func) {
      const funcText = getExpressionText(expressionData);
      
      return (
        <Space style={{ width: '100%' }}>
          <Input
            value={funcText}
            readOnly
            style={{ width: '300px', fontFamily: 'monospace' }}
            addonBefore={
              <Button
                type="text"
                size="small"
                icon={<RightOutlined />}
                onClick={() => setIsExpanded(true)}
                style={{ padding: '0 4px' }}
              />
            }
          />
        </Space>
      );
    }
    
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Space>
          <TreeSelect
            value={expressionData.func}
            onChange={(funcPath) => {
              const newFuncDef = getFuncDef(funcPath);
              let args = {};
              
              // Check if this function uses dynamic args
              if (newFuncDef?.dynamicArgs) {
                // Initialize with minimum number of dynamic arguments
                const minArgs = newFuncDef.dynamicArgs.minArgs || 2;
                const dynamicArgs = [];
                for (let i = 0; i < minArgs; i++) {
                  dynamicArgs.push({
                    type: 'value',
                    valueType: newFuncDef.dynamicArgs.argType,
                    value: newFuncDef.dynamicArgs.defaultValue ?? ''
                  });
                }
                args = { dynamicArgs };
              } else if (newFuncDef?.args) {
                // Initialize standard args with empty expressions based on arg types
                Object.keys(newFuncDef.args).forEach(argKey => {
                  const argDef = newFuncDef.args[argKey];
                  args[argKey] = {
                    type: 'value',
                    valueType: argDef.type,
                    value: ''
                  };
                });
              }
              
              handleValueChange({ func: funcPath, args });
              setIsExpanded(true); // Expand when function changes
            }}
            placeholder="Select function"
            style={{ width: '250px' }}
            showSearch
            treeDefaultExpandAll
            filterTreeNode={(input, treeNode) =>
              treeNode.title?.toLowerCase().includes(input.toLowerCase())
            }
            treeData={treeData}
          />
          {expressionData.func && funcDef && funcDef.args && (
            <Button
              type="text"
              size="small"
              icon={<DownOutlined />}
              onClick={() => setIsExpanded(false)}
              title="Collapse function"
            />
          )}
        </Space>
        
        {funcDef && funcDef.args && (
          <Card 
            size="small" 
            title={<Text strong style={{ fontSize: '12px' }}>Arguments</Text>}
            style={{ marginTop: '8px', background: darkMode ? '#2a2a2a' : '#fafafa' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Check if this function supports dynamic args */}
              {funcDef.dynamicArgs ? (
                <>
                  {/* Dynamic arguments rendering */}
                  {(expressionData.args?.dynamicArgs || []).map((argValue, index) => (
                    <div key={index} style={{ paddingLeft: '12px', borderLeft: darkMode ? '2px solid #555555' : '2px solid #d9d9d9' }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Arg {index + 1}
                            <Tag color="blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                              {funcDef.dynamicArgs.argType}
                            </Tag>
                          </Text>
                          {/* Remove button - only show if more than minArgs */}
                          {(expressionData.args?.dynamicArgs?.length || 0) > (funcDef.dynamicArgs.minArgs || 1) && (
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<CloseOutlined />}
                              onClick={() => {
                                const newDynamicArgs = [...(expressionData.args?.dynamicArgs || [])];
                                newDynamicArgs.splice(index, 1);
                                handleValueChange({ args: { dynamicArgs: newDynamicArgs } });
                              }}
                              title="Remove argument"
                            />
                          )}
                        </Space>
                        {/* Recursive ExpressionBuilder for each argument */}
                        <ExpressionBuilder
                          value={argValue}
                          onChange={(newArgValue) => {
                            const newDynamicArgs = [...(expressionData.args?.dynamicArgs || [])];
                            newDynamicArgs[index] = newArgValue;
                            handleValueChange({ args: { dynamicArgs: newDynamicArgs } });
                          }}
                          config={config}
                          expectedType={funcDef.dynamicArgs.argType}
                          compact={true}
                          darkMode={darkMode}
                        />
                      </Space>
                    </div>
                  ))}
                  {/* Add argument button */}
                  {(!funcDef.dynamicArgs.maxArgs || 
                    (expressionData.args?.dynamicArgs?.length || 0) < funcDef.dynamicArgs.maxArgs) && (
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const newDynamicArgs = [...(expressionData.args?.dynamicArgs || [])];
                        newDynamicArgs.push({
                          type: 'value',
                          valueType: funcDef.dynamicArgs.argType,
                          value: funcDef.dynamicArgs.defaultValue ?? ''
                        });
                        handleValueChange({ args: { dynamicArgs: newDynamicArgs } });
                      }}
                      style={{ width: '100%' }}
                    >
                      Add Argument
                    </Button>
                  )}
                </>
              ) : (
                /* Standard fixed arguments rendering */
                Object.keys(funcDef.args).map((argKey) => {
                  const argDef = funcDef.args[argKey];
                  const argValue = expressionData.args?.[argKey] || { 
                    type: 'value', 
                    valueType: argDef.type, 
                    value: '' 
                  };
                  
                  return (
                    <div key={argKey} style={{ paddingLeft: '12px', borderLeft: darkMode ? '2px solid #555555' : '2px solid #d9d9d9' }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {argDef.label || argKey}
                          {argDef.type && (
                            <Tag color="blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                              {argDef.type}
                            </Tag>
                          )}
                        </Text>
                        {/* Recursive ExpressionBuilder for each argument */}
                        <ExpressionBuilder
                          value={argValue}
                          onChange={(newArgValue) => {
                            const newArgs = { ...expressionData.args, [argKey]: newArgValue };
                            handleValueChange({ args: newArgs });
                          }}
                          config={config}
                          expectedType={argDef.type}
                          compact={true}
                          darkMode={darkMode}
                        />
                      </Space>
                    </div>
                  );
                })
              )}
            </Space>
          </Card>
        )}
      </Space>
    );
  };

  // Type selector icons
  const getTypeIcon = (type) => {
    switch(type) {
      case 'value': return <NumberOutlined />;
      case 'field': return <FieldTimeOutlined />;
      case 'func': return <FunctionOutlined />;
      default: return null;
    }
  };

  const typeOptions = [
    { label: 'Value', value: 'value', icon: <NumberOutlined /> },
    { label: 'Field', value: 'field', icon: <FieldTimeOutlined /> },
    { label: 'Func', value: 'func', icon: <FunctionOutlined /> }
  ];
  
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  return (
    <Space size="small" style={{ width: '100%', flexWrap: 'wrap' }}>
      {/* Type Selector */}
      <Select
        value={expressionType}
        onChange={handleTypeChange}
        style={{ width: isTypeDropdownOpen ? 100 : 50, minWidth: 50, transition: 'width 0.2s' }}
        size="small"
        onDropdownVisibleChange={setIsTypeDropdownOpen}
        // When closed, show only icon
        labelRender={(props) => {
          const option = typeOptions.find(opt => opt.value === props.value);
          return isTypeDropdownOpen ? (
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
        options={typeOptions}
        optionRender={(option) => (
          <Space size={4}>
            {option.data.icon}
            <span>{option.data.label}</span>
          </Space>
        )}
      />
      
      {/* Expression Widget */}
      <div style={{ flex: 1, minWidth: '200px' }}>
        {expressionType === 'value' && renderValueWidget()}
        {expressionType === 'field' && renderFieldSelector()}
        {expressionType === 'func' && renderFunctionSelector()}
      </div>
    </Space>
  );
};

export default ExpressionBuilder;
