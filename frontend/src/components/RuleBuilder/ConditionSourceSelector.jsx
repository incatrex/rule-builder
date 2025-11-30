import React, { useState } from 'react';
import { Select, Space } from 'antd';
import { BranchesOutlined, GroupOutlined, LinkOutlined } from '@ant-design/icons';

/**
 * ConditionSourceSelector Component
 * 
 * A reusable three-way selector for choosing between Condition, Group, or Rule reference.
 * Used in Condition, ConditionGroup, and Case When headers.
 * 
 * Props:
 * - value: Current source type ('condition', 'conditionGroup', or 'ruleRef')
 * - onChange: Callback when source type changes (newSourceType) => void
 * - disabled: Whether the selector is disabled
 * - expansionPath: Optional path for unique test-id (for testing)
 */
const ConditionSourceSelector = ({ value, onChange, disabled = false, expansionPath }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const sourceOptions = [
    { label: 'Condition', value: 'condition', icon: <BranchesOutlined /> },
    { label: 'Group', value: 'conditionGroup', icon: <GroupOutlined /> },
    { label: 'Rule', value: 'ruleRef', icon: <LinkOutlined /> }
  ];

  return (
    <Select
      data-testid={expansionPath ? `condition-source-selector-${expansionPath}` : 'condition-source-selector'}
      value={value}
      onChange={onChange}
      style={{ width: isDropdownOpen ? 130 : 50, minWidth: 50, transition: 'width 0.2s' }}
      size="small"
      disabled={disabled}
      onDropdownVisibleChange={setIsDropdownOpen}
      onClick={(e) => e.stopPropagation()}
      labelRender={(props) => {
        const option = sourceOptions.find(opt => opt.value === props.value);
        return isDropdownOpen ? (
          <Space size={4}>
            {option?.icon}
            <span>{option?.label}</span>
          </Space>
        ) : (
          <span style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {option?.icon}
          </span>
        );
      }}
      options={sourceOptions}
      optionRender={(option) => (
        <Space size={4}>
          {option.data.icon}
          <span>{option.data.label}</span>
        </Space>
      )}
    />
  );
};

export default ConditionSourceSelector;
