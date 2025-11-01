import React, { useState, useEffect } from 'react';
import { Query, Builder, Utils as QbUtils } from 'react-awesome-query-builder';
import { Layout, Card, Button, Input, Space, message, Spin } from 'antd';
import AntdConfig from 'react-awesome-query-builder/lib/config/antd';
import 'react-awesome-query-builder/lib/css/styles.css';
import 'antd/dist/antd.css';
import axios from 'axios';

const { Header, Content } = Layout;

const App = () => {
  const [config, setConfig] = useState(null);
  const [tree, setTree] = useState(null);
  const [ruleId, setRuleId] = useState('rule1');
  const [version, setVersion] = useState('1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const fieldsResponse = await axios.get('/api/fields');
      const fields = fieldsResponse.data;

      // Use AntdConfig as base and only override fields
      const mergedConfig = {
        ...AntdConfig,
        fields: fields
      };

      setConfig(mergedConfig);
      
      // Initialize tree with the new config
      const initialTree = QbUtils.checkTree(
        QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }), 
        mergedConfig
      );
      setTree(initialTree);
      
      setLoading(false);
      message.success('Configuration loaded successfully');
    } catch (error) {
      console.error('Error loading configuration:', error);
      message.error('Failed to load configuration');
      setLoading(false);
    }
  };

  const handleTreeChange = (immutableTree, config) => {
    setTree(immutableTree);
  };

  const handleSaveRule = async () => {
    if (!ruleId || !version) {
      message.warning('Please enter both Rule ID and Version');
      return;
    }

    try {
      const jsonTree = QbUtils.getTree(tree);
      const response = await axios.post(`/api/rules/${ruleId}/${version}`, jsonTree);
      
      if (response.data.success) {
        message.success(`Rule saved: ${ruleId} v${version}`);
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      message.error('Failed to save rule');
    }
  };

  const handleLoadRule = async () => {
    if (!ruleId || !version) {
      message.warning('Please enter both Rule ID and Version');
      return;
    }

    try {
      const response = await axios.get(`/api/rules/${ruleId}/${version}`);
      const loadedTree = QbUtils.checkTree(QbUtils.loadTree(response.data), config);
      setTree(loadedTree);
      message.success(`Rule loaded: ${ruleId} v${version}`);
    } catch (error) {
      if (error.response?.status === 404) {
        message.error('Rule not found');
      } else {
        console.error('Error loading rule:', error);
        message.error('Failed to load rule');
      }
    }
  };

  const renderBuilder = (props) => (
    <div className="query-builder-container">
      <div className="query-builder">
        <Builder {...props} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" tip="Loading configuration..." />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#001529', 
        color: 'white', 
        fontSize: '24px', 
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        padding: '0 50px'
      }}>
        Rule Builder
      </Header>
      <Content style={{ padding: '50px' }}>
        <Card 
          title="Rule Management" 
          style={{ marginBottom: '20px' }}
          extra={
            <Space>
              <Input
                placeholder="Rule ID"
                value={ruleId}
                onChange={(e) => setRuleId(e.target.value)}
                style={{ width: '150px' }}
              />
              <Input
                placeholder="Version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                style={{ width: '100px' }}
              />
              <Button type="primary" onClick={handleSaveRule}>
                Save Rule
              </Button>
              <Button onClick={handleLoadRule}>
                Load Rule
              </Button>
            </Space>
          }
        >
          {config && tree && (
            <Query
              {...config}
              value={tree}
              onChange={handleTreeChange}
              renderBuilder={renderBuilder}
            />
          )}
        </Card>

        <Card title="Rule Output (JSON)" style={{ marginTop: '20px' }}>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {tree ? JSON.stringify(QbUtils.getTree(tree), null, 2) : 'No rule defined yet'}
          </pre>
        </Card>
      </Content>
    </Layout>
  );
};

export default App;
