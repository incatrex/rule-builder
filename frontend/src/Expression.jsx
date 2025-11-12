import React, { useState, useEffect } from 'react';
import { Space, Select, Input, InputNumber, DatePicker, Switch, TreeSelect, Card, Typography, Button, Tag, Alert } from 'antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined, PlusOutlined, CloseOutlined, DownOutlined, RightOutlined, LinkOutlined } from '@ant-design/icons';
import moment from 'moment';
import RuleSelector from './RuleSelector';

const { Text } = Typography;

/**
 * Expression Component
 * 
 * A clean component for building expressions following the new rule structure.
 * Generates JSON matching: <expression returnType="number|text|date|boolean" source="value|field|function|ruleRef">
 * 
 * Structure:
 * - value: { source: 'value', returnType: 'text', value: 'hello' }
 * - field: { source: 'field', returnType: 'text', field: 'TABLE1.TEXT_FIELD_01' }
 * - function: { source: 'function', returnType: 'number', name: 'MATH.ADD', args: [...] }
 * - ruleRef: { source: 'ruleRef', returnType: 'boolean', id: 'RULE_ID', uuid: 'abc-123', version: 1 }
 * 
 * Props:
 * - value: Current expression object
 * - onChange: Callback when expression changes
 * - config: Config with operators, fields, funcs
 * - expectedType: Expected return type for filtering (text, number, date, boolean)
 * - darkMode: Dark mode styling
 * - compact: Compact mode
 */
const Expression = ({ value, onChange, config, expectedType, darkMode = false, compact = false }) => {
  const [source, setSource] = useState(value?.source || 'value');
  const [expressionData, setExpressionData] = useState(value || { source: 'value', returnType: expectedType || 'text', value: '' });
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      setSource(value.source || 'value');
      setExpressionData(value);
    }
  }, [value]);

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    let newData;
    
    if (newSource === 'value') {
      newData = { 
        source: 'value', 
        returnType: expectedType || 'text', 
        value: '' 
      };
    } else if (newSource === 'field') {
      newData = { 
        source: 'field', 
        returnType: expectedType || 'text',
        field: null 
      };
    } else if (newSource === 'function') {
      newData = { 
        source: 'function', 
        returnType: expectedType || 'text',
        name: null, 
        args: [] 
      };
    } else if (newSource === 'ruleRef') {
      newData = { 
        source: 'ruleRef', 
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
    const sourceOptions = [
      { label: 'Value', value: 'value', icon: <NumberOutlined /> },
      { label: 'Field', value: 'field', icon: <FieldTimeOutlined /> },
      { label: 'Function', value: 'function', icon: <FunctionOutlined /> },
      { label: 'Rule', value: 'ruleRef', icon: <LinkOutlined /> }
    ];
    
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
                      source: 'value', 
                      returnType: funcDef.dynamicArgs.argType || 'text',
                      value: funcDef.dynamicArgs.defaultValue ?? ''
                    }
                  });
                }
              } else if (funcDef?.args) {
                // Handle fixed args
                initialArgs = Object.keys(funcDef.args).map(argKey => ({
                  name: argKey,
                  value: { 
                    source: 'value', 
                    returnType: funcDef.args[argKey].type || 'text',
                    value: ''
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
                    const expectedArgType = isDynamicArgs ? funcDef.dynamicArgs.argType : argDef?.type;
                    
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
                            darkMode={darkMode}
                            compact
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
                            source: 'value', 
                            returnType: funcDef.dynamicArgs.argType || 'text',
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
        {source === 'value' && renderValueInput()}
        {source === 'field' && renderFieldSelector()}
        {source === 'function' && renderFunctionBuilder()}
        {source === 'ruleRef' && renderRuleSelector()}
      </div>
    </Space.Compact>
  );
};

export default Expression;
