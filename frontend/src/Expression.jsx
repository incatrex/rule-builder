import React, { useState, useEffect } from 'react';
import { Space, Select, Input, InputNumber, DatePicker, Switch, TreeSelect, Card, Typography, Button } from 'antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined, PlusOutlined, CloseOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Text } = Typography;

/**
 * Expression Component
 * 
 * A clean component for building expressions following the new rule structure.
 * Generates JSON matching: <expression returnType="number|text|date|boolean" source="value|field|function">
 * 
 * Structure:
 * - value: { source: 'value', returnType: 'text', value: 'hello' }
 * - field: { source: 'field', returnType: 'text', field: 'TABLE1.TEXT_FIELD_01' }
 * - function: { source: 'function', returnType: 'number', name: 'MATH.ADD', args: [...] }
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

  // Build tree data from hierarchical functions
  const buildFuncTreeData = (funcsObj, parentKey = '') => {
    if (!funcsObj) return [];
    
    const treeData = [];
    Object.keys(funcsObj).forEach(key => {
      const func = funcsObj[key];
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      
      if (func.type === '!struct' && func.subfields) {
        treeData.push({
          title: func.label || key,
          value: fullKey,
          selectable: false,
          children: buildFuncTreeData(func.subfields, fullKey)
        });
      } else {
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

  const renderSourceSelector = () => (
    <Select
      value={source}
      onChange={handleSourceChange}
      size="small"
      style={{ width: compact ? 50 : 100 }}
    >
      <Select.Option value="value">
        <Space size={4}>
          <NumberOutlined />
          {!compact && <span>Value</span>}
        </Space>
      </Select.Option>
      <Select.Option value="field">
        <Space size={4}>
          <FieldTimeOutlined />
          {!compact && <span>Field</span>}
        </Space>
      </Select.Option>
      <Select.Option value="function">
        <Space size={4}>
          <FunctionOutlined />
          {!compact && <span>Function</span>}
        </Space>
      </Select.Option>
    </Select>
  );

  const renderValueInput = () => {
    const returnType = expressionData.returnType || 'text';
    
    switch (returnType) {
      case 'number':
        return (
          <InputNumber
            value={expressionData.value}
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
            value={expressionData.value}
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
        value={expressionData.field}
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
        dropdownClassName="compact-tree-select"
        treeIcon={false}
        showSearch
        treeDefaultExpandAll
      />
    );
  };

  const renderFunctionBuilder = () => {
    const funcTreeData = buildFuncTreeData(config?.funcs || {});
    const funcDef = getFuncDef(expressionData.name);
    
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
            value={expressionData.name}
            onChange={(funcPath) => {
              const funcDef = getFuncDef(funcPath);
              // Initialize args array based on function definition
              const initialArgs = funcDef?.args 
                ? Object.keys(funcDef.args).map(argKey => ({
                    name: argKey,
                    value: { 
                      source: 'value', 
                      returnType: funcDef.args[argKey].type || 'text',
                      value: ''
                    }
                  }))
                : [];
              
              handleValueChange({ 
                name: funcPath,
                returnType: funcDef?.returnType || expectedType || 'text',
                args: initialArgs
              });
            }}
            treeData={funcTreeData}
            placeholder="Select function"
            style={{ width: '100%' }}
            showSearch
            treeDefaultExpandAll
            dropdownClassName="compact-tree-select"
            treeIcon={false}
          />

          {/* Function arguments */}
          {funcDef && expressionData.args && expressionData.args.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <Button
                    type="text"
                    size="small"
                    icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                    onClick={() => setIsExpanded(!isExpanded)}
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
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {expressionData.args.map((arg, index) => {
                    const argDef = funcDef.args[arg.name];
                    return (
                      <div key={index}>
                        <Text 
                          strong 
                          style={{ 
                            display: 'block', 
                            marginBottom: '4px',
                            color: darkMode ? '#e0e0e0' : 'inherit'
                          }}
                        >
                          {argDef?.label || arg.name}:
                        </Text>
                        <Expression
                          value={arg.value}
                          onChange={(newValue) => {
                            const updatedArgs = [...expressionData.args];
                            updatedArgs[index] = { ...arg, value: newValue };
                            handleValueChange({ args: updatedArgs });
                          }}
                          config={config}
                          expectedType={argDef?.type}
                          darkMode={darkMode}
                          compact
                        />
                      </div>
                    );
                  })}
                </Space>
              )}
            </Card>
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
      </div>
    </Space.Compact>
  );
};

export default Expression;
