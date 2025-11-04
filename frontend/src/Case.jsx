import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Collapse, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import ConditionGroup from './ConditionGroup';
import Expression from './Expression';

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
    elseClause: { source: 'value', returnType: 'text', value: '' },
    elseResultName: 'Default'
  });
  const [editingElseResultName, setEditingElseResultName] = useState(false);
  const [activeKeys, setActiveKeys] = useState([]);

  useEffect(() => {
    if (value) {
      setCaseData(value);
    }
  }, [value]);

  const handleChange = (updates) => {
    const updated = { ...caseData, ...updates };
    setCaseData(updated);
    onChange(updated);
  };

  const addWhenClause = () => {
    const newWhen = {
      when: {
        type: 'conditionGroup',
        returnType: 'boolean',
        name: `Condition ${caseData.whenClauses.length + 1}`,
        conjunction: 'AND',
        children: [
          // Auto-add an empty condition to the new group
          {
            type: 'condition',
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            returnType: 'boolean',
            name: 'Condition 1',
            left: { source: 'field', returnType: 'text', field: null },
            operator: null,
            right: { source: 'value', returnType: 'text', value: '' }
          }
        ]
      },
      then: {
        source: 'value',
        returnType: 'text',
        value: ''
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
    <Card
      style={{
        background: darkMode ? '#1f1f1f' : '#ffffff',
        border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* WHEN/THEN Clauses */}
        <div>
          <Text 
            strong 
            style={{ 
              display: 'block', 
              marginBottom: '16px',
              fontSize: '16px',
              color: darkMode ? '#e0e0e0' : 'inherit'
            }}
          >
            WHEN/THEN Clauses:
          </Text>
          
          {caseData.whenClauses && caseData.whenClauses.length > 0 ? (
            <Collapse
              activeKey={activeKeys}
              onChange={setActiveKeys}
              style={{ marginBottom: '16px' }}
            >
              {caseData.whenClauses.map((clause, index) => {
                const isExpanded = activeKeys.includes(String(index));
                
                return (
                  <Panel
                    header={
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space size="small">
                          <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>WHEN</Text>
                          <Text code>{clause.when?.name || `Condition ${index + 1}`}</Text>
                          {!isExpanded && (
                            <>
                              <Text strong style={{ marginLeft: '16px', color: darkMode ? '#e0e0e0' : 'inherit' }}>THEN</Text>
                              {clause.editingResultName ? (
                                <Input
                                  size="small"
                                  value={clause.resultName || `Result ${index + 1}`}
                                  onChange={(e) => updateWhenClause(index, { resultName: e.target.value })}
                                  onPressEnter={() => updateWhenClause(index, { editingResultName: false })}
                                  onBlur={() => updateWhenClause(index, { editingResultName: false })}
                                  autoFocus
                                  style={{ width: '150px' }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <>
                                  <Text code>{clause.resultName || `Result ${index + 1}`}</Text>
                                  <EditOutlined 
                                    style={{ fontSize: '12px', cursor: 'pointer', color: darkMode ? '#b0b0b0' : '#8c8c8c' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateWhenClause(index, { editingResultName: true });
                                    }}
                                  />
                                </>
                              )}
                            </>
                          )}
                        </Space>
                      </Space>
                    }
                    key={String(index)}
                    style={{
                      background: darkMode ? '#2a2a2a' : '#fafafa',
                      marginBottom: '8px'
                    }}
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
                      {/* WHEN Condition */}
                      <div>
                        <Text 
                          strong 
                          style={{ 
                            display: 'block', 
                            marginBottom: '8px',
                            color: darkMode ? '#e0e0e0' : 'inherit'
                          }}
                        >
                          WHEN (Condition):
                        </Text>
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
                          <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>THEN</Text>
                          {clause.editingResultName ? (
                            <Input
                              size="small"
                              value={clause.resultName || `Result ${index + 1}`}
                              onChange={(e) => updateWhenClause(index, { resultName: e.target.value })}
                              onPressEnter={() => updateWhenClause(index, { editingResultName: false })}
                              onBlur={() => updateWhenClause(index, { editingResultName: false })}
                              autoFocus
                              style={{ width: '150px' }}
                            />
                          ) : (
                            <>
                              <Text code>{clause.resultName || `Result ${index + 1}`}</Text>
                              <EditOutlined 
                                style={{ fontSize: '12px', cursor: 'pointer', color: darkMode ? '#b0b0b0' : '#8c8c8c' }}
                                onClick={() => updateWhenClause(index, { editingResultName: true })}
                              />
                            </>
                          )}
                          <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>:</Text>
                        </Space>
                        <Expression
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
          ) : (
            <Text 
              type="secondary" 
              style={{ 
                display: 'block', 
                textAlign: 'center',
                padding: '16px',
                color: darkMode ? '#888888' : '#999999'
              }}
            >
              No WHEN/THEN clauses yet. Add one below.
            </Text>
          )}

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addWhenClause}
            block
          >
            Add WHEN/THEN Clause
          </Button>
        </div>

        {/* ELSE Clause */}
        <div>
          <Space style={{ marginBottom: '8px' }}>
            <Text 
              strong 
              style={{ 
                fontSize: '16px',
                color: darkMode ? '#e0e0e0' : 'inherit'
              }}
            >
              ELSE
            </Text>
            {editingElseResultName ? (
              <Input
                size="small"
                value={caseData.elseResultName || 'Default'}
                onChange={(e) => handleChange({ elseResultName: e.target.value })}
                onPressEnter={() => setEditingElseResultName(false)}
                onBlur={() => setEditingElseResultName(false)}
                autoFocus
                style={{ width: '150px' }}
              />
            ) : (
              <>
                <Text code>{caseData.elseResultName || 'Default'}</Text>
                <EditOutlined 
                  style={{ fontSize: '12px', cursor: 'pointer', color: darkMode ? '#b0b0b0' : '#8c8c8c' }}
                  onClick={() => setEditingElseResultName(true)}
                />
              </>
            )}
            <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>:</Text>
          </Space>
          <Expression
            value={caseData.elseClause}
            onChange={(newElse) => handleChange({ elseClause: newElse })}
            config={config}
            darkMode={darkMode}
          />
        </div>
      </Space>
    </Card>
  );
};

export default Case;
