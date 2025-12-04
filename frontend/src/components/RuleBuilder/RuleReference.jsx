import React from 'react';
import { Card, Space, Typography, Tag, Alert } from 'antd';
import RuleSelector from './RuleSelector';
import { getInternalMismatchMessage, getContextMismatchMessage } from './utils/typeValidation';

const { Text } = Typography;

/**
 * RuleReference Component
 * 
 * Reusable component for selecting and displaying rule references.
 * Used by Expression, Condition, and ConditionGroup components when in ruleRef mode.
 * 
 * Props:
 * - value: RuleRef object { id, uuid, version, returnType, ruleType, hasInternalMismatch, ... }
 * - onChange: Callback when rule selection changes
 * - config: Config with ruleTypes, etc.
 * - darkMode: Dark mode styling
 * - expectedType: Expected return type for validation (e.g., 'boolean' for conditions)
 * - ruleTypeConstraint: { mode: 'const'|'default', value: 'RuleType' } or null
 */
const RuleReference = ({
  value = {},
  onChange,
  config,
  darkMode = false,
  expectedType = null,
  ruleTypeConstraint = null
}) => {
  const {
    id,
    uuid,
    version,
    returnType,
    ruleType,
    hasInternalMismatch,
    internalDeclaredType,
    internalEvaluatedType
  } = value;

  // Build rule key for selector (must match RuleSelector's format: ruleId.uuid)
  const ruleKey = id && uuid ? `${id}.${uuid}` : null;

  // Check if we're still waiting for config to load
  const waitingForConfig = React.useMemo(() => {
    if (!ruleTypeConstraint) return false;
    
    // If config object doesn't exist yet, we're waiting
    if (!config) return true;
    
    // If ruleTypes array doesn't exist or is empty, config isn't fully loaded yet
    if (!config.ruleTypes || config.ruleTypes.length === 0) return true;
    
    // If we need a const value but don't have it yet, we're waiting
    if (ruleTypeConstraint.mode === 'const' && !ruleTypeConstraint.value) {
      return true;
    }
    
    // If we need allowlist values but don't have them yet, we're waiting
    if (ruleTypeConstraint.mode === 'allowlist' && (!Array.isArray(ruleTypeConstraint.values) || ruleTypeConstraint.values.length === 0)) {
      return true;
    }
    
    return false;
  }, [ruleTypeConstraint, config]);

  // Validate required config values based on constraint mode
  // Only check for errors AFTER config has finished loading
  const configError = React.useMemo(() => {
    // Don't show errors while still waiting for config
    if (waitingForConfig) return null;
    
    if (!ruleTypeConstraint || !config) return null;
    
    // At this point config should be loaded, so missing values are true errors
    if (ruleTypeConstraint.mode === 'const' && !ruleTypeConstraint.value) {
      console.error('[RuleReference] conditionGroupRuleType is missing from config:', config);
      return 'Configuration error: conditionGroupRuleType is missing from schema config';
    }
    
    if (ruleTypeConstraint.mode === 'allowlist' && (!Array.isArray(ruleTypeConstraint.values) || ruleTypeConstraint.values.length === 0)) {
      console.error('[RuleReference] conditionAllowedRuleTypes is missing from config:', config);
      return 'Configuration error: conditionAllowedRuleTypes is missing from schema config';
    }
    
    return null;
  }, [ruleTypeConstraint, config, waitingForConfig]);

  // Determine initial ruleType: use existing value, or constraint value
  const effectiveInitialRuleType = ruleType || ruleTypeConstraint?.value || null;

  const handleRuleTypeChange = (newRuleType) => {
    onChange({
      ...value,
      ruleType: newRuleType,
      id: null,
      uuid: null,
      version: null
    });
  };

  const handleRuleChange = (selection) => {
    if (!selection) {
      onChange({
        id: null,
        uuid: null,
        version: null,
        returnType: null,
        ruleType: value.ruleType
      });
      return;
    }

    const { metadata } = selection;
    onChange({
      id: metadata.ruleId,
      uuid: metadata.uuid,
      version: metadata.version,
      returnType: metadata.returnType,
      ruleType: metadata.ruleType,
      hasInternalMismatch: metadata.hasInternalMismatch,
      internalDeclaredType: metadata.internalDeclaredType,
      internalEvaluatedType: metadata.internalEvaluatedType
    });
  };

  // Check for type mismatches
  const hasContextMismatch = expectedType && returnType && expectedType !== returnType;
  const contextMismatchMessage = hasContextMismatch 
    ? getContextMismatchMessage(returnType, expectedType)
    : null;
  const internalMismatchMessage = hasInternalMismatch
    ? getInternalMismatchMessage(internalDeclaredType, internalEvaluatedType)
    : null;

  return (
    <Card
      size="small"
      style={{
        marginTop: '8px',
        backgroundColor: darkMode ? '#1f1f1f' : '#fafafa',
        border: darkMode ? '1px solid #303030' : '1px solid #d9d9d9'
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* Configuration Error */}
        {configError && (
          <Alert
            message={configError}
            description="Schema config is not loaded properly. Rule type constraints are missing."
            type="error"
            showIcon
            style={{ fontSize: '12px', padding: '8px' }}
          />
        )}
        
        {/* Loading state while waiting for config */}
        {waitingForConfig && !configError && (
          <div style={{ padding: '8px', textAlign: 'center', color: darkMode ? '#888' : '#999' }}>
            Loading configuration...
          </div>
        )}
        
        {/* RuleSelector with both filter and selector */}
        {!configError && !waitingForConfig && (
          <RuleSelector
            value={ruleKey}
            onChange={handleRuleChange}
            config={config}
            darkMode={darkMode}
            placeholder="Select a rule"
            showReturnType={true}
            filterReturnType={expectedType}
            showRuleTypeFilter={true}
            showRuleIdSelector={true}
            ruleTypes={config?.ruleTypes || []}
            initialRuleType={effectiveInitialRuleType}
            onRuleTypeChange={handleRuleTypeChange}
            returnType={returnType}
            ruleTypeConstraint={ruleTypeConstraint}
          />
        )}

        {/* Warning Messages */}
        {internalMismatchMessage && (
          <Alert
            message={internalMismatchMessage}
            type="warning"
            showIcon
            style={{ fontSize: '12px', padding: '4px 8px' }}
          />
        )}
        {contextMismatchMessage && (
          <Alert
            message={contextMismatchMessage}
            type="error"
            showIcon
            style={{ fontSize: '12px', padding: '4px 8px' }}
          />
        )}
      </Space>
    </Card>
  );
};

export default RuleReference;
