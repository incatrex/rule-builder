import { useState } from 'react';
import { Table, Button, Modal, Card, Dropdown } from 'antd';
import { ExclamationCircleOutlined, UpOutlined, DownOutlined, EllipsisOutlined } from '@ant-design/icons';
import './RuleHistory.css';

/**
 * RuleHistoryUI - Presentation component for rule version history
 * 
 * @param {Object} props - Component props
 * @param {Array} props.history - Array of history records
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onView - Callback when viewing a version: (record) => void
 * @param {Function} props.onRestore - Callback when restoring a version: (record) => Promise<void>
 * @param {boolean} props.hasRuleSelected - Whether a rule is selected
 * @param {Object} props.theme - Theme customization via CSS variables
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.classNames - Override specific part classes
 * @param {Object} props.sx - Style object
 * @param {boolean} props.unstyled - Disable default styles
 * @param {Object} props.messages - Customizable messages
 */
export const RuleHistoryUI = ({
  history = [],
  loading = false,
  onView,
  onRestore,
  hasRuleSelected = false,
  
  // Styling options
  theme,
  className = '',
  classNames = {},
  sx = {},
  unstyled = false,
  
  // Collapse options
  collapsible = true,
  defaultCollapsed = false,
  maxHeight = 'calc(50vh - 100px)', // Max height before scrolling
  
  // Customization
  messages = {
    noRuleSelected: 'Select a rule to view its version history',
    title: 'Rule History',
    confirmRestore: (ruleId, version) => 
      `Are you sure you want to restore ${ruleId} version ${version}? This will create a new version with the content from version ${version}.`,
    restoreSuccess: (version) => `Version ${version} restored successfully`,
    restoreError: 'Failed to restore version',
    confirmTitle: 'Restore Version',
    okText: 'Restore',
    cancelText: 'Cancel',
  },
  
  // Table customization
  showRuleId = true,
  pageSize = null, // null = no pagination
  scrollY = 150,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleRestore = (record) => {
    Modal.confirm({
      title: messages.confirmTitle,
      icon: <ExclamationCircleOutlined />,
      content: messages.confirmRestore(record.ruleId, record.version),
      okText: messages.okText,
      okType: 'primary',
      cancelText: messages.cancelText,
      onOk: () => onRestore(record),
    });
  };

  const columns = [
    showRuleId && {
      title: 'Rule ID',
      dataIndex: 'ruleId',
      key: 'ruleId',
      width: '20%',
      className: classNames.columnRuleId,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: showRuleId ? '12%' : '15%',
      className: classNames.columnVersion,
    },
    {
      title: 'Modified By',
      dataIndex: 'modifiedBy',
      key: 'modifiedBy',
      width: '22%',
      className: classNames.columnModifiedBy,
    },
    {
      title: 'Modified On',
      dataIndex: 'modifiedOn',
      key: 'modifiedOn',
      width: '26%',
      className: classNames.columnModifiedOn,
      render: (timestamp) => new Date(timestamp).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      className: classNames.columnActions,
      render: (_, record, index) => {
        const menuItems = [
          {
            key: 'view',
            label: <span data-testid={`rule-history-view-v${record.version}`}>View</span>,
            onClick: () => onView(record),
          },
        ];
        
        if (index !== 0) {
          menuItems.push({
            key: 'restore',
            label: <span data-testid={`rule-history-restore-v${record.version}`}>Restore</span>,
            onClick: () => handleRestore(record),
          });
        }
        
        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button 
              size="small" 
              icon={<EllipsisOutlined />}
              className={classNames.actionsButton}
              data-testid={`rule-history-actions-v${record.version}`}
            />
          </Dropdown>
        );
      },
    },
  ].filter(Boolean); // Remove falsy columns (e.g., when showRuleId is false)

  // Generate CSS variable styles from theme
  const themeVars = theme ? {
    '--rh-background': theme.background,
    '--rh-text-color': theme.textColor,
    '--rh-border-color': theme.borderColor,
    '--rh-primary-color': theme.primaryColor,
    '--rh-spacing': theme.spacing,
    '--rh-font-size': theme.fontSize,
    '--rh-font-family': theme.fontFamily,
  } : {};

  const rootClassName = unstyled 
    ? className 
    : `rule-history-container ${classNames.root || ''} ${className}`.trim();

  if (!hasRuleSelected) {
    return (
      <div className={rootClassName}>
        <Card
          title={messages.title}
          className="rule-history-card"
          style={{
            background: theme?.background || '#ffffff',
            border: `1px solid ${theme?.borderColor || '#d9d9d9'}`,
            ...themeVars,
            ...sx
          }}
        >
          <div className={classNames.empty || 'rule-history__empty'}>
            {messages.noRuleSelected}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{messages.title}</span>
            {collapsible && (
              <Button
                type="text"
                size="small"
                icon={collapsed ? <DownOutlined /> : <UpOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ marginLeft: 'auto' }}
              />
            )}
          </div>
        }
        className="rule-history-card"
        style={{
          background: theme?.background || '#ffffff',
          border: `1px solid ${theme?.borderColor || '#d9d9d9'}`,
          marginBottom: collapsed ? '16px' : '0',
          ...themeVars,
          ...sx
        }}
        data-component="rule-history"
      >
        {!collapsed && (
        <div style={{ maxHeight, overflow: 'auto' }}>
        <Table
          className={classNames.table || 'rule-history__table'}
          columns={columns}
          dataSource={history}
          loading={loading}
          rowKey={(record) => `${record.ruleId}-${record.version}`}
          pagination={pageSize ? { pageSize } : false}
          size="small"
        />
        </div>
        )}
      </Card>
    </div>
  );
};
