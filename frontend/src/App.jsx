import React, { useState, useEffect, useRef } from 'react';
import { Layout, ConfigProvider, theme, Switch, Space, Spin, message } from 'antd';
import axios from 'axios';
import RuleBuilder from './RuleBuilder';
import JsonEditor from './JsonEditor';
import ResizablePanels from './ResizablePanels';

const { Header, Content } = Layout;

const App = () => {
  const [ruleConfig, setRuleConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const ruleBuilderRef = useRef(null);
  const [ruleBuilderData, setRuleBuilderData] = useState(null);

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
            const funcName = rest.join('.');
            const originalFunc = flatFuncs[key];
            
            // Create the hierarchical function with clean label but preserve original function definition
            hierarchical[category].subfields[funcName] = {
              ...originalFunc,
              // Use just the function name part for the label (e.g., "ADD" instead of "MATH.ADD")
              label: originalFunc.label ? 
                originalFunc.label.startsWith(`${category}.`) ? 
                  originalFunc.label.substring(`${category}.`.length) : 
                  originalFunc.label :
                funcName
            };
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

  if (loading) {
    return (
      <ConfigProvider
        theme={{
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <Layout style={{ minHeight: '100vh' }}>
          <Content style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin size="large" tip="Loading configuration..." />
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  return (
    <div className={darkMode ? 'dark-mode' : ''}>
      <ConfigProvider
        theme={{
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          background: darkMode ? '#141414' : '#001529', 
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
            <div style={{ height: 'calc(100vh - 200px)' }}>
              <ResizablePanels
                leftPanel={
                  <RuleBuilder
                    ref={ruleBuilderRef}
                    config={ruleConfig}
                    darkMode={darkMode}
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
                defaultLeftWidth={70}
                minLeftWidth={30}
                maxLeftWidth={80}
              />
            </div>
          ) : <Spin />}
        </Content>
      </Layout>
      </ConfigProvider>
    </div>
  );
};

export default App;
