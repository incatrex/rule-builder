import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, Select, Input, Space, Typography, Button, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import ConditionGroup from './ConditionGroup';
import Case from './Case';
import ExpressionGroup from './ExpressionGroup';

const { Option } = Select;
const { Title } = Typography;

const EMPTY_RULE = {
  name: '',
  type: 'Reporting',
  structure: 'condition',
  returnType: 'boolean',
  content: null
};

const RuleBuilder = forwardRef(({ selectedRuleUuid, loadVersionsForRule, config, darkMode }, ref) => {
  const [ruleData, setRuleData] = useState(EMPTY_RULE);
  const [ruleTypes, setRuleTypes] = useState(['Reporting', 'Validation', 'Calculation', 'Business']);

  useEffect(() => {
    // Load rule types from API
    const loadRuleTypes = async () => {
      try {
        const response = await fetch('/api/ruleTypes');
        if (response.ok) {
          const ruleTypesData = await response.json();
          if (Array.isArray(ruleTypesData) && ruleTypesData.length > 0) {
            setRuleTypes(ruleTypesData);
          }
        }
      } catch (error) {
        console.error('Error loading rule types:', error);
        // Keep default values if API fails
        setRuleTypes(['Reporting', 'Validation', 'Calculation', 'Business']);
      }
    };

    loadRuleTypes();
  }, []);

  const handleChange = (updates) => {
    setRuleData(prev => ({ ...prev, ...updates }));
  };

  const initializeContent = (structure) => {
    if (structure === 'condition') {
      if (!ruleData.content) {
        handleChange({ 
          content: {
            type: 'group',
            properties: {
              conjunction: 'AND'
            },
            children1: {
              'rule_initial': {
                type: 'rule',
                properties: {
                  field: null,
                  operator: null,
                  value: [''],
                  valueSrc: ['value'],
                  valueType: ['text']
                }
              }
            }
          },
          returnType: 'boolean'
        });
      }
    } else if (structure === 'case') {
      if (!ruleData.content) {
        handleChange({ 
          content: [
            {
              when: {
                type: 'group',
                properties: {
                  conjunction: 'AND'
                },
                children1: {
                  'rule_initial': {
                    type: 'rule',
                    properties: {
                      field: null,
                      operator: null,
                      value: [''],
                      valueSrc: ['value'],
                      valueType: ['text']
                    }
                  }
                }
              },
              then: {
                type: 'expression',
                value: ''
              }
            }
          ],
          returnType: 'text'
        });
      }
    } else if (structure === 'expression') {
      if (!ruleData.content) {
        handleChange({ 
          content: {
            type: 'expression',
            value: ''
          },
          returnType: 'text'
        });
      }
    }
  };

  useEffect(() => {
    // Initialize content when structure changes
    initializeContent(ruleData.structure);
  }, [ruleData.structure]);

  const getRuleOutput = () => {
    return ruleData;
  };

  const getReturnTypeOptions = () => {
    switch (ruleData.structure) {
      case 'condition':
        return [{ value: 'boolean', label: 'Boolean' }];
      case 'case':
        return [
          { value: 'text', label: 'Text' },
          { value: 'number', label: 'Number' },
          { value: 'date', label: 'Date' },
          { value: 'boolean', label: 'Boolean' }
        ];
      case 'expression':
        return [
          { value: 'text', label: 'Text' },
          { value: 'number', label: 'Number' },
          { value: 'date', label: 'Date' },
          { value: 'boolean', label: 'Boolean' }
        ];
      default:
        return [{ value: 'boolean', label: 'Boolean' }];
    }
  };

  useImperativeHandle(ref, () => ({
    getRuleOutput,
    loadRuleData: (data) => {
      setRuleData({ ...EMPTY_RULE, ...data });
    },
    clearRule: () => {
      setRuleData(EMPTY_RULE);
    }
  }));

  if (!config) {
    return <div>Loading configuration...</div>;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="Rule Definition" style={{ width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ 
              marginBottom: '8px', 
              display: 'block',
              color: darkMode ? '#ffffff' : '#000000'
            }}>
              Rule Name:
            </label>
            <Input
              value={ruleData.name}
              onChange={(e) => handleChange({ name: e.target.value })}
              placeholder="Enter rule name"
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ 
              marginBottom: '8px', 
              display: 'block',
              color: darkMode ? '#ffffff' : '#000000'
            }}>
              Rule Type:
            </label>
            <Select
              value={ruleData.type}
              onChange={(value) => handleChange({ type: value })}
              style={{ width: '100%' }}
              placeholder="Select rule type"
            >
              {ruleTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </div>
          
          <div>
            <label style={{ 
              marginBottom: '8px', 
              display: 'block',
              color: darkMode ? '#ffffff' : '#000000'
            }}>
              Structure:
            </label>
            <Select
              value={ruleData.structure}
              onChange={(value) => handleChange({ structure: value })}
              style={{ width: '100%' }}
            >
              <Option value="condition">Condition</Option>
              <Option value="case">Case When</Option>
              <Option value="expression">Expression</Option>
            </Select>
          </div>

          <div>
            <label style={{ 
              marginBottom: '8px', 
              display: 'block',
              color: darkMode ? '#ffffff' : '#000000'
            }}>
              Return Type:
            </label>
            <Select
              value={ruleData.returnType}
              onChange={(value) => handleChange({ returnType: value })}
              style={{ width: '100%' }}
            >
              {getReturnTypeOptions().map(option => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
          </div>
        </Space>
      </Card>

      <Card title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Rule Content
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
        </div>
      } style={{ width: '100%' }}>
        <div style={{ minHeight: '200px', padding: '16px' }}>
          {ruleData.structure === 'case' && ruleData.content && (
            <Case
              value={ruleData.content}
              onChange={(content) => handleChange({ content })}
              config={config}
              darkMode={darkMode}
            />
          )}

          {ruleData.structure === 'condition' && ruleData.content && (
            <ConditionGroup
              value={ruleData.content}
              onChange={(content) => handleChange({ content })}
              config={config}
              darkMode={darkMode}
            />
          )}

          {ruleData.structure === 'expression' && ruleData.content && (
            <ExpressionGroup
              value={ruleData.content}
              onChange={(content) => handleChange({ content })}
              config={config}
              expectedType={ruleData.returnType}
              darkMode={darkMode}
            />
          )}
        </div>
      </Card>
    </Space>
  );
});

RuleBuilder.displayName = 'RuleBuilder';

export default RuleBuilder;