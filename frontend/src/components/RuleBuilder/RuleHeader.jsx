import React from 'react';
import { Card, Button, Space, Divider } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

/**
 * RuleHeader Component
 * 
 * Fixed header showing rule metadata (read-only) with save button.
 * This header stays at the top while other components scroll underneath.
 */
export const RuleHeader = ({
  ruleData,
  onSave,
  darkMode = false
}) => {
  return (
    <Card
      style={{
        background: darkMode ? '#1f1f1f' : '#ffffff',
        border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
        marginBottom: '16px'
      }}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <Space style={{ width: '100%', justifyContent: 'space-between' }} size="middle">
        <Space size="small" split={<Divider type="vertical" />}>
          <span style={{ color: darkMode ? '#e0e0e0' : '#000' }}>
            <strong>Rule ID:</strong> {ruleData.metadata.id || '(not set)'}
          </span>
          <span style={{ color: darkMode ? '#e0e0e0' : '#000' }}>
            <strong>Type:</strong> {ruleData.ruleType}
          </span>
          <span style={{ color: darkMode ? '#e0e0e0' : '#000' }}>
            <strong>Version:</strong> {ruleData.version}
          </span>
        </Space>
        <Button 
          data-testid="rule-save-button"
          type="primary"
          icon={<SaveOutlined />}
          onClick={onSave}
          disabled={!ruleData.metadata.id}
        >
          Save Rule
        </Button>
      </Space>
    </Card>
  );
};

export default RuleHeader;
