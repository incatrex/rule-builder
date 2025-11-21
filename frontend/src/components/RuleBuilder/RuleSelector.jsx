import React, { useState, useEffect } from 'react';
import { Select, Space, message } from 'antd';
import { RuleService } from '../../services/RuleService.js';

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
 * - showRuleTypeFilter: Boolean to show rule type filter dropdown
 * - ruleTypes: Array of available rule types for filter
 * - initialRuleType: Initial rule type filter value (persisted from JSON)
 */
const RuleSelector = ({ 
  value, 
  onChange, 
  darkMode = false, 
  placeholder = "Search for a rule...",
  showReturnType = false,
  filterReturnType = null,
  showRuleTypeFilter = false,
  ruleTypes = ['Reporting', 'Transformation', 'Aggregation', 'Validation'],
  initialRuleType = null
}) => {
  const [ruleList, setRuleList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState(initialRuleType);
  
  // Initialize RuleService
  const ruleService = new RuleService();
  
  // Ensure ruleTypes is always an array with defaults
  const safeRuleTypes = Array.isArray(ruleTypes) && ruleTypes.length > 0 
    ? ruleTypes 
    : ['Reporting', 'Transformation', 'Aggregation', 'Validation'];

  // Update selectedRuleType when initialRuleType prop changes
  useEffect(() => {
    setSelectedRuleType(initialRuleType);
  }, [initialRuleType]);

  useEffect(() => {
    loadRuleIds();
  }, [selectedRuleType]);

  const loadRuleIds = async () => {
    try {
      setLoading(true);
      const ruleIds = await ruleService.getRuleIds(selectedRuleType);
      
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
          returnType: rule.returnType || 'unknown',
          ruleType: rule.ruleType || 'unknown'
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
  
  const handleRuleTypeChange = (ruleType) => {
    setSelectedRuleType(ruleType);
    // Clear selected rule when filter changes
    if (onChange) {
      onChange(null);
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
      const ruleData = await ruleService.getRuleVersion(
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
            returnType: selectedRule.returnType,
            ruleType: selectedRule.ruleType
          }
        });
      }
    } catch (error) {
      console.error('Error loading rule:', error);
      message.error('Failed to load selected rule');
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {/* Rule Type Filter */}
      {showRuleTypeFilter && (
        <Select
          value={selectedRuleType}
          onChange={handleRuleTypeChange}
          placeholder="Filter by Rule Type..."
          allowClear
          style={{ width: '100%' }}
          options={safeRuleTypes.map(type => ({ value: type, label: type }))}
        />
      )}
      
      {/* Rule Selector */}
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
    </Space>
  );
};

export default RuleSelector;
