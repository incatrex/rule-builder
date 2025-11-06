import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, Space, Input, Select, Typography, Button, message } from 'antd';
import { SaveOutlined, FolderOpenOutlined } from '@ant-design/icons';
import axios from 'axios';
import Case from './Case';
import ConditionGroup from './ConditionGroup';
import Expression from './Expression';

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
 * 
 * Exposed Methods (via ref):
 * - getRuleOutput(): Returns the complete rule JSON
 * - loadRuleData(data): Loads rule data from JSON
 */
const RuleBuilder = forwardRef(({ config, darkMode = false, onRuleChange }, ref) => {
  // Generate a UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const [ruleData, setRuleData] = useState({
    structure: 'case',
    returnType: 'boolean',
    ruleType: 'Reporting',
    uuId: generateUUID(),
    version: 1,
    metadata: {
      id: '',
      description: ''
    },
    content: null
  });

  const [ruleTypes, setRuleTypes] = useState([]);

  useEffect(() => {
    // Initialize content based on structure
    if (!ruleData.content) {
      initializeContent(ruleData.structure);
    }
    
    // Load rule types
    loadRuleTypes();
  }, []);

  const loadRuleTypes = async () => {
    try {
      const response = await axios.get('/api/ruleTypes');
      setRuleTypes(response.data);
    } catch (error) {
      console.error('Error loading rule types:', error);
      // Fallback to default types
      setRuleTypes(['Reporting', 'Transformation', 'Aggregation', 'Validation']);
    }
  };

  useEffect(() => {
    // Notify parent of changes
    if (onRuleChange) {
      onRuleChange(ruleData);
    }
  }, [ruleData]);

  const handleChange = (updates) => {
    setRuleData(prev => ({ ...prev, ...updates }));
  };

  const handleSaveRule = async () => {
    const ruleId = ruleData.metadata.id;
    const version = ruleData.version;
    
    if (!ruleId) {
      message.warning('Please enter a Rule ID');
      return;
    }

    try {
      const dataToSave = {
        structure: ruleData.structure,
        returnType: ruleData.returnType,
        uuId: ruleData.uuId,
        version: ruleData.version,
        metadata: ruleData.metadata,
        content: ruleData.content
      };

      await axios.post(`/api/rules/${ruleId}/${version}`, dataToSave);
      message.success(`Rule saved: ${ruleId} v${version}`);
    } catch (error) {
      console.error('Error saving rule:', error);
      message.error('Failed to save rule');
    }
  };

  const handleLoadRule = async () => {
    const ruleId = ruleData.metadata.id;
    const version = ruleData.version;
    
    if (!ruleId) {
      message.warning('Please enter a Rule ID');
      return;
    }

    try {
      const response = await axios.get(`/api/rules/${ruleId}/${version}`);
      const loadedData = response.data;

      // Load the rule data
      const structure = loadedData.structure || 'case';
      let content = loadedData.content || loadedData[structure] || null;
      
      setRuleData({
        structure,
        returnType: loadedData.returnType || 'boolean',
        uuId: loadedData.uuId || generateUUID(),
        version: loadedData.version || 1,
        metadata: loadedData.metadata || { id: ruleId, description: '' },
        content: content
      });
      
      // If content is null, initialize it based on structure
      if (!content) {
        setTimeout(() => {
          initializeContent(structure);
        }, 0);
      }

      message.success(`Rule loaded: ${ruleId} v${version}`);
    } catch (error) {
      if (error.response?.status === 404) {
        message.error('Rule not found');
      } else {
        console.error('Error loading rule:', error);
        message.error('Failed to load rule');
      }
    }
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
              children: [
                // Auto-add an empty condition to the new group
                {
                  type: 'condition',
                  id: generateId(),
                  returnType: 'boolean',
                  name: 'Condition 1',
                  left: { source: 'field', returnType: 'text', field: null },
                  operator: null,
                  right: { source: 'value', returnType: 'text', value: '' }
                }
              ],
              isExpanded: true
            },
            then: {
              source: 'value',
              returnType: 'text',
              value: ''
            },
            resultName: 'Result 1',
            editingName: false,
            editingResultName: false
          }
        ],
        elseClause: { source: 'value', returnType: 'text', value: '' },
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
        children: [
          // Auto-add an empty condition
          {
            type: 'condition',
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            returnType: 'boolean',
            name: 'Condition 1',
            left: { source: 'field', returnType: 'text', field: null },
            operator: null,
            right: { source: 'value', returnType: 'text', value: '' }
          }
        ],
        isExpanded: true
      };
    } else if (structure === 'expression') {
      content = {
        source: 'value',
        returnType: 'text',
        value: ''
      };
    }
    
    handleChange({ content });
  };

  const handleStructureChange = (newStructure) => {
    handleChange({ 
      structure: newStructure,
      returnType: newStructure === 'case' || newStructure === 'condition' ? 'boolean' : 'text'
    });
    initializeContent(newStructure);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getRuleOutput: () => {
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
    },
    loadRuleData: (data) => {
      const structure = data.structure || 'case';
      
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
      
      // If content is null, initialize it based on structure
      if (!content) {
        setTimeout(() => {
          initializeContent(structure);
        }, 0);
      }
    }
  }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Fixed Header Panel */}
      <Card
        style={{
          background: darkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
          borderRadius: '6px 6px 0 0',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          marginBottom: '8px'
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Row 1: Rule ID, Version, Load Rule, Save Rule */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Text 
                strong 
                style={{ 
                  display: 'block', 
                  marginBottom: '4px',
                  fontSize: '12px',
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
                placeholder="Enter rule ID"
                size="small"
              />
            </div>
            
            <div style={{ width: '80px' }}>
              <Text 
                strong 
                style={{ 
                  display: 'block', 
                  marginBottom: '4px',
                  fontSize: '12px',
                  color: darkMode ? '#e0e0e0' : 'inherit'
                }}
              >
                Version:
              </Text>
              <Input
                type="number"
                value={ruleData.version}
                onChange={(e) => handleChange({ version: parseInt(e.target.value) || 1 })}
                min={1}
                size="small"
              />
            </div>
            
            <Button 
              icon={<FolderOpenOutlined />}
              onClick={handleLoadRule}
              disabled={!ruleData.metadata.id}
              size="small"
            >
              Load Rule
            </Button>
            
            <Button 
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveRule}
              disabled={!ruleData.metadata.id}
              size="small"
            >
              Save Rule
            </Button>
          </div>

          {/* Row 2: Description */}
          <div>
            <Text 
              strong 
              style={{ 
                display: 'block', 
                marginBottom: '4px',
                fontSize: '12px',
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
              size="small"
            />
          </div>

          {/* Row 3: Structure, Return Type, Rule Type */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <Text 
                strong 
                style={{ 
                  display: 'block', 
                  marginBottom: '4px',
                  fontSize: '12px',
                  color: darkMode ? '#e0e0e0' : 'inherit'
                }}
              >
                Structure:
              </Text>
              <Select
                value={ruleData.structure}
                onChange={handleStructureChange}
                style={{ width: '100%' }}
                size="small"
                options={[
                  { value: 'case', label: 'CASE Expression' },
                  { value: 'condition', label: 'Condition Group' },
                  { value: 'expression', label: 'Single Expression' }
                ]}
              />
            </div>

            <div style={{ flex: 1 }}>
              <Text 
                strong 
                style={{ 
                  display: 'block', 
                  marginBottom: '4px',
                  fontSize: '12px',
                  color: darkMode ? '#e0e0e0' : 'inherit'
                }}
              >
                Return Type:
              </Text>
              <Select
                value={ruleData.returnType}
                onChange={(returnType) => handleChange({ returnType })}
                style={{ width: '100%' }}
                size="small"
                disabled={ruleData.structure === 'case' || ruleData.structure === 'condition'}
                options={[
                  { value: 'boolean', label: 'Boolean' },
                  { value: 'text', label: 'Text' },
                  { value: 'number', label: 'Number' },
                  { value: 'date', label: 'Date' }
                ]}
              />
            </div>

            <div style={{ flex: 1 }}>
              <Text 
                strong 
                style={{ 
                  display: 'block', 
                  marginBottom: '4px',
                  fontSize: '12px',
                  color: darkMode ? '#e0e0e0' : 'inherit'
                }}
              >
                Rule Type:
              </Text>
              <Select
                value={ruleData.ruleType}
                onChange={(ruleType) => handleChange({ ruleType })}
                style={{ width: '100%' }}
                size="small"
                options={ruleTypes.map(type => ({ value: type, label: type }))}
              />
            </div>
          </div>
        </Space>        
      </Card>

      {/* Scrollable Rule Definition */}
      <Card
        title="Rule Definition"
        style={{
          background: darkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
          borderRadius: '0 0 6px 6px',
          flex: 1,
          overflow: 'auto'
        }}
        styles={{
          body: {
            height: '100%',
            overflow: 'auto'
          }
        }}
      >
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
          <Expression
            value={ruleData.content}
            onChange={(content) => handleChange({ content })}
            config={config}
            expectedType={ruleData.returnType}
            darkMode={darkMode}
          />
        )}
      </Card>
    </div>
  );
});

export default RuleBuilder;
