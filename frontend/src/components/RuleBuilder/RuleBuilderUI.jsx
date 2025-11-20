import React, { useState } from 'react';
import { Card, Select, Input, Switch, Button, Space, Tag, Divider, Typography, Collapse } from 'antd';
import { SaveOutlined, ClearOutlined, InfoCircleOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import Case from './Case';
import ConditionGroup from './ConditionGroup';
import Expression from './Expression';
import './RuleBuilder.css';

const { Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

/**
 * RuleBuilderUI Component
 * 
 * Pure presentation component for the rule builder interface.
 * Receives all data and callbacks as props - contains NO logic.
 * 
 * This component is designed to be:
 * - Fully controlled (all state from props)
 * - Themeable via CSS variables
 * - Independent of any services or business logic
 * 
 * @param {Object} props - Component props
 * @param {Object} props.ruleData - Current rule state
 * @param {Array} props.availableVersions - Version options for dropdown
 * @param {boolean} props.loadingVersions - Whether versions are loading
 * @param {Array} props.ruleTypes - Available rule types
 * @param {boolean} props.isLoadedRule - Whether this is a loaded rule
 * @param {Object} props.config - UI configuration (operators, fields, functions)
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {string} props.selectedRuleUuid - UUID of selected rule
 * @param {Function} props.onMetadataChange - Callback for metadata changes
 * @param {Function} props.onRuleTypeChange - Callback for rule type changes
 * @param {Function} props.onVersionChange - Callback for version changes
 * @param {Function} props.onReturnTypeChange - Callback for return type changes
 * @param {Function} props.onStructureChange - Callback for structure changes
 * @param {Function} props.onDefinitionChange - Callback for definition changes
 * @param {Function} props.onSave - Callback for save action
 */
export const RuleBuilderUI = ({
  ruleData,
  availableVersions,
  loadingVersions,
  ruleTypes,
  isLoadedRule,
  config,
  darkMode = false,
  selectedRuleUuid,
  onMetadataChange,
  onRuleTypeChange,
  onVersionChange,
  onReturnTypeChange,
  onStructureChange,
  onDefinitionChange,
  onSave
}) => {
  const [metadataCollapsed, setMetadataCollapsed] = useState(false);

  return (
    <div className="rule-builder-container">
      {/* Single consolidated Rule Definition Card */}
      <Card
        title="Rule Definition"
        className="rule-builder-card"
        style={{
          background: darkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Structure and Return Type Selection */}
          <Space 
            style={{ width: '100%', flexWrap: 'wrap' }} 
            size="middle"
          >
            <div style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text 
                strong 
                className="rule-builder-label"
                style={{ 
                  color: darkMode ? '#e0e0e0' : 'inherit',
                  whiteSpace: 'nowrap'
                }}
              >
                Structure:
              </Text>
              <Select
                value={ruleData.structure}
                onChange={onStructureChange}
                style={{ flex: 1 }}
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
                    label: 'Expression - Single value, field, or function' 
                  }
                ]}
              />
            </div>

            <div style={{ minWidth: '150px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text 
                strong 
                className="rule-builder-label"
                style={{ 
                  color: darkMode ? '#e0e0e0' : 'inherit',
                  whiteSpace: 'nowrap'
                }}
              >
                Returns:
              </Text>
              <Select
                value={ruleData.returnType}
                onChange={onReturnTypeChange}
                disabled={ruleData.structure === 'condition'}
                style={{ width: '120px' }}
                options={[
                  { value: 'boolean', label: 'Boolean' },
                  { value: 'number', label: 'Number' },
                  { value: 'text', label: 'Text' },
                  { value: 'date', label: 'Date' }
                ]}
              />
            </div>
          </Space>

          {/* Collapsible Metadata Section */}
          <Collapse
            activeKey={metadataCollapsed ? [] : ['metadata']}
            onChange={(keys) => setMetadataCollapsed(!keys.includes('metadata'))}
            style={{
              background: darkMode ? '#141414' : '#fafafa',
              border: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Panel
              key="metadata"
              header={
                <Space size="small">
                  <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>Metadata:</Text>
                  <Text code>
                    {ruleData.metadata.id || '(not set)'} [{ruleData.ruleType}] V{ruleData.version}
                  </Text>
                </Space>
              }
            >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Space style={{ width: '100%' }} size="middle">
                <div style={{ flex: 1 }}>
                  <Text 
                    strong 
                    className="rule-builder-label"
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: darkMode ? '#e0e0e0' : 'inherit'
                    }}
                  >
                    Rule ID:
                  </Text>
                  <Input
                    data-testid="rule-id-input"
                    value={ruleData.metadata.id}
                    onChange={(e) => onMetadataChange({ 
                      ...ruleData.metadata, 
                      id: e.target.value 
                    })}
                    placeholder="Enter unique rule identifier"
                  />
                </div>
                
                <div style={{ width: '150px' }}>
                  <Text 
                    strong 
                    className="rule-builder-label"
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: darkMode ? '#e0e0e0' : 'inherit'
                    }}
                  >
                    Rule Type:
                  </Text>
                  <Select
                    data-testid="rule-type-select"
                    value={ruleData.ruleType}
                    onChange={onRuleTypeChange}
                    style={{ width: '100%' }}
                    options={ruleTypes.map(type => ({ value: type, label: type }))}
                  />
                </div>
                
                <div style={{ width: '100px' }}>
                  <Text 
                    strong 
                    className="rule-builder-label"
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
                    onChange={onVersionChange}
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
            </Space>
            
            <div>
              <Text 
                strong 
                className="rule-builder-label"
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
                onChange={(e) => onMetadataChange({ 
                  ...ruleData.metadata, 
                  description: e.target.value 
                })}
                placeholder="Enter rule description"
                rows={2}
              />
            </div>
          </Space>
          </Panel>
          </Collapse>

          {/* Rule Content Based on Structure */}
          <div className="rule-builder-content">
              {ruleData.structure === 'case' && ruleData.definition && (
                <Case
                  value={ruleData.definition}
                  onChange={onDefinitionChange}
                  config={config}
                  darkMode={darkMode}
                  isLoadedRule={isLoadedRule}
                />
              )}

              {ruleData.structure === 'condition' && ruleData.definition && (
                <ConditionGroup
                  value={ruleData.definition}
                  onChange={onDefinitionChange}
                  config={config}
                  darkMode={darkMode}
                  isLoadedRule={isLoadedRule}
                  isSimpleCondition={true}
                />
              )}

              {ruleData.structure === 'expression' && ruleData.definition && (
                <Expression
                  value={ruleData.definition}
                  onChange={onDefinitionChange}
                  config={config}
                  expectedType={ruleData.returnType}
                  darkMode={darkMode}
                  isLoadedRule={isLoadedRule}
                />
              )}
            </div>
        </Space>
      </Card>
    </div>
  );
};

RuleBuilderUI.displayName = 'RuleBuilderUI';

export default RuleBuilderUI;
