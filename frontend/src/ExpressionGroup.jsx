import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Space, Select, Input, InputNumber, DatePicker, Switch, TreeSelect, Card, Typography, Button, Tag, Alert } from 'antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined, PlusOutlined, CloseOutlined, DownOutlined, RightOutlined, LinkOutlined } from '@ant-design/icons';
import moment from 'moment';
import RuleSelector from './RuleSelector';
import Expression from './Expression';

const { Text } = Typography;

/**
 * ExpressionGroup Component
 * 
 * Replaces the Expression component with support for operations.
 * Every expression is now an ExpressionGroup that can contain:
 * - A single expression (simple case)
 * - Multiple expressions connected by operators (expression operations)
 * 
 * JSON Structure (NEW SCHEMA):
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
 * Expression (leaf expressions):
 * - value: { type: 'value', returnType: 'text', value: 'hello' }
 * - field: { type: 'field', returnType: 'text', field: 'TABLE1.TEXT_FIELD_01' }
 * - function: { type: 'function', returnType: 'number', name: 'MATH.ADD', args: [...] }
 * 
 * Props:
 * - value: Current expression group object
 * - onChange: Callback when expression group changes
 * - config: Config with operators, fields, functions
 * - expectedType: Expected return type for filtering (text, number, date, boolean)
 * - darkMode: Dark mode styling
 * - compact: Compact mode
 */
