import React, { useState, useEffect } from 'react';
import { Space, Select, Input, InputNumber, DatePicker, Switch, TreeSelect, Card, Typography, Button, Tag, Alert } from 'antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined, PlusOutlined, CloseOutlined, DownOutlined, RightOutlined, LinkOutlined } from '@ant-design/icons';
import moment from 'moment';
import RuleSelector from './RuleSelector';

const { Text } = Typography;

/**
 * Expression Component
 * 
 * A unified component for building expressions with mathematical operation support.
 * Can handle both simple expressions and mathematical operations.
 * 
 * Simple Expression Structure:
 * - value: { type: 'value', returnType: 'text', value: 'hello' }
 * - field: { type: 'field', returnType: 'text', field: 'TABLE1.TEXT_FIELD_01' }
 * - function: { type: 'function', returnType: 'number', function: { name: 'MATH.ADD', args: [...] } }
 * - ruleRef: { type: 'ruleRef', returnType: 'boolean', id: 'RULE_ID', uuid: 'abc-123', version: 1 }
 * 
 * Mathematical Expression Structure:
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
 * - config: Config with operators, fields, funcs
 * - expectedType: Expected return type for filtering (text, number, date, boolean)
 * - darkMode: Dark mode styling
 * - compact: Compact mode
 * - propArgDef: Custom argument definition for dropdowns
 * - isLoadedRule: Whether this is a loaded rule (affects expansion state)
 * - allowedSources: Allowed value sources for filtering
 */
const Expression = ({ value, onChange, config, expectedType, propArgDef = null, darkMode = false, compact = false, isLoadedRule = false, allowedSources = null }) => {
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
  const [isExpanded, setIsExpanded] = useState(!isLoadedRule);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Update expansion state when isLoadedRule changes
  useEffect(() => {
    if (isLoadedRule) {
      setIsExpanded(false); // Collapse when rule is loaded
    }
  }, [isLoadedRule]);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      const normalized = normalizeValue(value);
      setSource(normalized.type || 'value');
      setExpressionData(normalized);
    }
  }, [value]);

  // Handle mathematical expression groups
  if (expressionData.type === 'expressionGroup') {
    return (
      <ExpressionGroupRenderer 
        value={expressionData}
        onChange={onChange}
        config={config}
        expectedType={expectedType}
        darkMode={darkMode}
        compact={compact}
        isLoadedRule={isLoadedRule}
        allowedSources={allowedSources}
        propArgDef={propArgDef}
      />
    );
  }

  // Check if we can add mathematical operators
  const canAddOperators = () => {
    const currentType = expressionData.returnType || expectedType;
    return currentType === 'number' || currentType === 'text';
  };

  // Create mathematical expression group
  const createMathExpression = () => {
    const mathGroup = {
      type: 'expressionGroup',
      returnType: expressionData.returnType || 'number',
      expressions: [expressionData, { 
        type: 'value', 
        returnType: expressionData.returnType || 'number', 
        value: expressionData.returnType === 'text' ? '' : 0 
      }],
      operators: ['+']
    };
    setExpressionData(mathGroup);
    if (onChange) {
      onChange(mathGroup);
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
  const buildFuncTreeData = (funcsObj, parentKey = '') => {
    if (!funcsObj) return [];
    
    const treeData = [];
    Object.keys(funcsObj).forEach(key => {
      const func = funcsObj[key];
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
    if (!funcPath || !config?.funcs) return null;
    
    const parts = funcPath.split('.');
    let current = config.funcs;
    
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
    // Read available sources from config or use defaults
    const availableSources = config?.settings?.defaultValueSources || ['value', 'field', 'function', 'ruleRef'];
    
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
    const funcTreeData = buildFuncTreeData(config?.funcs || {});
    const funcDef = getFuncDef(expressionData.function?.name);
    
    return (
      <Card
        size="small"
        style={{
          background: darkMode ? '#2a2a2a' : '#fafafa',
          border: `1px solid ${darkMode ? '#555555' : '#d9d9d9'}`
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Function selector */}
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
                // Handle fixed args
                initialArgs = Object.keys(funcDef.args).map(argKey => ({
                  name: argKey,
                  value: { 
                    type: 'value', 
                    returnType: funcDef.args[argKey].type || 'text',
                    value: funcDef.args[argKey].defaultValue ?? ''
                  }
                }));
              }
              
              handleValueChange({ 
                returnType: funcDef?.returnType || expectedType || 'text',
                function: {
                  name: funcPath,
                  args: initialArgs
                }
              });
            }}
            treeData={funcTreeData}
            placeholder="Select function"
            style={{ width: '100%' }}
            showSearch
            treeDefaultExpandAll
            popupClassName="compact-tree-select"
            treeIcon={false}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />

          {/* Function arguments */}
          {funcDef && expressionData.function?.args && expressionData.function.args.length > 0 && (
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
                  <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>
                    Arguments
                  </Text>
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
                    const isDynamicArgs = funcDef?.dynamicArgs;
                    const argDef = isDynamicArgs ? null : funcDef.args[arg.name];
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
                            compact
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
              )}
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
                  returnType: expectedType || 'boolean'
                });
                return;
              }
              
              const { metadata } = selection;
              handleValueChange({
                id: metadata.ruleId,
                uuid: metadata.uuid,
                version: metadata.version,
                returnType: metadata.returnType
              });
            }}
            darkMode={darkMode}
            placeholder="Select a rule..."
            showReturnType={true}
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
    <Space.Compact style={{ width: '100%' }}>
      {renderSourceSelector()}
      <div style={{ flex: 1, marginLeft: '8px' }}>
        <Space style={{ width: '100%' }} size="small">
          <div style={{ flex: 1 }}>
            {source === 'value' && renderValueInput()}
            {source === 'field' && renderFieldSelector()}
            {source === 'function' && renderFunctionBuilder()}
            {source === 'ruleRef' && renderRuleSelector()}
          </div>
          {/* Add Mathematical Operation Button */}
          {canAddOperators() && !compact && (
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={createMathExpression}
              style={{ 
                minWidth: 'auto', 
                padding: '0 4px',
                color: darkMode ? '#52c41a' : '#52c41a' // Green color to indicate add action
              }}
              title="Add Mathematical Operation"
            />
          )}
        </Space>
      </div>
    </Space.Compact>
  );
};

