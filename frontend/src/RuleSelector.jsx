import React, { useState, useEffect } from 'react';
import { Select, message } from 'antd';
import { RuleService } from './services/RuleService.js';

/**
 * RuleSelector Component
 * 
 * Reusable component for selecting rules from a dropdown.
 * Used by both RuleSearch and Expression components.
 * 
 * Props:
 * - value: Currently selected rule key (ruleId.uuid format)
 * - onChange: Callback when selection changes, receives full rule data
 * - darkMode: Boolean for dark mode styling
 * - placeholder: Optional placeholder text
 * - showReturnType: Boolean to show return type in dropdown
 * - filterReturnType: Optional return type to filter by
 */
const RuleSelector = ({ 
  value, 
  onChange, 
  darkMode = false, 
  placeholder = "Search for a rule...",
  showReturnType = false,
  filterReturnType = null
}) => {
  const [ruleList, setRuleList] = useState([]);
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
        const returnTypeLabel = showReturnType && rule.returnType ? ` [${rule.returnType}]` : '';
        const displayLabel = `${folderPrefix}${rule.ruleId} (v${rule.latestVersion})${returnTypeLabel}`;
        
        return {
          value: `${rule.ruleId}.${rule.uuid}`,
          label: displayLabel,
          ruleId: rule.ruleId,
          uuid: rule.uuid,
          latestVersion: rule.latestVersion,
          folderPath: rule.folderPath || '',
          returnType: rule.returnType || 'unknown'
        };
      });
      
      // Filter by return type if specified
      const filteredOptions = filterReturnType 
        ? options.filter(opt => opt.returnType === filterReturnType)
        : options;
      
      setRuleList(filteredOptions);
    } catch (error) {
      console.error('Error loading rule IDs:', error);
      message.error('Failed to load rule list');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (selectedValue) => {
    if (!selectedValue) {
      onChange(null);
      return;
    }

    const selectedRule = ruleList.find(rule => rule.value === selectedValue);
    if (!selectedRule) return;

    try {
      // Load the latest version of the selected rule
      const ruleData = await ruleService.getRuleByVersion(
        selectedRule.ruleId, 
        selectedRule.uuid, 
        selectedRule.latestVersion
      );
      
      if (ruleData) {
        // Pass back both the rule data and metadata
        onChange({
          ruleData: ruleData,
          metadata: {
            ruleId: selectedRule.ruleId,
            uuid: selectedRule.uuid,
            version: selectedRule.latestVersion,
            returnType: selectedRule.returnType
          }
        });
      }
    } catch (error) {
      console.error('Error loading rule:', error);
      message.error('Failed to load selected rule');
    }
  };

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      onChange={handleSelect}
      loading={loading}
      options={ruleList}
      filterOption={(input, option) =>
        option.label.toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
      dropdownStyle={{ minWidth: '400px' }}
    />
  );
};

export default RuleSelector;
