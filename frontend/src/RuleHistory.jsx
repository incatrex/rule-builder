import { useState, useEffect } from 'react';
import { Table, Button, Modal, Tag, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const RuleHistory = ({ selectedRuleUuid, onViewVersion, onRestoreComplete, darkMode }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedRuleUuid) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [selectedRuleUuid]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/api/rules/${selectedRuleUuid}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        message.error('Failed to load rule history');
      }
    } catch (error) {
      message.error('Error loading rule history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (record) => {
    if (onViewVersion) {
      onViewVersion(selectedRuleUuid, record.version);
    }
  };

  const handleRestore = (record) => {
    Modal.confirm({
      title: 'Restore Version',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to restore ${record.ruleId} version ${record.version}? This will create a new version with the content from version ${record.version}.`,
      okText: 'Restore',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(
            `http://localhost:8080/api/rules/${selectedRuleUuid}/restore/${record.version}`,
            { method: 'POST' }
          );
          
          if (response.ok) {
            message.success(`Version ${record.version} restored successfully`);
            await fetchHistory(); // Refresh history
            if (onRestoreComplete) {
              onRestoreComplete();
            }
          } else {
            const errorText = await response.text();
            message.error('Failed to restore version: ' + errorText);
          }
        } catch (error) {
          message.error('Error restoring version: ' + error.message);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Rule ID',
      dataIndex: 'ruleId',
      key: 'ruleId',
      width: '20%',
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: '12%',
      render: (version, record, index) => (
        <>
          {version}
          {index === 0 && <Tag color="blue" style={{ marginLeft: 8 }}>Current</Tag>}
        </>
      ),
    },
    {
      title: 'Modified By',
      dataIndex: 'modifiedBy',
      key: 'modifiedBy',
      width: '22%',
    },
    {
      title: 'Modified On',
      dataIndex: 'modifiedOn',
      key: 'modifiedOn',
      width: '26%',
      render: (timestamp) => new Date(timestamp).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '20%',
      render: (_, record, index) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="small" onClick={() => handleView(record)}>
            View
          </Button>
          {index !== 0 && (
            <Button size="small" onClick={() => handleRestore(record)}>
              Restore
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!selectedRuleUuid) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: darkMode ? '#999' : '#666', fontSize: '13px' }}>
        Select a rule to view its version history
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <h4 style={{ marginTop: 0, marginBottom: '12px', color: darkMode ? '#fff' : '#000', fontSize: '14px' }}>
        Version History
      </h4>
      <Table
        columns={columns}
        dataSource={history}
        loading={loading}
        rowKey={(record) => `${record.ruleId}-${record.version}`}
        pagination={false}
        size="small"
        scroll={{ y: 150 }}
      />
    </div>
  );
};

export default RuleHistory;
