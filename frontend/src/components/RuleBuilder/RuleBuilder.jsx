import React, { forwardRef, useImperativeHandle } from 'react';
import { RuleService, ConfigService } from '../../services';
import { useRuleBuilder } from './useRuleBuilder';
import { RuleBuilderUI } from './RuleBuilderUI';
import './RuleBuilder.css';

/**
 * RuleBuilder Component
 * 
 * A complete, reusable rule builder component that combines:
 * - useRuleBuilder hook (headless logic)
 * - RuleBuilderUI (presentation)
 * - Default service integration (RuleService, ConfigService)
 * 
 * This component maintains backward compatibility with the original RuleBuilder
 * while also being packageable as an independent component.
 * 
 * ## Features
 * - Build rules with three structures: case, condition, expression
 * - Version management and history
 * - Save/update operations
 * - Fully themeable via CSS variables
 * - Dependency injection support
 * 
 * ## Props
 * @param {Object} config - UI configuration (operators, fields, functions)
 * @param {boolean} darkMode - Enable dark mode styling
 * @param {Function} onRuleChange - Callback when rule data changes
 * @param {string} selectedRuleUuid - UUID of currently selected rule
 * @param {Function} onSaveSuccess - Callback when rule saves successfully
 * @param {Object} ruleService - Optional custom rule service (defaults to RuleService)
 * @param {Object} configService - Optional custom config service (defaults to ConfigService)
 * 
 * ## Exposed Methods (via ref)
 * - getRuleOutput(): Returns the complete rule JSON
 * - loadRuleData(data): Loads rule data from JSON
 * - newRule(data): Creates a new rule with optional initial data
 * 
 * ## Usage Examples
 * 
 * ### Basic Usage
 * ```jsx
 * <RuleBuilder
 *   config={config}
 *   darkMode={false}
 *   onRuleChange={(data) => console.log(data)}
 *   onSaveSuccess={(result) => console.log('Saved:', result)}
 * />
 * ```
 * 
 * ### With Custom Services
 * ```jsx
 * const customRuleService = new CustomRuleService();
 * const customConfigService = new CustomConfigService();
 * 
 * <RuleBuilder
 *   config={config}
 *   ruleService={customRuleService}
 *   configService={customConfigService}
 * />
 * ```
 * 
 * ### Accessing Methods via Ref
 * ```jsx
 * const ruleBuilderRef = useRef(null);
 * 
 * // Get rule output
 * const output = ruleBuilderRef.current.getRuleOutput();
 * 
 * // Load existing rule
 * ruleBuilderRef.current.loadRuleData(existingRule);
 * 
 * // Create new rule
 * ruleBuilderRef.current.newRule({ structure: 'case' });
 * ```
 */
const RuleBuilder = forwardRef(({
  config,
  darkMode = false,
  onRuleChange,
  selectedRuleUuid,
  onSaveSuccess,
  ruleService: customRuleService,
  configService: customConfigService
}, ref) => {
  // Initialize services (use custom or default)
  const ruleService = customRuleService || new RuleService();
  const configService = customConfigService || new ConfigService();

  // Use the headless hook for all logic
  const {
    ruleData,
    availableVersions,
    loadingVersions,
    ruleTypes,
    isLoadedRule,
    handleChange,
    handleStructureChange,
    handleVersionChange,
    handleSaveRule,
    getRuleOutput,
    loadRuleData,
    newRule
  } = useRuleBuilder({
    ruleService,
    configService,
    selectedRuleUuid,
    onRuleChange,
    onSaveSuccess
  });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getRuleOutput,
    loadRuleData,
    newRule
  }));

  // Create callback handlers for UI
  const handleMetadataChange = (metadata) => {
    handleChange({ metadata });
  };

  const handleRuleTypeChange = (ruleType) => {
    handleChange({ ruleType });
  };

  const handleReturnTypeChange = (returnType) => {
    handleChange({ returnType });
  };

  const handleDefinitionChange = (definition) => {
    handleChange({ definition });
  };

  return (
    <RuleBuilderUI
      ruleData={ruleData}
      availableVersions={availableVersions}
      loadingVersions={loadingVersions}
      ruleTypes={ruleTypes}
      isLoadedRule={isLoadedRule}
      config={config}
      darkMode={darkMode}
      selectedRuleUuid={selectedRuleUuid}
      onMetadataChange={handleMetadataChange}
      onRuleTypeChange={handleRuleTypeChange}
      onVersionChange={handleVersionChange}
      onReturnTypeChange={handleReturnTypeChange}
      onStructureChange={handleStructureChange}
      onDefinitionChange={handleDefinitionChange}
      onSave={handleSaveRule}
    />
  );
});

RuleBuilder.displayName = 'RuleBuilder';

export default RuleBuilder;
