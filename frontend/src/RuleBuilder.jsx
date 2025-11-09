import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, Space, Input, Select, Typography, Button, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import Case from './Case';
import ConditionGroup from './ConditionGroup';
import ExpressionGroup from './ExpressionGroup';

const { Text } = Typography;
const { TextArea } = Input;

/**
 * RuleBuilder Component
 * 
 * The parent component for building rules with three possible structures:
 * - case: CASE expression with WHEN/THEN clauses
 * - condition: Single condition or condition group
 * - expression: Single expression
 * 
 * Generates JSON matching structure:
 * <rule structure="case|condition|expression" returnType="boolean|number|text|date" uuId="..." version=1>
 *   <metadata id="..." description="...">
 *   <case> | <conditionGroup> | <expression>
 * 
 * Props:
 * - config: Config with operators, fields, funcs
 * - darkMode: Dark mode styling
 * - onRuleChange: Callback when rule changes
 * - selectedRuleUuid: UUID of currently selected rule
 * 
 * Exposed Methods (via ref):
 * - getRuleOutput(): Returns the complete rule JSON
 * - loadRuleData(data): Loads rule data from JSON
 */
const RuleBuilder = forwardRef(({ config, darkMode = false, onRuleChange, selectedRuleUuid }, ref) => {
  // Generate a UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const [ruleData, setRuleData] = useState({
    structure: 'condition',
    returnType: 'boolean',
    uuId: generateUUID(),
    version: 1,
    ruleType: 'Reporting',
    metadata: {
      id: '',
      description: ''
    },
    content: null
  });

  const [availableVersions, setAvailableVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [ruleTypes, setRuleTypes] = useState(['Reporting', 'Validation', 'Calculation', 'Business']); // Default values
  const [isLoadedRule, setIsLoadedRule] = useState(false);

  useEffect(() => {
    // Initialize content based on structure
    if (!ruleData.content) {
      initializeContent(ruleData.structure);
    }
  }, []);

  useEffect(() => {
    // Load rule types from backend API
    const loadRuleTypes = async () => {
      try {
        const response = await fetch('/api/ruleTypes');
        if (response.ok) {
          const ruleTypesData = await response.json();
          if (Array.isArray(ruleTypesData) && ruleTypesData.length > 0) {
            setRuleTypes(ruleTypesData);
            // Update the current ruleType if it's not in the new list
            if (!ruleTypesData.includes(ruleData.ruleType)) {
              handleChange({ ruleType: ruleTypesData[0] });
            }
          }
        } else {
          console.error('Failed to load rule types, status:', response.status);
        }
      } catch (error) {
        console.error('Error loading rule types:', error);
        // Keep default values if API fails
        setRuleTypes(['Reporting', 'Validation', 'Calculation', 'Business']);
      }
    };

    loadRuleTypes();
  }, []);

  useEffect(() => {
    // Load versions when selectedRuleUuid changes
    if (selectedRuleUuid) {
      loadVersionsForRule(selectedRuleUuid);
    }
  }, [selectedRuleUuid]);

  useEffect(() => {
    // Notify parent of changes
    if (onRuleChange) {
      onRuleChange(ruleData);
    }
  }, [ruleData]);

  const loadVersionsForRule = async (uuid) => {
    try {
      setLoadingVersions(true);
      const response = await axios.get(`/api/rules/versions/${uuid}`);
      const versions = response.data.map(v => ({
        value: v.version,
        label: `Version ${v.version}`
      }));
      setAvailableVersions(versions);
    } catch (error) {
      console.error('Error loading versions:', error);
      setAvailableVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleChange = (updates) => {
    setRuleData(prev => ({ ...prev, ...updates }));
  };

  const initializeContent = (structure) => {
    let content = null;
    
    if (structure === 'case') {
      const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      content = {
        whenClauses: [
          // Start with one default WHEN clause like CustomCaseBuilder
          {
            when: {
              type: 'conditionGroup',
              id: generateId(),
              returnType: 'boolean',
              name: 'Condition 1',
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
              ],
              isExpanded: true
            },
            then: {
              source: 'expressionGroup',
              returnType: 'number',
              firstExpression: { source: 'value', returnType: 'number', value: '' },
              additionalExpressions: []
            },
            resultName: 'Result 1',
            editingName: false,
            editingResultName: false
          }
        ],
        elseClause: { 
          source: 'expressionGroup',
          returnType: 'number',
          firstExpression: { source: 'value', returnType: 'number', value: '' },
          additionalExpressions: []
        },
        elseResultName: 'Default',
        elseExpanded: true
      };
    } else if (structure === 'condition') {
      content = {
        type: 'conditionGroup',
        returnType: 'boolean',
        name: 'Main Condition',
        conjunction: 'AND',
        not: false,
        conditions: [
          // Auto-add an empty condition
          {
            type: 'condition',
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        ],
        isExpanded: true
      };
    } else if (structure === 'expression') {
      content = {
        source: 'expressionGroup',
        returnType: 'number',
        firstExpression: { source: 'value', returnType: 'number', value: '' },
        additionalExpressions: []
      };
    }
    
    handleChange({ 
      content,
      returnType: structure === 'expression' ? 'number' : (structure === 'condition' ? 'boolean' : ruleData.returnType)
    });
  };

  const handleStructureChange = (newStructure) => {
    handleChange({ 
      structure: newStructure,
      returnType: newStructure === 'case' || newStructure === 'condition' ? 'boolean' : 'number'
    });
    initializeContent(newStructure);
  };

  const handleSaveRule = async () => {
    if (!ruleData.metadata.id) {
      message.warning('Please enter a Rule ID');
      return;
    }

    try {
      const ruleOutput = getRuleOutput();
      await axios.post(`/api/rules/${ruleData.metadata.id}/${ruleData.version}`, ruleOutput);
      
      // Auto-increment version for next save
      handleChange({ version: ruleData.version + 1 });
      
      message.success(`Rule saved: ${ruleData.metadata.id} v${ruleData.version}`);
    } catch (error) {
      console.error('Error saving rule:', error);
      message.error('Failed to save rule');
    }
  };

  const getRuleOutput = () => {
    // Use 'content' key for consistency with editing
    return {
      structure: ruleData.structure,
      returnType: ruleData.returnType,
      ruleType: ruleData.ruleType,
      uuId: ruleData.uuId,
      version: ruleData.version,
      metadata: ruleData.metadata,
      content: ruleData.content
    };
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getRuleOutput,
    loadRuleData: (data) => {
      const structure = data.structure || 'condition';
      
      // Support both formats:
      // 1. Content format (new): { structure: "case", content: {...} }
      // 2. Dynamic key format (old): { structure: "case", case: {...} }
      let content = data.content || data[structure] || null;
      
      setRuleData({
        structure,
        returnType: data.returnType || 'boolean',
        ruleType: data.ruleType || 'Reporting',
        uuId: data.uuId || generateUUID(),
        version: data.version || 1,
        metadata: data.metadata || { id: '', description: '' },
        content: content
      });
      
      setIsLoadedRule(true); // Signal that this is a loaded rule (should be collapsed)
      
      // If content is null, initialize it based on structure
      if (!content) {
        setTimeout(() => {
          initializeContent(structure);
        }, 0);
      }
    },
    newRule: (data = {}) => {
      const structure = data.structure || 'condition';
      
      setRuleData({
        structure,
        returnType: data.returnType || 'boolean',
        ruleType: data.ruleType || 'Reporting',
        uuId: generateUUID(),
        version: 1,
        metadata: data.metadata || { id: '', description: '' },
        content: null
      });
      
      setIsLoadedRule(false); // Signal that this is a new rule (should be expanded)
      
      // Initialize content based on structure
      setTimeout(() => {
        initializeContent(structure);
      }, 0);
    }
  }));

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Metadata Card */}
        <Card
          title="Rule Metadata"
          style={{
            background: darkMode ? '#1f1f1f' : '#ffffff',
            border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space style={{ width: '100%' }} size="middle">
              <div style={{ flex: 1 }}>
                <Text 
                  strong 
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    color: darkMode ? '#e0e0e0' : 'inherit'
                  }}
                >
                  Rule ID:
                </Text>
                <Input
                  value={ruleData.metadata.id}
                  onChange={(e) => handleChange({ 
                    metadata: { ...ruleData.metadata, id: e.target.value }
                  })}
                  placeholder="Enter unique rule identifier"
                />
              </div>
              
              <div style={{ width: '150px' }}>
                <Text 
                  strong 
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    color: darkMode ? '#e0e0e0' : 'inherit'
                  }}
                >
                  Rule Type:
                </Text>
                <Select
                  value={ruleData.ruleType}
                  onChange={(ruleType) => handleChange({ ruleType })}
                  style={{ width: '100%' }}
                  options={ruleTypes.map(type => ({ value: type, label: type }))}
                />
              </div>
              
              <div style={{ width: '100px' }}>
                <Text 
                  strong 
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    color: darkMode ? '#e0e0e0' : 'inherit'
                  }}
                >
                  Version:
                </Text>
                {selectedRuleUuid && availableVersions.length > 0 ? (
                  <Select
                    value={ruleData.version}
                    onChange={(version) => handleChange({ version })}
                    style={{ width: '100%' }}
                    loading={loadingVersions}
                    options={availableVersions}
                  />
                ) : (
                  <Input
                    type="number"
                    value={ruleData.version}
                    onChange={(e) => handleChange({ version: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                )}
              </div>
              
              <div style={{ marginTop: '32px' }}>
                <Button 
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveRule}
                  disabled={!ruleData.metadata.id}
                >
                  Save Rule
                </Button>
              </div>
            </Space>
            
            <div>
              <Text 
                strong 
                style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  color: darkMode ? '#e0e0e0' : 'inherit'
                }}
              >
                Description:
              </Text>
              <TextArea
                value={ruleData.metadata.description}
                onChange={(e) => handleChange({ 
                  metadata: { ...ruleData.metadata, description: e.target.value }
                })}
                placeholder="Enter rule description"
                rows={2}
              />
            </div>
          </Space>
        </Card>

        {/* Structure Selection */}
        <Card
          title="Rule Structure"
          style={{
            background: darkMode ? '#1f1f1f' : '#ffffff',
            border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text 
                strong 
                style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  color: darkMode ? '#e0e0e0' : 'inherit'
                }}
              >
                Structure Type:
              </Text>
              <Select
                value={ruleData.structure}
                onChange={handleStructureChange}
                style={{ width: '100%' }}
                options={[
                  { 
                    value: 'condition', 
                    label: 'Simple Condition - Single boolean condition or group' 
                  },
                  { 
                    value: 'case', 
                    label: 'Case Expression - Multiple conditions with different results' 
                  },
                  { 
                    value: 'expression', 
                    label: 'Mathematical Expression - Single value, field, or function' 
                  }
                ]}
              />
            </div>

            <div>
              <Text 
                strong 
                style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  color: darkMode ? '#e0e0e0' : 'inherit'
                }}
              >
                Return Type:
              </Text>
              <Select
                value={ruleData.returnType}
                onChange={(returnType) => handleChange({ returnType })}
                style={{ width: '100%' }}
                disabled={ruleData.structure === 'case' || ruleData.structure === 'condition'}
                options={[
                  { value: 'boolean', label: 'Boolean' },
                  { value: 'text', label: 'Text' },
                  { value: 'number', label: 'Number' },
                  { value: 'date', label: 'Date' }
                ]}
              />
            </div>
          </Space>
        </Card>

        {/* Rule Content */}
        <Card
          title="Rule Definition"
          style={{
            background: darkMode ? '#1f1f1f' : '#ffffff',
            border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`
          }}
        >
          {ruleData.structure === 'case' && ruleData.content && (
            <Case
              value={ruleData.content}
              onChange={(content) => handleChange({ content })}
              config={config}
              darkMode={darkMode}
              isLoadedRule={isLoadedRule}
            />
          )}

          {ruleData.structure === 'condition' && ruleData.content && (
            <ConditionGroup
              value={ruleData.content}
              onChange={(content) => handleChange({ content })}
              config={config}
              darkMode={darkMode}
              isLoadedRule={isLoadedRule}
              isSimpleCondition={true}
            />
          )}

          {ruleData.structure === 'expression' && ruleData.content && (
            <ExpressionGroup
              value={ruleData.content}
              onChange={(content) => handleChange({ content })}
              config={config}
              expectedType={ruleData.returnType}
              darkMode={darkMode}
              isLoadedRule={isLoadedRule}
            />
          )}
        </Card>
      </Space>
    </div>
  );
});

RuleBuilder.displayName = 'RuleBuilder';

export default RuleBuilder;