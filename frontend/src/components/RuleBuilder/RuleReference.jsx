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
 */
const RuleReference = ({
  value = {},
  onChange,
  config,
  darkMode = false,
  expectedType = null
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
        {/* RuleSelector with both filter and selector */}
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
          initialRuleType={ruleType}
          onRuleTypeChange={handleRuleTypeChange}
          returnType={returnType}
        />

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
