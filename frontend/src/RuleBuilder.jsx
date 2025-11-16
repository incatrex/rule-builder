import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, Space, Input, Select, Typography, Button, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { RuleService, ConfigService } from './services';
import Case from './Case';
import ConditionGroup from './ConditionGroup';
import { SmartExpression, createDirectExpression } from './utils/expressionUtils.jsx';

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
  // Initialize services
  const ruleService = new RuleService();
  const configService = new ConfigService();

  const [ruleData, setRuleData] = useState({
    structure: 'condition',
    returnType: 'boolean',
    uuId: null, // Will be generated server-side
    version: 1,
    ruleType: 'Reporting',
    metadata: {
      id: '',
      description: ''
    },
    definition: null
  });

  const [availableVersions, setAvailableVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [ruleTypes, setRuleTypes] = useState(['Reporting', 'Validation', 'Calculation', 'Business']); // Default values
  const [isLoadedRule, setIsLoadedRule] = useState(false);

  useEffect(() => {
    // Initialize definition based on structure
    if (!ruleData.definition) {
      initializeDefinition(ruleData.structure);
    }
  }, []);

  useEffect(() => {
    // Load rule types from backend API using service
    const loadRuleTypes = async () => {
      try {
        const config = await configService.getConfig();
        if (config.ruleTypes && Array.isArray(config.ruleTypes) && config.ruleTypes.length > 0) {
          setRuleTypes(config.ruleTypes);
          // Update the current ruleType if it's not in the new list
          if (!config.ruleTypes.includes(ruleData.ruleType)) {
            handleChange({ ruleType: config.ruleTypes[0] });
          }
        } else {
          // Silently use defaults if no rule types found in config
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
      const versions = await ruleService.getRuleVersions(uuid);
      const versionOptions = versions.map(v => ({
        value: v,
        label: `${v}`
      }));
      setAvailableVersions(versionOptions);
    } catch (error) {
      console.error('Error loading versions:', error);
      setAvailableVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleVersionChange = async (version) => {
    if (!selectedRuleUuid) {
      handleChange({ version });
      return;
    }

    try {
      // Load the selected version from the backend using the service
      const ruleVersionData = await ruleService.getRuleVersion(selectedRuleUuid, version);
      
      if (ruleVersionData) {
        // Load the rule data for the selected version
        const structure = ruleVersionData.structure || 'condition';
        const definition = ruleVersionData.definition || ruleVersionData[structure] || null;
        
        setRuleData({
          structure,
          returnType: ruleVersionData.returnType || 'boolean',
          ruleType: ruleVersionData.ruleType || 'Reporting',
          uuId: ruleVersionData.uuId || selectedRuleUuid,
          version: ruleVersionData.version || version,
          metadata: ruleVersionData.metadata || { id: '', description: '' },
          definition: content
        });
        
        setIsLoadedRule(true);
        message.success(`Loaded version ${version}`);
      }
    } catch (error) {
      console.error('Error loading version:', error);
      message.error(`Failed to load version ${version}`);
    }
  };

  const handleChange = (updates) => {
    setRuleData(prev => ({ ...prev, ...updates }));
  };

  const initializeDefinition = (structure) => {
    let definition = null;
    
    if (structure === 'case') {
      definition = {
        whenClauses: [
          // Start with one default WHEN clause like CustomCaseBuilder
          {
            when: {
              type: 'conditionGroup',
              returnType: 'boolean',
              name: 'Condition 1',
              conjunction: 'AND',
              not: false,
              conditions: [
                // Auto-add an empty condition to the new group
                {
                  type: 'condition',
                  returnType: 'boolean',
                  name: 'Condition 1',
                  left: createDirectExpression('field', 'number', 'TABLE1.NUMBER_FIELD_01'),
                  operator: 'equal',
                  right: createDirectExpression('value', 'number', 0)
                }
              ]
            },
            then: createDirectExpression('value', 'number', 0),
            resultName: 'Result 1',
            editingName: false,
            editingResultName: false
          }
        ],
        elseClause: createDirectExpression('value', 'number', 0),
        elseResultName: 'Default',
        elseExpanded: true
      };
    } else if (structure === 'condition') {
      definition = {
        type: 'conditionGroup',
        returnType: 'boolean',
        name: 'Main Condition',
        conjunction: 'AND',
        not: false,
        conditions: [
          // Auto-add an empty condition with direct expressions (schema-compliant)
          {
            type: 'condition',
            returnType: 'boolean',
            name: 'Condition 1',
            left: {
              type: 'field',
              returnType: 'number',
              field: 'TABLE1.NUMBER_FIELD_01' // Use a default valid field
            },
            operator: 'equal', // Use a default valid operator
            right: {
              type: 'value',
              returnType: 'number',
              value: 0 // Use a default valid value
            }
          }
        ]
      };
    } else if (structure === 'expression') {
      definition = createDirectExpression('value', 'number', 0);
    }
    
    handleChange({ 
      definition,
      returnType: structure === 'expression' ? 'number' : (structure === 'condition' ? 'boolean' : ruleData.returnType)
    });
  };

  const handleStructureChange = (newStructure) => {
    handleChange({ 
      structure: newStructure,
      returnType: newStructure === 'case' || newStructure === 'condition' ? 'boolean' : 'number'
    });
    initializeDefinition(newStructure);
  };

  const handleSaveRule = async () => {
    if (!ruleData.metadata.id) {
      message.warning('Please enter a Rule ID');
      return;
    }

    try {
      const ruleOutput = getRuleOutput();
      let result;
      
      if (ruleData.uuId) {
        // Update existing rule (creates new version automatically)
        result = await ruleService.updateRule(ruleData.uuId, ruleOutput);
        message.success(`Rule updated: ${result.ruleId} v${result.version}`);
      } else {
        // Create new rule (server generates UUID)
        result = await ruleService.createRule(ruleOutput);
        message.success(`Rule created: ${result.ruleId} v${result.version}`);
      }
      
      // Update the local state with server response
      handleChange({ 
        uuId: result.uuid,
        version: result.version 
      });
      
      // Refresh available versions if we have a selected rule
      if (selectedRuleUuid === result.uuid || !selectedRuleUuid) {
        await loadVersionsForRule(result.uuid);
      }
      
    } catch (error) {
      console.error('Error saving rule:', error);
      message.error('Failed to save rule: ' + (error.response?.data?.error || error.message));
    }
  };

  const getRuleOutput = () => {
    // Clean UI state properties before saving
    const cleanDefinition = removeUIState(ruleData.definition);
    
    // Use 'definition' key for consistency with editing
    return {
      structure: ruleData.structure,
      returnType: ruleData.returnType,
      ruleType: ruleData.ruleType,
      uuId: ruleData.uuId,
      version: ruleData.version,
      metadata: ruleData.metadata,
      definition: cleanDefinition
    };
  };

  // Helper function to recursively remove UI state properties
  const removeUIState = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => removeUIState(item));
    }

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip UI-only properties
      if (key === 'isExpanded' || 
          key === 'isCollapsed' || 
          key === 'editingName' || 
          key === 'editingResultName' ||
          (key === 'id' && obj.type === 'conditionGroup')) {
        continue;
      }
      
      // Recursively clean nested objects
      if (value && typeof value === 'object') {
        cleaned[key] = removeUIState(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getRuleOutput,
    loadRuleData: (data) => {
      const structure = data.structure || 'condition';
      
      // Support both formats:
      // 1. Definition format (new): { structure: "case", definition: {...} }
      // 2. Dynamic key format (old): { structure: "case", case: {...} }
      let content = data.definition || data[structure] || null;
      
      setRuleData({
        structure,
        returnType: data.returnType || 'boolean',
        ruleType: data.ruleType || 'Reporting',
        uuId: data.uuId || generateUUID(),
        version: data.version || 1,
        metadata: data.metadata || { id: '', description: '' },
        definition: content
      });
      
      setIsLoadedRule(true); // Signal that this is a loaded rule (should be collapsed)
      
      // If content is null, initialize it based on structure
      if (!content) {
        setTimeout(() => {
          initializeDefinition(structure);
        }, 0);
      }
    },
    newRule: (data = {}) => {
      const structure = data.structure || 'condition';
      
      setRuleData({
        structure,
        returnType: data.returnType || 'boolean',
        ruleType: data.ruleType || 'Reporting',
        uuId: null, // Will be generated server-side on save
        version: 1,
        metadata: data.metadata || { id: '', description: '' },
        definition: null
      });
      
      setIsLoadedRule(false); // Signal that this is a new rule (should be expanded)
      
      // Initialize content based on structure
      setTimeout(() => {
        initializeDefinition(structure);
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
                    onChange={handleVersionChange}
                    style={{ width: '100%' }}
                    loading={loadingVersions}
                    options={availableVersions}
                  />
                ) : (
                  <Input
                    type="number"
                    value={ruleData.version}
                    disabled
                    style={{ width: '100%' }}
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

        {/* Rule Content */}
        <Card
          title="Rule Definition"
          style={{
            background: darkMode ? '#1f1f1f' : '#ffffff',
            border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Structure and Return Type Selection */}
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

              <div style={{ width: '150px', flexShrink: 0 }}>
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

            {/* Rule Content Based on Structure */}
            <div>
          {ruleData.structure === 'case' && ruleData.definition && (
            <Case
              value={ruleData.definition}
              onChange={(definition) => handleChange({ definition })}
              config={config}
              darkMode={darkMode}
              isLoadedRule={isLoadedRule}
            />
          )}

          {ruleData.structure === 'condition' && ruleData.definition && (
            <ConditionGroup
              value={ruleData.definition}
              onChange={(definition) => handleChange({ definition })}
              config={config}
              darkMode={darkMode}
              isLoadedRule={isLoadedRule}
              isSimpleCondition={true}
            />
          )}

          {ruleData.structure === 'expression' && ruleData.definition && (
            <SmartExpression
              value={ruleData.definition}
              onChange={(definition) => handleChange({ definition })}
              config={config}
              expectedType={ruleData.returnType}
              darkMode={darkMode}
              isLoadedRule={isLoadedRule}
            />
          )}
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
});

RuleBuilder.displayName = 'RuleBuilder';

export default RuleBuilder;