/**
 * ExpressionGroupRenderer Component
 * 
 * Renders mathematical expression groups with operators between expressions
 */
const ExpressionGroupRenderer = ({ value, onChange, config, expectedType, darkMode = false, compact = false, isLoadedRule = false, allowedSources = null, propArgDef = null }) => {
  const [groupData, setGroupData] = useState(value || {
    type: 'expressionGroup',
    returnType: expectedType || 'number',
    expressions: [{ type: 'value', returnType: expectedType || 'number', value: '' }],
    operators: []
  });
  const [isExpanded, setIsExpanded] = useState(!isLoadedRule);

  // Update expansion state when isLoadedRule changes
  useEffect(() => {
    if (isLoadedRule) {
      setIsExpanded(false);
    }
  }, [isLoadedRule]);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      setGroupData(value);
    }
  }, [value]);

  // Notify parent of changes
  const handleChange = (updates) => {
    const newData = { ...groupData, ...updates };
    
    // Auto-infer return type from expressions
    const inferredType = inferReturnType(newData);
    if (inferredType) {
      newData.returnType = inferredType;
    }
    
    setGroupData(newData);
    if (onChange) {
      onChange(newData);
    }
  };

  const inferReturnType = (data) => {
    // If we have mathematical operators, result should be number
    if (data.operators && data.operators.length > 0) {
      const hasNumericalOperators = data.operators.some(op => 
        ['+', '-', '*', '/'].includes(op)
      );
      if (hasNumericalOperators) {
        return 'number';
      }
    }
    
    // Start with first expression's return type
    let type = data.expressions && data.expressions.length > 0 
      ? getExpressionReturnType(data.expressions[0]) 
      : 'number';
    
    return type;
  };

  const getExpressionReturnType = (expr) => {
    if (!expr) return 'number';
    if (expr.type === 'expressionGroup') {
      return expr.returnType || 'number';
    }
    return expr.returnType || 'number';
  };

  const updateExpression = (index, newExpression) => {
    const expressions = [...(groupData.expressions || [])];
    expressions[index] = newExpression;
    handleChange({ expressions });
  };

  const updateOperator = (index, newOperator) => {
    const operators = [...(groupData.operators || [])];
    operators[index] = newOperator;
    handleChange({ operators });
  };

  const addExpression = () => {
    const expressions = [...(groupData.expressions || [])];
    const operators = [...(groupData.operators || [])];
    
    // Determine the type from existing expressions
    const existingType = expressions.length > 0 
      ? getExpressionReturnType(expressions[0])
      : 'number';
    
    // Add new expression matching the existing type
    expressions.push({ 
      type: 'value', 
      returnType: existingType, 
      value: existingType === 'text' ? '' : 0 
    });
    
    // Add operator before the new expression
    if (expressions.length > 1) {
      operators.push('+');
    }
    
    handleChange({ expressions, operators });
  };

  const removeExpression = (index) => {
    const expressions = [...(groupData.expressions || [])];
    const operators = [...(groupData.operators || [])];
    
    expressions.splice(index, 1);
    
    // Remove corresponding operator
    if (index > 0) {
      operators.splice(index - 1, 1);
    } else if (operators.length > 0) {
      operators.splice(0, 1);
    }
    
    handleChange({ expressions, operators });
  };

  const hasMultipleExpressions = () => {
    return groupData.expressions && groupData.expressions.length > 1;
  };

  const canAddOperators = () => {
    const firstType = groupData.expressions && groupData.expressions.length > 0
      ? getExpressionReturnType(groupData.expressions[0])
      : 'number';
    return firstType === 'number' || firstType === 'text';
  };

  // Get expression summary for compact view
  const getExpressionSummary = (expr) => {
    if (!expr) return '?';
    
    if (expr.type === 'expressionGroup') {
      if (expr.expressions && expr.expressions.length > 1) {
        return '(...)'; // Nested group
      } else if (expr.expressions && expr.expressions.length === 1) {
        return getExpressionSummary(expr.expressions[0]);
      }
      return '?';
    }
    
    switch (expr.type) {
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

  const renderCompactView = () => {
    if (!hasMultipleExpressions()) {
      // Single expression - render the child directly
      return (
        <Expression
          value={groupData.expressions?.[0]}
          onChange={(value) => updateExpression(0, value)}
          config={config}
          expectedType={expectedType}
          allowedSources={allowedSources}
          darkMode={darkMode}
          compact={true}
          isLoadedRule={isLoadedRule}
          propArgDef={propArgDef}
        />
      );
    }

    // Multiple expressions - show compact mathematical notation
    const expressionSummaries = (groupData.expressions || []).map((expr, index) => {
      const summary = getExpressionSummary(expr);
      const operator = index > 0 && groupData.operators?.[index - 1] 
        ? ` ${groupData.operators[index - 1]} ` 
        : '';
      return operator + summary;
    });

    return (
      <Space size={4} style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(true)}>
        <RightOutlined style={{ fontSize: '10px', color: darkMode ? '#888' : '#666' }} />
        <Text code style={{ fontSize: '12px' }}>
          ({expressionSummaries.join('')})
        </Text>
        <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px' }}>
          {groupData.returnType}
        </Tag>
      </Space>
    );
  };

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
            >
              Mathematical Expression
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
              <Expression
                value={groupData.expressions?.[0]}
                onChange={(value) => updateExpression(0, value)}
                config={config}
                expectedType={hasMultipleExpressions() ? 'number' : expectedType}
                allowedSources={allowedSources}
                darkMode={darkMode}
                compact={compact}
                isLoadedRule={isLoadedRule}
                propArgDef={propArgDef}
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
                  color: darkMode ? '#52c41a' : '#52c41a'
                }}
                title="Add Operation"
              />
            )}
          </Space>
        </div>

        {/* Additional Expressions with Operators */}
        {(groupData.expressions || []).slice(1).map((expr, index) => {
          const actualIndex = index + 1;
          
          // Determine operator options based on expression type
          const firstType = getExpressionReturnType(groupData.expressions[0]);
          const operatorOptions = firstType === 'text' 
            ? [{ value: '+', label: '+' }] // Only concatenation for text
            : [
                { value: '+', label: '+' },
                { value: '-', label: '-' },
                { value: '*', label: '*' },
                { value: '/', label: '/' }
              ];
          
          return (
            <div key={actualIndex} style={{ paddingLeft: '16px' }}>
              <Space style={{ width: '100%' }} size="small">
                {/* Operator */}
                <Select
                  value={groupData.operators?.[index] || '+'}
                  onChange={(op) => updateOperator(index, op)}
                  style={{ width: '50px' }}
                  size="small"
                  options={operatorOptions}
                />
                
                {/* Expression */}
                <div style={{ flex: 1 }}>
                  <Expression
                    value={expr}
                    onChange={(value) => updateExpression(actualIndex, value)}
                    config={config}
                    expectedType="number"
                    allowedSources={allowedSources}
                    darkMode={darkMode}
                    compact={compact}
                    isLoadedRule={isLoadedRule}
                    propArgDef={propArgDef}
                  />
                </div>

                {/* Remove Button */}
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => removeExpression(actualIndex)}
                  style={{ minWidth: 'auto', padding: '0 4px' }}
                  title="Remove Operation"
                />
              </Space>
            </div>
          );
        })}
      </Space>
    );
  };

  // For single expressions in compact mode, render without the group wrapper
  if (compact && !hasMultipleExpressions()) {
    const firstExpression = groupData.expressions?.[0];
    
    return (
      <Expression
        value={firstExpression}
        onChange={(value) => updateExpression(0, value)}
        config={config}
        expectedType={expectedType}
        allowedSources={allowedSources}
        darkMode={darkMode}
        compact={compact}
        isLoadedRule={isLoadedRule}
        propArgDef={propArgDef}
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

/**
 * Factory function to create a new empty ExpressionGroup structure
 * This ensures the structure is defined in one place
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
