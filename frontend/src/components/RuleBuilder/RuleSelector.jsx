import React, { useState, useEffect } from 'react';
import { Select, Space, message } from 'antd';
import { checkInternalTypeConsistency } from './utils/typeValidation.js';

/**
 * RuleSelector Component
 * 
 * Reusable component for selecting rules from a dropdown.
 * Uses callbacks from config object to load rule data.
 * 
 * Props:
 * - value: Currently selected rule key (ruleId.uuid format)
 * - onChange: Callback when selection changes, receives full rule data
 * - config: Config object containing onSearchRules and onLoadRule callbacks
 * - darkMode: Boolean for dark mode styling
 * - placeholder: Optional placeholder text
 * - showReturnType: Boolean to show return type in dropdown
 * - filterReturnType: Optional return type to filter by
 * - showRuleTypeFilter: Boolean to show rule type filter dropdown
 * - showRuleIdSelector: Boolean to show rule ID selector dropdown (default true)
 * - ruleTypes: Array of available rule types for filter
 * - initialRuleType: Initial rule type filter value (persisted from JSON)
 * - onRuleTypeChange: Optional callback when rule type filter changes
 */
const RuleSelector = ({ 
  value, 
  onChange, 
  config,
  darkMode = false, 
  placeholder = "Search for a rule...",
  showReturnType = false,
  filterReturnType = null,
  showRuleTypeFilter = false,
  showRuleIdSelector = true,
  ruleTypes = ['Reporting', 'Transformation', 'Aggregation', 'Validation'],
  initialRuleType = null,
  onRuleTypeChange = null
}) => {
  const [ruleList, setRuleList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState(initialRuleType);
  
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
    console.log('[RuleSelector] loadRuleIds called', { config: !!config, onSearchRules: !!config?.onSearchRules, selectedRuleType });
    
    if (!config?.onSearchRules) {
      console.warn('[RuleSelector] No onSearchRules callback provided in config');
      return;
    }
    
    try {
      setLoading(true);
      const ruleIds = await config.onSearchRules(selectedRuleType);
      console.log('[RuleSelector] Received ruleIds:', ruleIds);
      
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
      
      console.log('[RuleSelector] Setting ruleList:', { optionsCount: options.length, filteredCount: filteredOptions.length, filterReturnType });
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
    // Notify parent of rule type change
    if (onRuleTypeChange) {
      onRuleTypeChange(ruleType);
    }
  };

  const handleSelect = async (selectedValue) => {
    if (!selectedValue) {
      onChange(null);
      return;
    }

    const selectedRule = ruleList.find(rule => rule.value === selectedValue);
    if (!selectedRule) return;
    
    if (!config?.onLoadRule) {
      console.warn('[RuleSelector] No onLoadRule callback provided in config');
      return;
    }

    try {
      // Load the latest version of the selected rule
      const ruleData = await config.onLoadRule(
        selectedRule.uuid, 
        selectedRule.latestVersion
      );
      
      if (ruleData) {
        // Validate internal consistency
        const consistencyCheck = checkInternalTypeConsistency(ruleData);
        
        if (consistencyCheck.hasInternalMismatch) {
          console.warn(
            `[RuleSelector] Rule ${selectedRule.ruleId} has internal type mismatch: ` +
            `declares ${consistencyCheck.declaredType} but evaluates to ${consistencyCheck.evaluatedType}`
          );
        }
        
        // Pass back both the rule data and metadata
        onChange({
          ruleData: ruleData,
          metadata: {
            ruleId: selectedRule.ruleId,
            uuid: selectedRule.uuid,
            version: selectedRule.latestVersion,
            returnType: selectedRule.returnType,
            ruleType: selectedRule.ruleType,
            hasInternalMismatch: consistencyCheck.hasInternalMismatch,
            internalDeclaredType: consistencyCheck.declaredType,
            internalEvaluatedType: consistencyCheck.evaluatedType
          }
        });
      }
    } catch (error) {
      console.error('Error loading rule:', error);
      message.error('Failed to load selected rule');
    }
  };

  return (
    <>
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
      {showRuleIdSelector && (
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
          // Extract just the ruleId for display when selected
          labelRender={(props) => {
            // When displaying the selected value, show only the ruleId part (before the first dot)
            const ruleId = props.value?.split('.')[0] || props.value;
            const selectedRule = ruleList.find(r => r.value === props.value);
            if (selectedRule) {
              // Show the full formatted label if we found the rule
              return selectedRule.label;
            }
            // Fallback: just show the ruleId
            return ruleId;
          }}
        />
      )}
    </>
  );
};

export default RuleSelector;
