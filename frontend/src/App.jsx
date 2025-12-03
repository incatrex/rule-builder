import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Layout, ConfigProvider, theme, Switch, Space, Spin, message, Button, Tabs } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { RuleConfigService } from './services/RuleConfigService.js';
import { FieldService } from './services/FieldService.js';
import { RuleService } from './services/RuleService.js';
import { RuleBuilder } from './components/RuleBuilder'; // Use refactored version
import { RuleHeader } from './components/RuleBuilder/RuleHeader';
import RuleSearch from './components/RuleSearch/RuleSearch';
import { RuleHistory } from './components/RuleHistory'; // Use refactored version
import JsonEditor from './components/JsonEditor/JsonEditor';
import SqlViewer from './components/SqlViewer/SqlViewer';
import RuleCanvas from './components/RuleCanvas/RuleCanvas';
import ResizablePanels from './ResizablePanels';
import CurrencyConversion from './components/RuleBuilder/custom-functions/CurrencyConversion';
import { CustomComponentsProvider } from './contexts/CustomComponentsContext';

const { Header, Content } = Layout;

const App = () => {
  const [ruleConfig, setRuleConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const ruleBuilderRef = useRef(null);
  const ruleSearchRef = useRef(null);
  const sqlViewerRef = useRef(null);
  const [ruleBuilderData, setRuleBuilderData] = useState(null);
  const [selectedRuleUuid, setSelectedRuleUuid] = useState(null);
  const [searchPanelCollapsed, setSearchPanelCollapsed] = useState(false);
  const [jsonPanelCollapsed, setJsonPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('json');
  
  // Initialize services
  const configService = new RuleConfigService();
  const fieldService = new FieldService();
  const ruleService = new RuleService();
  
  // Memoize custom components to prevent recreation on every render
  const customComponents = useMemo(() => ({
    'CurrencyConversion': CurrencyConversion
  }), []);
  
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
      console.log('[App] Loading fields and config...');
      
      // Get hierarchical field structure (not paginated)
      const fieldsData = await fieldService.getFieldsHierarchy();
      console.log('[App] Received fields:', fieldsData);
      console.log('[App] Fields type:', typeof fieldsData);
      console.log('[App] Fields keys:', Object.keys(fieldsData || {}));
      
      const configData = await configService.getConfig();

      // fieldsData is already the hierarchical fields object
      const fields = fieldsData;
      console.log('[App] Final fields for RuleBuilder:', fields);

      // Note: Schema-generated config already provides hierarchical functions structure
      // No need to convert - it's already in the format: { MATH: { subfields: { ADD: {...} } } }
      
      // Create ruleConfig for RuleBuilder
      const ruleConfigData = {
        conditionOperators: configData.conditionOperators,
        fields: fields,
        functions: configData.functions, // Already hierarchical from schema
        types: configData.types,
        expressionOperators: configData.expressionOperators,
        settings: configData.settings
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
    // Clear UUID first to ensure useEffect triggers even if selecting the same rule
    setSelectedRuleUuid(null);
    // Use setTimeout to ensure state update happens in next render cycle
    setTimeout(() => {
      setSelectedRuleUuid(uuid);
      if (ruleBuilderRef.current) {
        ruleBuilderRef.current.loadRuleData(ruleData);
      }
    }, 0);
  };

  const handleViewVersion = async (uuid, version) => {
    try {
      // Find the rule ID from the current selection or search for it
      const ruleIds = await ruleService.getRuleIds();
      const ruleInfo = ruleIds.find(r => r.uuid === uuid);
      
      if (!ruleInfo) {
        message.error('Rule not found');
        return;
      }

      // Load the specific version
      const ruleData = await ruleService.getRuleVersion(
        uuid, 
        version
      );
      
      if (ruleData && ruleBuilderRef.current) {
        ruleBuilderRef.current.loadRuleData(ruleData);
        message.success(`Loaded version ${version}`);
      }
    } catch (error) {
      console.error('Error loading version:', error);
      message.error('Failed to load version');
    }
  };

  const handleRestoreComplete = async () => {
    // Reload the current rule to show the new version
    if (selectedRuleUuid && ruleBuilderRef.current) {
      try {
        const ruleIds = await ruleService.getRuleIds();
        const ruleInfo = ruleIds.find(r => r.uuid === selectedRuleUuid);
        
        if (ruleInfo) {
          const ruleData = await ruleService.getRuleVersion(
            selectedRuleUuid, 
            ruleInfo.latestVersion
          );
          
          if (ruleData) {
            ruleBuilderRef.current.loadRuleData(ruleData);
          }
        }
      } catch (error) {
        console.error('Error reloading rule:', error);
      }
    }
  };

  // Stable callbacks for RuleHistory to prevent unnecessary re-renders
  const handleFetchHistory = useCallback(
    (uuid) => ruleService.getRuleVersions(uuid),
    []
  );

  const handleRestoreVersion = useCallback(
    (uuid, version) => ruleService.restoreRuleVersion(uuid, version),
    []
  );

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
          ...(darkMode && {
            components: {
              Select: {
                colorText: '#fff',
                colorTextPlaceholder: '#999',
                colorBgContainer: '#2d2d2d',
                colorBorder: '#505050',
                colorBgElevated: '#2d2d2d',
                optionSelectedBg: '#404040',
                optionActiveBg: '#3a3a3a',
              }
            }
          })
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
                overflow: 'hidden',
                height: '100%'
              }}>
                <RuleSearch
                  ref={ruleSearchRef}
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
                  paddingTop: '8px'
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
              
              {/* Center and Right Panels with Resizable Divider */}
              <ResizablePanels
                darkMode={darkMode}
                rightPanelCollapsed={jsonPanelCollapsed}
                defaultLeftWidth={60}
                minLeftWidth={30}
                maxLeftWidth={80}
                leftPanel={
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}>
                    {/* Fixed Header */}
                    <div style={{ 
                      padding: '16px 16px 0 16px',
                      position: 'sticky',
                      top: 0,
                      zIndex: 5,
                      background: darkMode ? '#141414' : '#f5f5f5'
                    }}>
                      <RuleHeader 
                        ruleData={ruleBuilderData || { 
                          metadata: { id: '', description: '' },
                          ruleType: 'Reporting',
                          version: 1 
                        }}
                        onSave={() => {
                          if (ruleBuilderRef.current) {
                            ruleBuilderRef.current.handleSave();
                          }
                        }}
                        darkMode={darkMode}
                      />
                    </div>
                    
                    {/* Scrollable Content */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <RuleHistory
                        selectedRuleUuid={selectedRuleUuid}
                        onFetchHistory={handleFetchHistory}
                        onRestoreVersion={handleRestoreVersion}
                        onViewVersion={handleViewVersion}
                        onRestoreComplete={handleRestoreComplete}
                        darkMode={darkMode}
                        collapsible={true}
                        defaultCollapsed={false}
                        maxHeight="calc(100vh - 300px)"
                      />
                      <CustomComponentsProvider customComponents={customComponents}>
                        <RuleBuilder
                          ref={ruleBuilderRef}
                          config={ruleConfig}
                          darkMode={darkMode}
                          selectedRuleUuid={selectedRuleUuid}
                          onRuleChange={(data) => setRuleBuilderData(data)}
                          onSaveSuccess={(result) => {
                            // Update selected UUID if it's a new rule
                            if (result && result.uuid && !selectedRuleUuid) {
                              setSelectedRuleUuid(result.uuid);
                            } else if (selectedRuleUuid) {
                              // For existing rules, force history refresh by clearing and resetting UUID
                              setSelectedRuleUuid(null);
                              setTimeout(() => setSelectedRuleUuid(result.uuid), 0);
                            }
                            
                            // Refresh the rule search dropdown after successful save
                            if (ruleSearchRef.current) {
                              ruleSearchRef.current.refresh();
                            }
                          }}
                        />
                      </CustomComponentsProvider>
                    </div>
                  </div>
                }
                rightPanel={
                  <div style={{ 
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: darkMode ? '#141414' : '#ffffff',
                    border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
                    borderRadius: '2px',
                    overflow: 'hidden',
                    minWidth: 0
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
                      flexDirection: 'column',
                      minWidth: 0,
                      minHeight: 0
                    }}>
                      {activeTab === 'json' && (
                        <div style={{ 
                          flex: 1,
                          overflow: 'auto',
                          minWidth: 0,
                          minHeight: 0
                        }}>
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
                        </div>
                      )}
                      {activeTab === 'sql' && (
                        <div style={{ 
                          flex: 1,
                          overflow: 'auto',
                          minWidth: 0,
                          minHeight: 0,
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <SqlViewer
                            ref={sqlViewerRef}
                            ruleData={ruleBuilderData}
                            darkMode={darkMode}
                          />
                        </div>
                      )}
                      {activeTab === 'canvas' && (
                        <div style={{ 
                          flex: 1,
                          overflow: 'auto',
                          minWidth: 0,
                          minHeight: 0
                        }}>
                          <RuleCanvas
                            rule={ruleBuilderData}
                            darkMode={darkMode}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
                
              {/* Expand JSON Button - Only shown when collapsed */}
              {jsonPanelCollapsed && (
                <Button 
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setJsonPanelCollapsed(false)}
                  style={{ 
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${darkMode ? '#434343' : '#d9d9d9'}`,
                    backgroundColor: darkMode ? '#1f1f1f' : '#ffffff'
                  }}
                  title="Show JSON Panel"
                />
              )}
            </div>
          ) : <Spin />}
        </Content>
      </Layout>
      </ConfigProvider>
    </div>
  );
};

export default App;