const ExpressionGroup = ({ value, onChange, config, expectedType, darkMode = false, compact = false, isLoadedRule = false, allowedSources = null, argDef: propArgDef = null }) => {
  const [isExpanded, setIsExpanded] = useState(!isLoadedRule);
  const [operatorDropdownStates, setOperatorDropdownStates] = useState({});
  
  // Update expansion state when isLoadedRule changes
  useEffect(() => {
    if (isLoadedRule) {
      setIsExpanded(false); // Collapse when rule is loaded
    }
  }, [isLoadedRule]);
  
  // Validate that this is a proper multi-expression ExpressionGroup
  const validateExpressionGroup = (val) => {
    
    if (!val || val.type !== 'expressionGroup') {
      throw new Error('ExpressionGroup component requires data with type="expressionGroup"');
    }
    
    if (!val.expressions || val.expressions.length < 2) {
      throw new Error('ExpressionGroup component requires 2 or more expressions. Use Expression component for single expressions.');
    }
    
    return val;
  };
  
  const [groupData, setGroupData] = useState(() => validateExpressionGroup(value));
  const isUpdatingFromProps = useRef(false);

  // Sync with external changes
  useEffect(() => {
    if (value) {
      isUpdatingFromProps.current = true;
      setGroupData(validateExpressionGroup(value));
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
    // If we have operators, determine result type based on operator type
    if (data.operators && data.operators.length > 0) {
      const hasNumericalOperators = data.operators.some(op => 
        ['+', '-', '*', '/'].includes(op)
      );
      if (hasNumericalOperators) {
        return 'number';
      }
    }
    
    // Start with first expression's return type, but default to number for numeric operations
    let type = data.expressions && data.expressions.length > 0 
      ? getExpressionReturnType(data.expressions[0]) 
      : 'number';
    
    // Don't override text types - only default to number if no type is specified
    // (Removed the line that was forcing text to number)
    
    return type;
  };

  const getExpressionReturnType = (expr) => {
    if (!expr) return 'number'; // Default to number for numeric operations
    if (expr.type === 'expressionGroup') {
      return expr.returnType || 'number';
    }
    return expr.returnType || 'number'; // Default to number instead of text
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
    
    // Add operator before the new expression (if not the first)
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

  const canAddOperators = () => {
    // Allow operators for supported types (numeric, text, date, boolean)
    const firstType = groupData.expressions && groupData.expressions.length > 0
      ? getExpressionReturnType(groupData.expressions[0])
      : 'number';
    return ['number', 'text', 'date', 'boolean'].includes(firstType);
  };

  const hasMultipleExpressions = () => {
    return groupData.expressions && groupData.expressions.length > 1;
  };

  const renderCompactView = () => {
    // ExpressionGroup always has multiple expressions - show compact operation notation
    const expressionSummaries = (groupData.expressions || []).map((expr, index) => {
      const summary = getExpressionSummary(expr);
      let operator = '';
      if (index > 0 && groupData.operators?.[index - 1]) {
        // Extract just the operator symbol for compact view
        const operatorSymbol = groupData.operators[index - 1].split(' ')[0];
        operator = ` ${operatorSymbol} `;
      }
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

  const getExpressionSummary = (expr) => {
    if (!expr) return '?';
    
    if (expr.type === 'expressionGroup') {
      if (expr.expressions && expr.expressions.length > 1) {
        // Build compact representation for nested group
        const nestedSummaries = expr.expressions.map((nestedExpr, index) => {
          const summary = getExpressionSummary(nestedExpr);
          let operator = '';
          if (index > 0 && expr.operators?.[index - 1]) {
            const operatorSymbol = expr.operators[index - 1].split(' ')[0];
            operator = ` ${operatorSymbol} `;
          }
          return operator + summary;
        });
        return `(${nestedSummaries.join('')})`;
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

  // Memoized expression preview calculation
  const expressionPreview = useMemo(() => {
    // Use the same logic as expanded view for consistency
    if (!groupData.expressions || groupData.expressions.length === 0) {
      return 'Expression Operations';
    }
    
    const summaries = groupData.expressions.map((expr, index) => {
      const summary = getExpressionSummary(expr);
      if (index === 0) return summary;
      // Extract just the operator symbol for preview
      const fullOperator = groupData.operators?.[index - 1] || '+';
      const operatorSymbol = fullOperator.split(' ')[0];
      return `${operatorSymbol} ${summary}`;
    });
    
    return summaries.join(' ');
  }, [groupData, config?.fields]);

  const renderExpandedView = () => {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Header - ExpressionGroup always has multiple expressions */}
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
            title="Click to collapse expression group"
          >
            {expressionPreview}
          </Text>
          <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px' }}>
            {groupData.returnType}
          </Tag>
        </Space>

        {/* First Expression with Add Button */}
        <div style={{ paddingLeft: '16px' }}>
          <Space style={{ width: '100%' }} size="small">
            <div style={{ flex: 1 }}>
              <Expression
                value={groupData.expressions?.[0]}
                onChange={(value) => updateExpression(0, value)}
                config={config}
                expectedType="number"
                allowedSources={allowedSources}
                darkMode={darkMode}
                compact={compact}
                isLoadedRule={isLoadedRule}
                propArgDef={propArgDef}
                disableOperations={true}  // Disable operations since ExpressionGroup handles them
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
        {(groupData.expressions || []).slice(1).map((expr, index) => {
          const actualIndex = index + 1; // Since we're starting from slice(1)
          
          // Determine operator options based on expression type
          const firstType = getExpressionReturnType(groupData.expressions[0]);
          const operatorOptions = getOperatorOptions(firstType, config);
          const isOperatorDropdownOpen = operatorDropdownStates[index] || false;
          
          return (
            <div key={actualIndex} style={{ paddingLeft: '16px' }}>
              <Space style={{ width: '100%' }} size="small">
                {/* Operator */}
                <Select
                  value={groupData.operators?.[index] || '+'}
                  onChange={(op) => updateOperator(index, op)}
                  style={{ 
                    width: isOperatorDropdownOpen ? '140px' : '50px', 
                    minWidth: '50px',
                    transition: 'width 0.2s'
                  }}
                  size="small"
                  options={operatorOptions}
                  onDropdownVisibleChange={(open) => {
                    setOperatorDropdownStates(prev => ({ ...prev, [index]: open }));
                  }}
                  labelRender={(props) => {
                    // When closed, show only the operator symbol
                    // When open, show full label
                    const option = operatorOptions.find(opt => opt.value === props.value);
                    return isOperatorDropdownOpen ? (
                      <span>{option?.label || props.value}</span>
                    ) : (
                      <span style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        {props.value}
                      </span>
                    );
                  }}
                  optionRender={(option) => (
                    // When dropdown is open, show full descriptive label
                    <span>{option.label}</span>
                  )}
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

        {/* Type Warning */}
        {!canAddOperators() && (
          <div style={{ paddingLeft: '16px' }}>
            <Text type="warning" style={{ fontSize: '11px' }}>
              ⚠ Operations require compatible expression types
            </Text>
          </div>
        )}
      </Space>
    );
  };

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

// Helper function to get available operators based on return type from config
const getOperatorOptions = (returnType, config) => {
  // Operators must come from config.expressionOperators filtered by validExpressionOperators
  if (!config?.expressionOperators) {
    console.error(`No expressionOperators found in config`);
    return [];
  }
  
  // Check if the type has validExpressionOperators defined
  if (!config?.types?.[returnType]?.validExpressionOperators) {
    console.error(`No validExpressionOperators found for type: ${returnType}`);
    return [];
  }
  
  const validOps = config.types[returnType].validExpressionOperators;
  
  return validOps
    .filter(key => config.expressionOperators[key]) // Make sure operator exists
    .map(key => {
      const op = config.expressionOperators[key];
      return {
        value: op.symbol,
        label: `${op.symbol} (${op.label})`
      };
    });
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

const getFunctionDefinition = (funcPath, functions) => {
  if (!functions || !funcPath) return null;
  
  const parts = funcPath.split('.');
  let current = functions;
  
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

export default ExpressionGroup;