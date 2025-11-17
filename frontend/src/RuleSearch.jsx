import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, Button, Select, Space, message } from 'antd';
import { PlusOutlined, SearchOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { RuleService } from './services/RuleService.js';

/**
 * RuleSearch Component
 * 
 * Provides rule discovery and selection functionality:
 * - New Rule button to create empty rules
 * - Searchable dropdown to select existing rules
 * - Loads selected rule into RuleBuilder
 * 
 * Exposed methods via ref:
 * - refresh(): Reloads the rule list from the server
 */
const RuleSearch = forwardRef(({ onRuleSelect, onNewRule, darkMode = false, onCollapse = null }, ref) => {
  const [ruleList, setRuleList] = useState([]);
  const [selectedRuleKey, setSelectedRuleKey] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Initialize RuleService
  const ruleService = new RuleService();

  useEffect(() => {
    loadRuleIds();
  }, []);

  const loadRuleIds = async () => {
    try {
      setLoading(true);
      const ruleIds = await ruleService.getRuleIds();
      
      // Transform the data for the Select component
      const options = ruleIds.map(rule => {
        // Build display label with folder path if present
        const folderPrefix = rule.folderPath ? `${rule.folderPath}/` : '';
        const displayLabel = `${folderPrefix}${rule.ruleId} (v${rule.latestVersion})`;
        
        return {
          value: `${rule.ruleId}.${rule.uuid}`,
          label: displayLabel,
          ruleId: rule.ruleId,
          uuid: rule.uuid,
          latestVersion: rule.latestVersion,
          folderPath: rule.folderPath || ''
        };
      });
      
      setRuleList(options);
    } catch (error) {
      console.error('Error loading rule IDs:', error);
      message.error('Failed to load rule list');
    } finally {
      setLoading(false);
    }
  };

  const handleRuleSelect = async (value) => {
    if (!value) {
      setSelectedRuleKey(null);
      return;
    }

    const selectedRule = ruleList.find(rule => rule.value === value);
    if (!selectedRule) return;

    try {
      // Load the latest version of the selected rule
      const ruleData = await ruleService.getRuleByVersion(
        selectedRule.ruleId, 
        selectedRule.uuid, 
        selectedRule.latestVersion
      );
      
      if (ruleData) {
        setSelectedRuleKey(value);
        onRuleSelect(ruleData, selectedRule.uuid);
      }
    } catch (error) {
      console.error('Error loading rule:', error);
      message.error('Failed to load selected rule');
    }
  };

  const handleNewRule = () => {
    setSelectedRuleKey(null);
    onNewRule();
  };

  const handleRefresh = () => {
    loadRuleIds();
  };

  // Expose refresh method to parent components via ref
  useImperativeHandle(ref, () => ({
    refresh: loadRuleIds,
  }));

  return (
    <Card
      title={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%'
        }}>
          <span>Rule Search</span>
          {onCollapse && (
            <Button 
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={onCollapse}
              size="small"
              style={{ 
                marginRight: '-8px',
                color: darkMode ? '#e0e0e0' : '#666'
              }}
              title="Hide Search Panel"
            />
          )}
        </div>
      }
      size="small"
      style={{
        background: darkMode ? '#1f1f1f' : '#ffffff',
        border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
        height: '100%'
      }}
      styles={{ body: { padding: '12px' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        
        {/* New Rule Button */}
        <Button 
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleNewRule}
          size="small"
          style={{ width: '100%' }}
        >
          New Rule
        </Button>

        {/* Rule Selection Dropdown */}
        <div>
          <div style={{ 
            fontSize: '12px', 
            marginBottom: '4px',
            color: darkMode ? '#e0e0e0' : '#666'
          }}>
            Select Existing Rule:
          </div>
          
          <Space.Compact style={{ width: '100%' }}>
            <Select
              showSearch
              placeholder="Search rules..."
              value={selectedRuleKey}
              onChange={handleRuleSelect}
              loading={loading}
              style={{ flex: 1 }}
              size="small"
              allowClear
              filterOption={(input, option) =>
                option?.label?.toLowerCase().includes(input.toLowerCase())
              }
              options={ruleList}
            />
            <Button 
              icon={<SearchOutlined />}
              onClick={handleRefresh}
              size="small"
              title="Refresh rule list"
            />
          </Space.Compact>
        </div>

        {/* Selected Rule Info */}
        {selectedRuleKey && (
          <div style={{
            fontSize: '11px',
            color: darkMode ? '#888' : '#666',
            padding: '8px',
            background: darkMode ? '#2a2a2a' : '#f5f5f5',
            borderRadius: '4px'
          }}>
            <div><strong>Selected:</strong></div>
            <div>{ruleList.find(r => r.value === selectedRuleKey)?.label}</div>
          </div>
        )}

      </Space>
    </Card>
  );
});

export default RuleSearch;
