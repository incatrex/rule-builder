import React, { useState, useEffect, useRef } from 'react';
import { Layout, ConfigProvider, theme, Switch, Space, Spin, message, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import axios from 'axios';
import RuleBuilder from './RuleBuilder';
import RuleSearch from './RuleSearch';
import JsonEditor from './JsonEditor';
import ResizablePanels from './ResizablePanels';

const { Header, Content } = Layout;

const App = () => {
  const [ruleConfig, setRuleConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const ruleBuilderRef = useRef(null);
  const [ruleBuilderData, setRuleBuilderData] = useState(null);
  const [selectedRuleUuid, setSelectedRuleUuid] = useState(null);
  const [searchPanelCollapsed, setSearchPanelCollapsed] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const fieldsResponse = await axios.get('/api/fields');
      const fieldsData = fieldsResponse.data;
      
      const configResponse = await axios.get('/api/config');
      const configData = configResponse.data;

      const fields = fieldsData;

      // Convert flat funcs structure (TEXT.CONCAT) to hierarchical (TEXT -> CONCAT)
      const buildHierarchicalFuncs = (flatFuncs) => {
        const hierarchical = {};
        
        Object.keys(flatFuncs).forEach(key => {
          const parts = key.split('.');
          
          if (parts.length === 1) {
            // No dot - keep as is
            hierarchical[key] = flatFuncs[key];
          } else {
            // Has dot - create hierarchy
            const [category, ...rest] = parts;
            
            if (!hierarchical[category]) {
              hierarchical[category] = {
                label: category + ' Functions',
                type: '!struct',
                subfields: {}
              };
            }
            
            // Build the nested structure
            let current = hierarchical[category].subfields;
            const functionName = rest.join('.');
            current[functionName] = flatFuncs[key];
          }
        });
        
        return hierarchical;
      };
      
      // Create ruleConfig for RuleBuilder
      const ruleConfigData = {
        operators: configData.operators,
        fields: fields,
        funcs: buildHierarchicalFuncs(configData.funcs),
        types: configData.types
      };
      
      setRuleConfig(ruleConfigData);
      
      setLoading(false);
      message.success('Configuration loaded successfully');
    } catch (error) {
      console.error('Error loading configuration:', error);
      message.error('Failed to load configuration');
      setLoading(false);
    }
  };

  const handleRuleSelect = (ruleData, uuid) => {
    setSelectedRuleUuid(uuid);
    if (ruleBuilderRef.current) {
      ruleBuilderRef.current.loadRuleData(ruleData);
    }
  };

  const handleNewRule = () => {
    setSelectedRuleUuid(null);
    if (ruleBuilderRef.current) {
      // Load an empty rule
      ruleBuilderRef.current.loadRuleData({
        structure: 'condition',
        returnType: 'boolean',
        ruleType: 'Reporting',
        version: 1,
        metadata: { id: '', description: '' }
      });
    }
  };

  if (loading) {
    return (
      <ConfigProvider
        theme={{
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <Layout style={{ minHeight: '100vh' }}>
          <Content style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: darkMode ? '#141414' : '#f0f2f5'
          }}>
            <Spin size="large" />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  return (
    <div>
      <ConfigProvider
        theme={{
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          backgroundColor: '#001529', 
          color: 'white', 
          fontSize: '24px', 
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 50px'
        }}>
          <div>Rule Builder</div>
          <Space>
            <span style={{ fontSize: '14px', fontWeight: 'normal' }}>Dark Mode</span>
            <Switch 
              checked={darkMode} 
              onChange={setDarkMode}
              style={{ marginLeft: '8px' }}
            />
          </Space>
        </Header>
        <Content style={{ padding: '50px' }}>
          {ruleConfig ? (
            <div style={{ height: 'calc(100vh - 200px)', display: 'flex', gap: '16px' }}>
              {/* Collapsible Left Panel - Rule Search */}
              <div style={{ 
                width: searchPanelCollapsed ? '0px' : '300px',
                minWidth: searchPanelCollapsed ? '0px' : '250px',
                transition: 'width 0.3s ease',
                overflow: 'hidden'
              }}>
                <RuleSearch
                  onRuleSelect={handleRuleSelect}
                  onNewRule={handleNewRule}
                  darkMode={darkMode}
                />
              </div>
              
              {/* Collapse Toggle Button */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'flex-start',
                paddingTop: '8px'
              }}>
                <Button 
                  type="text"
                  icon={searchPanelCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setSearchPanelCollapsed(!searchPanelCollapsed)}
                  style={{ 
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
                    backgroundColor: darkMode ? '#1f1f1f' : '#ffffff'
                  }}
                  title={searchPanelCollapsed ? 'Show Search Panel' : 'Hide Search Panel'}
                />
              </div>
              
              {/* Middle and Right Panels */}
              <div style={{ flex: 1 }}>
                <ResizablePanels
                  leftPanel={
                    <RuleBuilder
                      ref={ruleBuilderRef}
                      config={ruleConfig}
                      darkMode={darkMode}
                      selectedRuleUuid={selectedRuleUuid}
                      onRuleChange={(data) => setRuleBuilderData(data)}
                    />
                  }
                  rightPanel={
                    <JsonEditor
                      data={ruleBuilderData}
                      onChange={(newData) => {
                        if (ruleBuilderRef.current) {
                          ruleBuilderRef.current.loadRuleData(newData);
                        }
                      }}
                      darkMode={darkMode}
                      title="Rule JSON"
                    />
                  }
                  darkMode={darkMode}
                  defaultLeftWidth={60}
                  minLeftWidth={30}
                  maxLeftWidth={80}
                />
              </div>
            </div>
          ) : <Spin />}
        </Content>
      </Layout>
      </ConfigProvider>
    </div>
  );
};

export default App;
