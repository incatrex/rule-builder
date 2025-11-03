import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Card, Collapse, Button, Input, Space, Select, InputNumber, DatePicker, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Query, Builder, Utils as QbUtils } from '@react-awesome-query-builder/ui';

const { Panel } = Collapse;
const { Text } = Typography;

const ExpressionSelector = ({ value, onChange, config, fields, funcs }) => {
  const [expressionType, setExpressionType] = useState(value?.type || 'value');
  const [expressionValue, setExpressionValue] = useState(value?.value || '');

  const handleTypeChange = (type) => {
    setExpressionType(type);
    onChange({ type, value: '' });
  };

  const handleValueChange = (val) => {
    setExpressionValue(val);
    onChange({ type: expressionType, value: val });
  };

  const renderValueInput = () => {
    // Simple value input - could be enhanced to detect type
    return (
      <Input
        placeholder="Enter value"
        value={expressionValue}
        onChange={(e) => handleValueChange(e.target.value)}
        style={{ width: '200px' }}
      />
    );
  };

  const renderFieldSelect = () => {
    const fieldOptions = Object.keys(fields || {}).map(key => ({
      label: fields[key].label,
      value: key
    }));

    return (
      <Select
        placeholder="Select field"
        value={expressionValue}
        onChange={handleValueChange}
        style={{ width: '250px' }}
        showSearch
        filterOption={(input, option) =>
          option.label.toLowerCase().includes(input.toLowerCase())
        }
        options={fieldOptions}
      />
    );
  };

  const renderFuncSelect = () => {
    const funcOptions = Object.keys(funcs || {}).map(key => ({
      label: funcs[key].label,
      value: key
    }));

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          placeholder="Select function"
          value={expressionValue}
          onChange={handleValueChange}
          style={{ width: '250px' }}
          options={funcOptions}
        />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Note: Function arguments would need to be configured separately
        </Text>
      </Space>
    );
  };

  return (
    <Space>
      <Select
        value={expressionType}
        onChange={handleTypeChange}
        style={{ width: '100px' }}
        options={[
          { label: 'Value', value: 'value' },
          { label: 'Field', value: 'field' },
          { label: 'Func', value: 'func' }
        ]}
      />
      {expressionType === 'value' && renderValueInput()}
      {expressionType === 'field' && renderFieldSelect()}
      {expressionType === 'func' && renderFuncSelect()}
    </Space>
  );
};

const CaseBuilder = forwardRef(({ config, darkMode }, ref) => {
  const [whenClauses, setWhenClauses] = useState([
    {
      id: QbUtils.uuid(),
      name: 'Condition 1',
      condition: QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
      result: { type: 'value', value: '' },
      expanded: true,
      editingName: false
    }
  ]);
  const [elseResult, setElseResult] = useState({ type: 'value', value: '' });
  const [activeKeys, setActiveKeys] = useState(['0']);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getCaseOutput: () => {
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
    },
    loadCaseData: (caseData) => {
      if (caseData && caseData.type === 'case') {
        const loadedClauses = caseData.whenClauses.map((clause, index) => ({
          id: QbUtils.uuid(),
          name: clause.name || `Condition ${index + 1}`,
          condition: QbUtils.loadTree(clause.condition),
          result: clause.result || { type: 'value', value: '' },
          expanded: false,
          editingName: false
        }));
        setWhenClauses(loadedClauses);
        setElseResult(caseData.else || { type: 'value', value: '' });
        setActiveKeys([]);
      }
    }
  }));

  const addWhenClause = () => {
    const newClause = {
      id: QbUtils.uuid(),
      name: `Condition ${whenClauses.length + 1}`,
      condition: QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
      result: { type: 'value', value: '' },
      expanded: true,
      editingName: false
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
          {whenClauses.map((clause, index) => (
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
                    background: darkMode ? '#1a1a1a' : '#f9f9f9',
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
                  <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                    THEN Result:
                  </Text>
                  <ExpressionSelector
                    value={clause.result}
                    onChange={(result) => handleResultChange(index, result)}
                    config={config}
                    fields={config?.fields}
                    funcs={config?.funcs}
                  />
                </div>
              </Space>
            </Panel>
          ))}
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
        <Card 
          size="small" 
          title={<Text strong>ELSE</Text>}
          style={{ 
            background: darkMode ? '#1a1a1a' : '#fafafa'
          }}
        >
          <ExpressionSelector
            value={elseResult}
            onChange={setElseResult}
            config={config}
            fields={config?.fields}
            funcs={config?.funcs}
          />
        </Card>

        {/* Output Preview */}
        <Card title="CASE Output (JSON)" size="small">
          <pre style={{ 
            background: darkMode ? '#1f1f1f' : '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px',
            fontSize: '12px',
            color: darkMode ? '#d4d4d4' : 'inherit'
          }}>
            {JSON.stringify(getCaseOutput(), null, 2)}
          </pre>
        </Card>
      </Space>
    </Card>
  );
});

CaseBuilder.displayName = 'CaseBuilder';

export default CaseBuilder;
