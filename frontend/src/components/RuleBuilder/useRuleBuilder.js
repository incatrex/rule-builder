import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { createDirectExpression } from './Expression';

/**
 * useRuleBuilder Hook
 * 
 * Headless custom hook that manages all rule builder logic including:
 * - Rule state management (structure, returnType, metadata, definition)
 * - Version management and loading
 * - Save/update operations
 * - Definition initialization
 * - Rule type configuration
 * 
 * This hook is designed for dependency injection - services are passed as parameters
 * so it can work with any API implementation.
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.ruleService - Service for rule CRUD operations
 * @param {Object} options.configService - Service for config/settings
 * @param {string} options.selectedRuleUuid - UUID of currently selected rule
 * @param {Function} options.onRuleChange - Callback when rule data changes
 * @param {Function} options.onSaveSuccess - Callback when rule saves successfully
 * 
 * @returns {Object} Rule builder state and methods
 */
export const useRuleBuilder = ({ 
  ruleService, 
  configService,
  selectedRuleUuid,
  onRuleChange,
  onSaveSuccess 
}) => {
  // Core rule state
  const [ruleData, setRuleData] = useState({
    structure: 'condition',
    returnType: 'boolean',
    uuId: null,
    version: 1,
    ruleType: 'Reporting',
    metadata: {
      id: '',
      description: ''
    },
    definition: null
  });

  // Version management state
  const [availableVersions, setAvailableVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  
  // Configuration state
  const [ruleTypes, setRuleTypes] = useState(['Reporting', 'Validation', 'Calculation', 'Business']);
  
  // UI state flags
  const [isLoadedRule, setIsLoadedRule] = useState(false);

  // Initialize definition on mount
  useEffect(() => {
    if (!ruleData.definition) {
      initializeDefinition(ruleData.structure);
    }
  }, []);

  // Load rule types from config service
  useEffect(() => {
    const loadRuleTypes = async () => {
      if (!configService) return;
      
      try {
        const config = await configService.getConfig();
        if (config.ruleTypes && Array.isArray(config.ruleTypes) && config.ruleTypes.length > 0) {
          setRuleTypes(config.ruleTypes);
          // Update current ruleType if it's not in the new list
          if (!config.ruleTypes.includes(ruleData.ruleType)) {
            handleChange({ ruleType: config.ruleTypes[0] });
          }
        }
      } catch (error) {
        console.error('Error loading rule types:', error);
        // Keep default values if API fails
      }
    };

    loadRuleTypes();
  }, [configService]);

  // Load versions when selectedRuleUuid changes
  useEffect(() => {
    if (selectedRuleUuid) {
      loadVersionsForRule(selectedRuleUuid);
    }
  }, [selectedRuleUuid]);

  // Notify parent of changes
  useEffect(() => {
    if (onRuleChange) {
      onRuleChange(ruleData);
    }
  }, [ruleData, onRuleChange]);

  /**
   * Load all versions for a specific rule UUID
   */
  const loadVersionsForRule = useCallback(async (uuid) => {
    if (!ruleService) return;
    
    try {
      setLoadingVersions(true);
      const versionNumbers = await ruleService.getVersionNumbers(uuid);
      const versionOptions = versionNumbers.map(v => ({
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
  }, [ruleService]);

  /**
   * Handle version selection change
   */
  const handleVersionChange = useCallback(async (version) => {
    if (!selectedRuleUuid) {
      handleChange({ version });
      return;
    }

    if (!ruleService) return;

    try {
      const ruleVersionData = await ruleService.getRuleVersion(selectedRuleUuid, version);
      
      if (ruleVersionData) {
        const structure = ruleVersionData.structure || 'condition';
        const definition = ruleVersionData.definition || ruleVersionData[structure] || null;
        
        setRuleData({
          structure,
          returnType: ruleVersionData.returnType || 'boolean',
          ruleType: ruleVersionData.ruleType || 'Reporting',
          uuId: ruleVersionData.uuId || selectedRuleUuid,
          version: ruleVersionData.version || version,
          metadata: ruleVersionData.metadata || { id: '', description: '' },
          definition
        });
        
        setIsLoadedRule(true);
        message.success(`Loaded version ${version}`);
      }
    } catch (error) {
      console.error('Error loading version:', error);
      message.error(`Failed to load version ${version}`);
    }
  }, [selectedRuleUuid, ruleService]);

  /**
   * Update rule data (merge with existing)
   */
  const handleChange = useCallback((updates) => {
    setRuleData(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Initialize definition based on structure type
   */
  const initializeDefinition = useCallback((structure) => {
    let definition = null;
    
    if (structure === 'case') {
      definition = {
        whenClauses: [
          {
            when: {
              type: 'conditionGroup',
              returnType: 'boolean',
              name: 'Condition 1',
              conjunction: 'AND',
              not: false,
              conditions: [
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
          {
            type: 'condition',
            returnType: 'boolean',
            name: 'Condition 1',
            left: {
              type: 'field',
              returnType: 'number',
              field: 'TABLE1.NUMBER_FIELD_01'
            },
            operator: 'equal',
            right: {
              type: 'value',
              returnType: 'number',
              value: 0
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
  }, [handleChange, ruleData.returnType]);

  /**
   * Handle structure change (case/condition/expression)
   */
  const handleStructureChange = useCallback((newStructure) => {
    handleChange({ 
      structure: newStructure,
      returnType: newStructure === 'case' || newStructure === 'condition' ? 'boolean' : 'number'
    });
    initializeDefinition(newStructure);
  }, [handleChange, initializeDefinition]);

  /**
   * Save or update rule
   */
  const handleSaveRule = useCallback(async () => {
    if (!ruleData.metadata.id) {
      message.warning('Please enter a Rule ID');
      return;
    }

    if (!ruleService) {
      message.error('Rule service not available');
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
      
      // Update local state with server response
      handleChange({ 
        uuId: result.uuid,
        version: result.version 
      });
      
      // Refresh available versions
      if (selectedRuleUuid === result.uuid || !selectedRuleUuid) {
        await loadVersionsForRule(result.uuid);
      }
      
      // Call success callback
      if (onSaveSuccess) {
        onSaveSuccess(result);
      }
      
    } catch (error) {
      console.error('Error saving rule:', error);
      message.error('Failed to save rule: ' + (error.response?.data?.error || error.message));
    }
  }, [ruleData, ruleService, selectedRuleUuid, loadVersionsForRule, handleChange, onSaveSuccess]);

  /**
   * Get clean rule output (without UI state)
   */
  const getRuleOutput = useCallback(() => {
    const cleanDefinition = removeUIState(ruleData.definition);
    
    return {
      structure: ruleData.structure,
      returnType: ruleData.returnType,
      ruleType: ruleData.ruleType,
      uuId: ruleData.uuId,
      version: ruleData.version,
      metadata: ruleData.metadata,
      definition: cleanDefinition
    };
  }, [ruleData]);

  /**
   * Recursively remove UI state properties
   */
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

  /**
   * Load rule data from JSON
   */
  const loadRuleData = useCallback((data) => {
    const structure = data.structure || 'condition';
    
    // Support both formats:
    // 1. Definition format (new): { structure: "case", definition: {...} }
    // 2. Dynamic key format (old): { structure: "case", case: {...} }
    let content = data.definition || data[structure] || null;
    
    setRuleData({
      structure,
      returnType: data.returnType || 'boolean',
      ruleType: data.ruleType || 'Reporting',
      uuId: data.uuId || null,
      version: data.version || 1,
      metadata: data.metadata || { id: '', description: '' },
      definition: content
    });
    
    setIsLoadedRule(true);
    
    // If content is null, initialize it based on structure
    if (!content) {
      setTimeout(() => {
        initializeDefinition(structure);
      }, 0);
    }
  }, [initializeDefinition]);

  /**
   * Create new rule with optional initial data
   */
  const newRule = useCallback((data = {}) => {
    const structure = data.structure || 'condition';
    
    setRuleData({
      structure,
      returnType: data.returnType || 'boolean',
      ruleType: data.ruleType || 'Reporting',
      uuId: null,
      version: 1,
      metadata: data.metadata || { id: '', description: '' },
      definition: null
    });
    
    setIsLoadedRule(false);
    
    // Initialize definition based on structure
    setTimeout(() => {
      initializeDefinition(structure);
    }, 0);
  }, [initializeDefinition]);

  return {
    // State
    ruleData,
    availableVersions,
    loadingVersions,
    ruleTypes,
    isLoadedRule,
    
    // Methods
    handleChange,
    handleStructureChange,
    handleVersionChange,
    handleSaveRule,
    getRuleOutput,
    loadRuleData,
    newRule,
    loadVersionsForRule
  };
};

export default useRuleBuilder;
