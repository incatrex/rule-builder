import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Card, Collapse, Button, Input, Space, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Query, Builder, Utils as QbUtils } from '@react-awesome-query-builder/ui';
import ExpressionBuilder from './ExpressionBuilder';

const { Panel } = Collapse;
const { Text } = Typography;

const CaseBuilder = forwardRef(({ config, darkMode }, ref) => {
  const [whenClauses, setWhenClauses] = useState([
    {
      id: QbUtils.uuid(),
      name: 'Condition 1',
      resultName: 'Result 1',
      condition: QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
      result: { type: 'value', valueType: 'text', value: '' },
      expanded: true,
      editingName: false,
      editingResultName: false
    }
  ]);
  const [elseResult, setElseResult] = useState({ type: 'value', valueType: 'text', value: '' });
  const [elseResultName, setElseResultName] = useState('Default');
  const [editingElseResultName, setEditingElseResultName] = useState(false);
  const [elseExpanded, setElseExpanded] = useState(true);
  const [activeKeys, setActiveKeys] = useState(['0']);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getCaseOutput: () => {
      const caseStructure = {
        type: 'case',
        whenClauses: whenClauses.map(clause => ({
          name: clause.name,
          resultName: clause.resultName,
          condition: QbUtils.getTree(clause.condition),
          result: clause.result
        })),
        else: elseResult,
        elseResultName: elseResultName
      };
      return caseStructure;
    },
    loadCaseData: (caseData) => {
      if (caseData && caseData.type === 'case') {
        const loadedClauses = caseData.whenClauses.map((clause, index) => ({
          id: QbUtils.uuid(),
          name: clause.name || `Condition ${index + 1}`,
          resultName: clause.resultName || `Result ${index + 1}`,
          condition: QbUtils.loadTree(clause.condition),
          result: clause.result || { type: 'value', valueType: 'text', value: '' },
          expanded: false,
          editingName: false,
          editingResultName: false
        }));
        setWhenClauses(loadedClauses);
        setElseResult(caseData.else || { type: 'value', valueType: 'text', value: '' });
        setElseResultName(caseData.elseResultName || 'Default');
        setElseExpanded(false); // Collapse ELSE when loading a rule
        setActiveKeys([]);
      }
    }
  }));

  const addWhenClause = () => {
    const newClause = {
      id: QbUtils.uuid(),
      name: `Condition ${whenClauses.length + 1}`,
      resultName: `Result ${whenClauses.length + 1}`,
      condition: QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
      result: { type: 'value', valueType: 'text', value: '' },
      expanded: true,
      editingName: false,
      editingResultName: false
    };
    setWhenClauses([...whenClauses, newClause]);
    setActiveKeys([...activeKeys, String(whenClauses.length)]);
  };

  const removeWhenClause = (index) => {
    const newClauses = whenClauses.filter((_, i) => i !== index);
    setWhenClauses(newClauses);
  };

  const updateWhenClause = (index, updates) => {
    const newClauses = [...whenClauses];
    newClauses[index] = { ...newClauses[index], ...updates };
    setWhenClauses(newClauses);
  };

  const handleConditionChange = (index, tree) => {
    updateWhenClause(index, { condition: tree });
  };

  const handleResultChange = (index, result) => {
    updateWhenClause(index, { result });
  };

  const toggleNameEdit = (index) => {
    updateWhenClause(index, { editingName: !whenClauses[index].editingName });
  };

  const updateName = (index, name) => {
    updateWhenClause(index, { name, editingName: false });
  };

  const getCaseOutput = () => {
    const caseStructure = {
      type: 'case',
      whenClauses: whenClauses.map(clause => ({
        name: clause.name,
        condition: QbUtils.getTree(clause.condition),
        result: clause.result
      })),
      else: elseResult
    };
    return caseStructure;
  };

  return (
    <Card 
      title="CASE Statement Builder"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* WHEN Clauses */}
        <Collapse 
          activeKey={activeKeys} 
          onChange={setActiveKeys}
          style={{ marginBottom: '16px' }}
        >
          {whenClauses.map((clause, index) => {
            const isExpanded = activeKeys.includes(String(index));
            
            return (
            <Panel
              key={String(index)}
              header={
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Text strong>WHEN</Text>
                    {clause.editingName ? (
                      <Input
                        size="small"
                        value={clause.name}
                        onChange={(e) => updateWhenClause(index, { name: e.target.value })}
                        onPressEnter={() => toggleNameEdit(index)}
                        onBlur={() => toggleNameEdit(index)}
                        autoFocus
                        style={{ width: '200px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <Text code>{clause.name}</Text>
                        <EditOutlined 
                          style={{ fontSize: '12px', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNameEdit(index);
                          }}
                        />
                      </>
                    )}
                    {!isExpanded && (
                      <>
                        <Text strong style={{ marginLeft: '16px' }}>THEN</Text>
                        {clause.editingResultName ? (
                          <Input
                            size="small"
                            value={clause.resultName}
                            onChange={(e) => updateWhenClause(index, { resultName: e.target.value })}
                            onPressEnter={() => updateWhenClause(index, { editingResultName: false })}
                            onBlur={() => updateWhenClause(index, { editingResultName: false })}
                            autoFocus
                            style={{ width: '150px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <Text code>{clause.resultName}</Text>
                            <EditOutlined 
                              style={{ fontSize: '12px', cursor: 'pointer' }}
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
                <div>
                  <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                    Condition:
                  </Text>
                  <div style={{ 
                    padding: '16px', 
                    background: darkMode ? '#2a2a2a' : '#f9f9f9',
                    borderRadius: '4px'
                  }}>
                    {config && (
                      <Query
                        {...config}
                        value={clause.condition}
                        onChange={(tree) => handleConditionChange(index, tree)}
                        renderBuilder={(props) => (
                          <div className="query-builder qb-lite">
                            <Builder {...props} />
                          </div>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* THEN Result */}
                <div>
                  <Space style={{ marginBottom: '8px' }}>
                    <Text strong>THEN</Text>
                    {clause.editingResultName ? (
                      <Input
                        size="small"
                        value={clause.resultName}
                        onChange={(e) => updateWhenClause(index, { resultName: e.target.value })}
                        onPressEnter={() => updateWhenClause(index, { editingResultName: false })}
                        onBlur={() => updateWhenClause(index, { editingResultName: false })}
                        autoFocus
                        style={{ width: '150px' }}
                      />
                    ) : (
                      <>
                        <Text code>{clause.resultName}</Text>
                        <EditOutlined 
                          style={{ fontSize: '12px', cursor: 'pointer' }}
                          onClick={() => updateWhenClause(index, { editingResultName: true })}
                        />
                      </>
                    )}
                    <Text strong>:</Text>
                  </Space>
                  <ExpressionBuilder
                    value={clause.result}
                    onChange={(result) => handleResultChange(index, result)}
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
                    value={elseResultName}
                    onChange={(e) => setElseResultName(e.target.value)}
                    onPressEnter={() => setEditingElseResultName(false)}
                    onBlur={() => setEditingElseResultName(false)}
                    autoFocus
                    style={{ width: '150px' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <Text code>{elseResultName}</Text>
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
            <ExpressionBuilder
              value={elseResult}
              onChange={setElseResult}
              config={config}
              darkMode={darkMode}
            />
          </Panel>
        </Collapse>

        {/* Output Preview */}
        <Collapse defaultActiveKey={[]} style={{ marginTop: '16px' }}>
          <Panel header="CASE Output (JSON)" key="caseOutput">
            <pre style={{ 
              background: darkMode ? '#2a2a2a' : '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '300px',
              fontSize: '12px',
              color: darkMode ? '#e0e0e0' : 'inherit'
            }}>
              {JSON.stringify(getCaseOutput(), null, 2)}
            </pre>
          </Panel>
        </Collapse>
      </Space>
    </Card>
  );
});

CaseBuilder.displayName = 'CaseBuilder';

export default CaseBuilder;
