import React, { useState } from 'react';
import { Space, TreeSelect, Card, Typography, Tag, Button } from 'antd';
import { DownOutlined, RightOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import FunctionArgument from './FunctionArgument';
import CustomFunctionModal from './CustomFunctionModal';

const { Text } = Typography;

/**
 * Function Component
 * 
 * Renders a function builder with function selector and argument editors.
 * Supports both fixed and dynamic argument functions.
 * 
 * Props:
 * - value: Current expression data
 * - onChange: Callback when expression changes
 * - config: Config object with functions
 * - darkMode: Dark mode styling
 * - expansionPath: Path for expansion state tracking
 * - isExpanded: Expansion state checker
 * - onToggleExpansion: Toggle expansion callback
 * - expanded: Whether this function is expanded
 * - expectedType: Expected return type
 * - isNew: Whether this is a new rule
 */
const Function = ({
  value,
  onChange,
  config,
  darkMode = false,
  expansionPath,
  isExpanded,
  onToggleExpansion,
  expanded,
  expectedType,
  isNew
}) => {
  // Helper: Build tree data from hierarchical functions
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

  // Helper: Get function definition by path
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

  // Helper: Get field display name
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

  // Helper: Get function summary for collapsed view
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

  const funcTreeData = buildFuncTreeData(config?.functions || {});
  const funcDef = getFuncDef(value.function?.name);

  // State for custom UI modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle value changes
  const handleValueChange = (updates) => {
    const updated = { ...value, ...updates };
    onChange(updated);
  };

  // Handle function selection
  const handleFunctionSelect = (funcPath) => {
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
            returnType: funcDef.dynamicArgs.type || funcDef.dynamicArgs.argType || 'text',
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
  };

  // Handle argument value change
  const handleArgChange = (index, newValue) => {
    const updatedArgs = [...value.function.args];
    updatedArgs[index] = { ...updatedArgs[index], value: newValue };
    handleValueChange({ function: { ...value.function, args: updatedArgs } });
  };

  // Handle argument removal
  const handleArgRemove = (index) => {
    const updatedArgs = [...value.function.args];
    updatedArgs.splice(index, 1);
    handleValueChange({ function: { ...value.function, args: updatedArgs } });
  };

  // Handle add argument
  const handleAddArg = () => {
    const newArgs = [...value.function.args];
    newArgs.push({
      name: `arg${newArgs.length + 1}`,
      value: { 
        type: 'value', 
        returnType: funcDef.dynamicArgs.type || funcDef.dynamicArgs.argType || 'text',
        value: funcDef.dynamicArgs.defaultValue ?? ''
      }
    });
    handleValueChange({ function: { ...value.function, args: newArgs } });
  };

  // Handle custom UI modal save
  const handleModalSave = (argValues) => {
    // Convert argValues object to args array
    const argsArray = Object.keys(argValues).map(argName => ({
      name: argName,
      value: argValues[argName]
    }));
    
    handleValueChange({ function: { ...value.function, args: argsArray } });
    setIsModalOpen(false);
  };

  // Get initial values for modal from existing args
  const getModalInitialValues = () => {
    if (!value.function?.args) return {};
    
    const initialValues = {};
    value.function.args.forEach(arg => {
      initialValues[arg.name] = arg.value;
    });
    return initialValues;
  };

  // Render collapsed view when not expanded and function has args
  if (!expanded && funcDef && value.function?.args && value.function.args.length > 0) {
    return (
      <Space size={4} style={{ cursor: 'pointer' }} onClick={() => onToggleExpansion(expansionPath)}>
        <RightOutlined style={{ fontSize: '10px', color: darkMode ? '#888' : '#666' }} />
        <Text code style={{ fontSize: '12px' }}>
          {getFunctionSummary(value.function)}
        </Text>
        <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px' }}>
          {value.returnType || 'unknown'}
        </Tag>
      </Space>
    );
  }

  // Render expanded view
  return (
    <Card
      size="small"
      style={{
        background: darkMode ? '#2a2a2a' : '#fafafa',
        border: `1px solid ${darkMode ? '#555555' : '#d9d9d9'}`
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Function selector with collapse button and return type */}
        <Space size={4} style={{ width: '100%' }}>
          {funcDef && value.function?.args && value.function.args.length > 0 && (
            <Button
              type="text"
              size="small"
              icon={expanded ? <DownOutlined /> : <RightOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpansion(expansionPath);
              }}
              style={{ padding: 0, color: darkMode ? '#e0e0e0' : 'inherit', flexShrink: 0 }}
            />
          )}
          <TreeSelect
            value={value.function?.name || null}
            onChange={handleFunctionSelect}
            treeData={funcTreeData}
            placeholder="Select function"
            style={{ flex: 1 }}
            showSearch
            treeDefaultExpandAll
            popupClassName="compact-tree-select"
            treeIcon={false}
            popupMatchSelectWidth={false}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
          {funcDef && (
            <>
              {funcDef.customUI && (
                <Button
                  type="primary"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                  data-testid="configure-arguments-button"
                >
                  Configure Arguments
                </Button>
              )}
              <Text type="secondary" style={{ fontSize: '11px', margin: 0 }}>
                Returns:
              </Text>
              <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px', margin: 0 }}>
                {value.returnType || 'unknown'}
              </Tag>
            </>
          )}
        </Space>

        {/* Function arguments */}
        {funcDef && !funcDef.customUI && value.function?.args && value.function.args.length > 0 && expanded && (
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
              {value.function.args.map((arg, index) => {
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
                
                const canRemove = isDynamicArgs && 
                  value.function.args.length > (funcDef.dynamicArgs.minArgs || 2);
                
                return (
                  <FunctionArgument
                    key={index}
                    arg={arg}
                    argDef={argDef}
                    isDynamicArgs={isDynamicArgs}
                    index={index}
                    canRemove={canRemove}
                    onRemove={() => handleArgRemove(index)}
                    onChange={(newValue) => handleArgChange(index, newValue)}
                    config={config}
                    darkMode={darkMode}
                    expansionPath={expansionPath}
                    isExpanded={isExpanded}
                    onToggleExpansion={onToggleExpansion}
                    isNew={isNew}
                  />
                );
              })}
              
              {/* Add argument button for dynamic args */}
              {funcDef?.dynamicArgs && (!funcDef.dynamicArgs.maxArgs || 
                value.function.args.length < funcDef.dynamicArgs.maxArgs) && (
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddArg();
                  }}
                  style={{ width: '100%' }}
                >
                  Add Argument
                </Button>
              )}
            </Space>
          </Card>
        )}

        {/* Custom UI Modal */}
        {funcDef?.customUI && (
          <CustomFunctionModal
            open={isModalOpen}
            funcDef={funcDef}
            initialValues={getModalInitialValues()}
            config={config}
            darkMode={darkMode}
            onSave={handleModalSave}
            onCancel={() => setIsModalOpen(false)}
          />
        )}
      </Space>
    </Card>
  );
};

export default Function;
