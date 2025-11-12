import React, { useState, useEffect, useRef } from 'react';
import { Layout, ConfigProvider, theme, Switch, Space, Spin, message, Button, Tabs } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import axios from 'axios';
import RuleBuilder from './RuleBuilder';
import RuleSearch from './RuleSearch';
import JsonEditor from './JsonEditor';
import SqlViewer from './SqlViewer';
import RuleCanvas from './RuleCanvas';
import ResizablePanels from './ResizablePanels';

const { Header, Content } = Layout;

const App = () => {
  const [ruleConfig, setRuleConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const ruleBuilderRef = useRef(null);
  const sqlViewerRef = useRef(null);
  const [ruleBuilderData, setRuleBuilderData] = useState(null);
  const [selectedRuleUuid, setSelectedRuleUuid] = useState(null);
  const [searchPanelCollapsed, setSearchPanelCollapsed] = useState(false);
  const [jsonPanelCollapsed, setJsonPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('json');
  
  // Check if this is canvas-only mode
  const isCanvasMode = new URLSearchParams(window.location.search).get('canvas') === 'true';

  useEffect(() => {
    // If canvas mode, wait for rule data from parent via postMessage
    if (isCanvasMode) {
      // Listen for updates from parent window
      const handleMessage = (event) => {
        // Verify the message is from the same origin for security
        if (event.origin !== window.location.origin) return;
        
        if (event.data && event.data.type === 'RULE_UPDATE') {
          setRuleBuilderData(event.data.rule);
          if (event.data.darkMode !== undefined) {
            setDarkMode(event.data.darkMode);
          }
          setLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Let parent know we're ready
      if (window.opener) {
        window.opener.postMessage({ type: 'CANVAS_READY' }, window.location.origin);
      }

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    } else {
      loadConfiguration();
    }
  }, [isCanvasMode]);

  // If canvas-only mode, render just the canvas
  if (isCanvasMode) {
    return (
      <ConfigProvider
        theme={{
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <Layout style={{ height: '100vh' }}>
          <Header style={{
            background: darkMode ? '#141414' : '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${darkMode ? '#434343' : '#f0f0f0'}`
          }}>
            <h2 style={{ margin: 0, color: darkMode ? '#fff' : '#000' }}>
              {ruleBuilderData?.metadata?.id || 'Rule'} - Canvas View
            </h2>
            <Switch
              checked={darkMode}
              onChange={setDarkMode}
              checkedChildren="🌙"
              unCheckedChildren="☀️"
            />
          </Header>
          <Content style={{ height: 'calc(100vh - 64px)' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" />
              </div>
            ) : (
              <RuleCanvas
                rule={ruleBuilderData}
                darkMode={darkMode}
                showExpandButton={false}
              />
            )}
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

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
      // Create a new rule
      ruleBuilderRef.current.newRule({
        structure: 'condition',
        returnType: 'boolean',
        ruleType: 'Reporting',
        version: 1,
        metadata: { id: '', description: '' }
      });
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    // Auto-refresh SQL when switching to SQL tab
    if (key === 'sql' && sqlViewerRef.current) {
      sqlViewerRef.current.refresh();
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
            <div style={{ height: 'calc(100vh - 200px)', display: 'flex', gap: '0px' }}>
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
                  onCollapse={() => setSearchPanelCollapsed(true)}
                />
              </div>
              
              {/* Expand Button - Only shown when collapsed */}
              {searchPanelCollapsed && (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  paddingTop: '8px',
                  paddingRight: '8px'
                }}>
                  <Button 
                    type="text"
                    icon={<MenuUnfoldOutlined />}
                    onClick={() => setSearchPanelCollapsed(false)}
                    style={{ 
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
                      backgroundColor: darkMode ? '#1f1f1f' : '#ffffff'
                    }}
                    title="Show Search Panel"
                  />
                </div>
              )}
              
              {/* Middle and Right Panels */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                gap: '0px', 
                position: 'relative',
                overflow: 'hidden',
                minWidth: 0
              }}>
                <div style={{ 
                  flex: 1, 
                  display: 'flex',
                  overflow: 'hidden',
                  minWidth: 0
                }}>
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
                      <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        backgroundColor: darkMode ? '#141414' : '#ffffff',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          borderBottom: `1px solid ${darkMode ? '#434343' : '#f0f0f0'}`,
                          flexShrink: 0
                        }}>
                          <Tabs 
                            activeKey={activeTab}
                            onChange={handleTabChange}
                            items={[
                              {
                                key: 'json',
                                label: 'JSON',
                              },
                              {
                                key: 'sql',
                                label: 'SQL',
                              },
                              {
                                key: 'canvas',
                                label: 'Canvas',
                              },
                            ]}
                            style={{ flex: 1, marginBottom: '-16px' }}
                          />
                          <Button 
                            type="text"
                            icon={<MenuFoldOutlined />}
                            onClick={() => setJsonPanelCollapsed(true)}
                            style={{ 
                              marginLeft: '16px',
                              flexShrink: 0
                            }}
                            title="Collapse Panel"
                          />
                        </div>
                        <div style={{ 
                          flex: 1, 
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          {activeTab === 'json' && (
                            <JsonEditor
                              data={ruleBuilderData}
                              onChange={(newData) => {
                                if (ruleBuilderRef.current) {
                                  ruleBuilderRef.current.loadRuleData(newData);
                                }
                              }}
                              darkMode={darkMode}
                              title={null}
                              onCollapse={null}
                            />
                          )}
                          {activeTab === 'sql' && (
                            <SqlViewer
                              ref={sqlViewerRef}
                              ruleData={ruleBuilderData}
                              darkMode={darkMode}
                            />
                          )}
                          {activeTab === 'canvas' && (
                            <RuleCanvas
                              rule={ruleBuilderData}
                              darkMode={darkMode}
                            />
                          )}
                        </div>
                      </div>
                    }
                    darkMode={darkMode}
                    defaultLeftWidth={60}
                    minLeftWidth={30}
                    maxLeftWidth={80}
                    rightPanelCollapsed={jsonPanelCollapsed}
                  />
                </div>
                
                {/* Expand JSON Button - Only shown when collapsed */}
                {jsonPanelCollapsed && (
                  <Button 
                    type="text"
                    icon={<MenuUnfoldOutlined />}
                    onClick={() => setJsonPanelCollapsed(false)}
                    style={{ 
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
                      backgroundColor: darkMode ? '#1f1f1f' : '#ffffff',
                      zIndex: 10
                    }}
                    title="Show JSON Panel"
                  />
                )}
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
