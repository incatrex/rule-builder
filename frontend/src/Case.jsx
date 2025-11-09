import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Typography, Collapse, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import ConditionGroup from './ConditionGroup';
import ExpressionGroup from './ExpressionGroup';

const { Text } = Typography;
const { Panel } = Collapse;

/**
 * Case Component
 * 
 * Represents a CASE expression with multiple WHEN/THEN clauses and an ELSE clause.
 * Follows structure: <case>:
 *   [
 *     <when>:<conditionGroup>,
 *     <then>:<expression>
 *   ],
 *   <elseClause>:<expression>
 * 
 * Props:
 * - value: Case object { whenClauses: [{ when, then, resultName }], elseClause, elseResultName }
 * - onChange: Callback when case changes
 * - config: Config with operators, fields, funcs
 * - darkMode: Dark mode styling
 */
const Case = ({ value, onChange, config, darkMode = false }) => {
  const [caseData, setCaseData] = useState(value || {
    whenClauses: [],
    elseClause: { 
      source: 'expressionGroup',
      returnType: 'number',
      firstExpression: { source: 'value', returnType: 'number', value: '' },
      additionalExpressions: []
    },
    elseResultName: 'Default'
  });
  const [editingElseResultName, setEditingElseResultName] = useState(false);
  const [activeKeys, setActiveKeys] = useState([]);
  const [elseExpanded, setElseExpanded] = useState(true); // UI state only
  const [editingStates, setEditingStates] = useState({}); // Track editing state for each clause
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (value) {
      setCaseData(value);
      // Only auto-expand on initial load, not on subsequent updates
      if (isInitialLoad.current && value.whenClauses && value.whenClauses.length > 0) {
        const keys = value.whenClauses.map((_, index) => String(index));
        setActiveKeys(keys);
        isInitialLoad.current = false;
      }
    }
  }, [value]);

  const handleChange = (updates) => {
    const updated = { ...caseData, ...updates };
    setCaseData(updated);
    
    // Remove UI-only properties but keep the internal structure intact for components
    const { elseExpanded: _, ...cleanData } = updated;
    
    // Pass the data through without transformation for internal component use
    // JSON transformation should only happen at final export stage
    onChange(cleanData);
  };

  const addWhenClause = () => {
    const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newWhen = {
      when: {
        type: 'conditionGroup',
        id: generateId(),
        returnType: 'boolean',
        name: `Condition ${caseData.whenClauses.length + 1}`,
        conjunction: 'AND',
        not: false,
        conditions: [
          // Auto-add an empty condition to the new group
          {
            type: 'condition',
            id: generateId(),
            returnType: 'boolean',
            name: 'Condition 1',
            left: { 
              source: 'expressionGroup',
              returnType: 'number',
              firstExpression: { source: 'field', returnType: 'number', field: null },
              additionalExpressions: []
            },
            operator: null,
            right: { 
              source: 'expressionGroup',
              returnType: 'number',
              firstExpression: { source: 'value', returnType: 'number', value: '' },
              additionalExpressions: []
            }
          }
        ]
      },
      then: {
        source: 'expressionGroup',
        returnType: 'number',
        firstExpression: { source: 'value', returnType: 'number', value: '' },
        additionalExpressions: []
      },
      resultName: `Result ${caseData.whenClauses.length + 1}`
    };
    handleChange({ whenClauses: [...caseData.whenClauses, newWhen] });
    setActiveKeys([...activeKeys, String(caseData.whenClauses.length)]);
  };

  const removeWhenClause = (index) => {
    const updatedClauses = caseData.whenClauses.filter((_, i) => i !== index);
    handleChange({ whenClauses: updatedClauses });
  };

  const updateWhenClause = (index, updates) => {
    const updatedClauses = [...caseData.whenClauses];
    updatedClauses[index] = { ...updatedClauses[index], ...updates };
    handleChange({ whenClauses: updatedClauses });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* WHEN Clauses */}
        <Collapse 
          activeKey={activeKeys} 
          onChange={setActiveKeys}
          style={{ marginBottom: '16px' }}
        >
          {caseData.whenClauses.map((clause, index) => {
            const isExpanded = activeKeys.includes(String(index));
            
            return (
            <Panel
              key={String(index)}
              header={
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Text strong>WHEN</Text>
                    {editingStates[`${index}_name`] ? (
                      <Input
                        size="small"
                        value={clause.when?.name || `Condition ${index + 1}`}
                        onChange={(e) => updateWhenClause(index, { when: { ...clause.when, name: e.target.value } })}
                        onPressEnter={() => setEditingStates(prev => ({ ...prev, [`${index}_name`]: false }))}
                        onBlur={() => setEditingStates(prev => ({ ...prev, [`${index}_name`]: false }))}
                        autoFocus
                        style={{ width: '200px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <Text code>{clause.when?.name || `Condition ${index + 1}`}</Text>
                        <EditOutlined 
                          style={{ fontSize: '12px', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStates(prev => ({ ...prev, [`${index}_name`]: true }));
                          }}
                        />
                      </>
                    )}
                    {!isExpanded && (
                      <>
                        <Text strong style={{ marginLeft: '16px' }}>THEN</Text>
                        {editingStates[`${index}_result`] ? (
                          <Input
                            size="small"
                            value={clause.resultName || `Result ${index + 1}`}
                            onChange={(e) => updateWhenClause(index, { resultName: e.target.value })}
                            onPressEnter={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                            onBlur={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                            autoFocus
                            style={{ width: '150px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <Text code>{clause.resultName || `Result ${index + 1}`}</Text>
                            <EditOutlined 
                              style={{ fontSize: '12px', cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStates(prev => ({ ...prev, [`${index}_result`]: true }));
                              }}
                            />
                          </>
                        )}
                      </>
                    )}
                  </Space>
                </Space>
              }
              extra={
                <DeleteOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWhenClause(index);
                  }}
                  style={{ color: 'red' }}
                />
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Condition Group */}
                <div style={{ 
                  padding: '16px', 
                  background: darkMode ? '#2a2a2a' : '#f9f9f9',
                  borderRadius: '4px'
                }}>
                  <ConditionGroup
                    value={clause.when}
                    onChange={(newWhen) => updateWhenClause(index, { when: newWhen })}
                    config={config}
                    darkMode={darkMode}
                  />
                </div>

                {/* THEN Result */}
                <div>
                  <Space style={{ marginBottom: '8px' }}>
                    <Text strong>THEN</Text>
                    {editingStates[`${index}_result`] ? (
                      <Input
                        size="small"
                        value={clause.resultName || `Result ${index + 1}`}
                        onChange={(e) => updateWhenClause(index, { resultName: e.target.value })}
                        onPressEnter={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                        onBlur={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                        autoFocus
                        style={{ width: '150px' }}
                      />
                    ) : (
                      <>
                        <Text code>{clause.resultName || `Result ${index + 1}`}</Text>
                        <EditOutlined 
                          style={{ fontSize: '12px', cursor: 'pointer' }}
                          onClick={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: true }))}
                        />
                      </>
                    )}
                    <Text strong>:</Text>
                  </Space>
                  <ExpressionGroup
                    value={clause.then}
                    onChange={(newThen) => updateWhenClause(index, { then: newThen })}
                    config={config}
                    darkMode={darkMode}
                  />
                </div>
              </Space>
            </Panel>
            );
          })}
        </Collapse>

        {/* Add WHEN Button */}
        <Button 
          type="dashed" 
          onClick={addWhenClause} 
          icon={<PlusOutlined />}
          block
        >
          Add WHEN Clause
        </Button>

        {/* ELSE Clause */}
        <Collapse 
          activeKey={elseExpanded ? ['else'] : []} 
          onChange={(keys) => setElseExpanded(keys.includes('else'))}
        >
          <Panel
            key="else"
            header={
              <Space>
                <Text strong>ELSE</Text>
                {editingElseResultName ? (
                  <Input
                    size="small"
                    value={caseData.elseResultName || 'Default'}
                    onChange={(e) => handleChange({ elseResultName: e.target.value })}
                    onPressEnter={() => setEditingElseResultName(false)}
                    onBlur={() => setEditingElseResultName(false)}
                    autoFocus
                    style={{ width: '150px' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <Text code>{caseData.elseResultName || 'Default'}</Text>
                    <EditOutlined 
                      style={{ fontSize: '12px', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingElseResultName(true);
                      }}
                    />
                  </>
                )}
              </Space>
            }
          >
            <ExpressionGroup
              value={caseData.elseClause}
              onChange={(newElse) => handleChange({ elseClause: newElse })}
              config={config}
              darkMode={darkMode}
            />
          </Panel>
        </Collapse>
      </Space>
  );
};

export default Case;
