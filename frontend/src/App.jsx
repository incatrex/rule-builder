import React, { useState, useEffect, useRef } from 'react';
import { Query, Builder, Utils as QbUtils } from '@react-awesome-query-builder/ui';
import { Layout, Card, Button, Input, Space, message, Spin, Select, Switch, ConfigProvider, theme, Tabs, Collapse } from 'antd';
import { AntdConfig } from '@react-awesome-query-builder/antd';
import { NumberOutlined, FieldTimeOutlined, FunctionOutlined } from '@ant-design/icons';
import '@react-awesome-query-builder/antd/css/styles.css';
import axios from 'axios';
import CaseBuilder from './CaseBuilder';

const { Header, Content } = Layout;
const { Panel } = Collapse;

// Custom ValueSources component using Select dropdown with icons
// Shows only icon when closed (compact), shows icon + label when open
const ValueSourcesSelect = ({ config, valueSources, valueSrc, setValueSrc, readonly, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Map source keys to icons
  const getIcon = (srcKey) => {
    switch(srcKey) {
      case 'value': return <NumberOutlined />;
      case 'field': return <FieldTimeOutlined />;
      case 'func': return <FunctionOutlined />;
      default: return null;
    }
  };
  
  // Abbreviate labels to save space
  const abbreviateLabel = (label) => {
    if (label === 'Function') return 'Func';
    return label;
  };
  
  // Get current source info for label rendering
  const currentSource = valueSources.find(([key]) => key === (valueSrc || 'value'));
  const currentLabel = currentSource ? abbreviateLabel(currentSource[1].label) : '';

  return (
    <Select
      value={valueSrc || 'value'}
      onChange={setValueSrc}
      disabled={readonly}
      size="small"
      style={{ width: isOpen ? 100 : 50, minWidth: 50, transition: 'width 0.2s' }}
      placeholder={title}
      onDropdownVisibleChange={setIsOpen}
      // When closed, show only icon
      labelRender={(props) => {
        return isOpen ? (
          <Space size={4}>
            {getIcon(props.value)}
            <span>{currentLabel}</span>
          </Space>
        ) : (
          <span style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {getIcon(props.value)}
          </span>
        );
      }}
    >
      {valueSources.map(([srcKey, info]) => (
        <Select.Option key={srcKey} value={srcKey}>
          <Space size={4}>
            {getIcon(srcKey)}
            <span>{abbreviateLabel(info.label)}</span>
          </Space>
        </Select.Option>
      ))}
    </Select>
  );
};

const App = () => {
  const [config, setConfig] = useState(null);
  const [tree, setTree] = useState(null);
  const [ruleId, setRuleId] = useState('rule1');
  const [version, setVersion] = useState('1');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const caseBuilderRef = useRef(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const fieldsResponse = await axios.get('/api/fields');
      const fieldsData = fieldsResponse.data;

      // Recursively add valueSources to all fields (except !struct parents)
      const updateFieldsWithFuncs = (fieldsObj) => {
        const updated = {};
        for (const key in fieldsObj) {
          const field = fieldsObj[key];
          if (field.type === '!struct' && field.subfields) {
            // !struct fields should NOT have valueSources or excludeOperators - just pass through
            updated[key] = {
              ...field,
              subfields: updateFieldsWithFuncs(field.subfields)
            };
          } else {
            // Add valueSources to leaf fields only
            updated[key] = {
              ...field,
              valueSources: ['value', 'field', 'func']
            };
          }
        }
        return updated;
      };

      const fields = updateFieldsWithFuncs(fieldsData);

      // Define custom functions in hierarchical structure
      const customFuncs = {
        TEXT: {
          label: 'Text Functions',
          type: '!struct',
          subfields: {
            CONCAT: {
              label: 'CONCAT',
              sqlFunc: 'CONCAT',
              mongoFunc: '$concat',
              jsonLogic: 'concat',
              returnType: 'text',
              allowSelfNesting: true,
              args: {
                text1: {
                  label: 'Text 1',
                  type: 'text',
                  valueSources: ['value', 'field', 'func']
                },
                text2: {
                  label: 'Text 2',
                  type: 'text',
                  valueSources: ['value', 'field', 'func']
                }
              }
            },
            MID: {
              label: 'MID',
              sqlFunc: 'SUBSTRING',
              mongoFunc: '$substr',
              jsonLogic: 'substr',
              returnType: 'text',
              allowSelfNesting: true,
              args: {
                text: {
                  label: 'Text',
                  type: 'text',
                  valueSources: ['value', 'field', 'func']
                },
                start: {
                  label: 'Start Position',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                },
                length: {
                  label: 'Length',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                }
              }
            },
            LEN: {
              label: 'LEN',
              sqlFunc: 'LENGTH',
              mongoFunc: '$strLenCP',
              jsonLogic: 'length',
              returnType: 'number',
              allowSelfNesting: true,
              args: {
                text: {
                  label: 'Text',
                  type: 'text',
                  valueSources: ['value', 'field', 'func']
                }
              }
            }
          }
        },
        MATH: {
          label: 'Math Functions',
          type: '!struct',
          subfields: {
            ADD: {
              label: 'ADD',
              sqlFunc: 'ADD',
              mongoFunc: '$add',
              jsonLogic: (args) => {
                // Filter out null/undefined values to only add provided numbers
                const values = Object.values(args).filter(v => v != null && v !== '');
                return { '+': values };
              },
              returnType: 'number',
              allowSelfNesting: true,
              // Special property for ExpressionBuilder to enable dynamic args
              dynamicArgs: {
                argType: 'number',
                minArgs: 2,
                maxArgs: 10,
                defaultValue: null
              },
              // Placeholder args for RAQB compatibility (won't be used in ExpressionBuilder)
              args: {
                num1: {
                  label: '①',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                },
                num2: {
                  label: '②',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                }
              }
            },
            ROUND: {
              label: 'ROUND',
              sqlFunc: 'ROUND',
              mongoFunc: '$round',
              jsonLogic: 'round',
              returnType: 'number',
              allowSelfNesting: true,
              args: {
                number: {
                  label: 'Number',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                },
                decimals: {
                  label: 'Decimal Places',
                  type: 'number',
                  valueSources: ['value']
                }
              }
            },
            ABS: {
              label: 'ABS',
              sqlFunc: 'ABS',
              mongoFunc: '$abs',
              jsonLogic: 'abs',
              returnType: 'number',
              allowSelfNesting: true,
              args: {
                number: {
                  label: 'Number',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                }
              }
            },
            SUM: {
              label: 'SUM',
              sqlFunc: 'ADD',
              mongoFunc: '$add',
              jsonLogic: ({num1, num2, num3, num4, num5}) => {
                // Filter out null/undefined values to only add provided numbers
                const values = [num1, num2, num3, num4, num5].filter(v => v != null && v !== '');
                return { '+': values };
              },
              returnType: 'number',
              allowSelfNesting: true,
              args: {
                num1: {
                  label: '①',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                },
                num2: {
                  label: '②',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                },
                num3: {
                  label: '③',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                },
                num4: {
                  label: '④',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                },
                num5: {
                  label: '⑤',
                  type: 'number',
                  valueSources: ['value', 'field', 'func']
                }
              }
            }
          }
        },
        DATE: {
          label: 'Date Functions',
          type: '!struct',
          subfields: {
            DIFF: {
              label: 'DIFF',
              sqlFunc: 'DATEDIFF',
              mongoFunc: '$dateDiff',
              jsonLogic: 'date_diff',
              returnType: 'number',
              allowSelfNesting: true,
              args: {
                date1: {
                  label: 'Date 1',
                  type: 'date',
                  valueSources: ['value', 'field', 'func']
                },
                date2: {
                  label: 'Date 2', 
                  type: 'date',
                  valueSources: ['value', 'field', 'func']
                }
              }
            }
          }
        }
      };

      console.log('Fields structure:', JSON.stringify(fields, null, 2));
      console.log('Date fields available:', Object.keys(fields).filter(k => fields[k].type === 'date'));
      console.log('Number fields available:', Object.keys(fields).filter(k => fields[k].type === 'number'));

      // Build config explicitly like the working demo (lines 710-725)
      const mergedConfig = {
        ctx: AntdConfig.ctx,
        conjunctions: AntdConfig.conjunctions,
        operators: AntdConfig.operators,
        widgets: AntdConfig.widgets,
        types: AntdConfig.types,
        settings: {
          ...AntdConfig.settings,
          renderSize: 'medium', // Show all controls immediately (not just on hover)
          fieldSources: ['field', 'func'],  // Left side: only field and func (no value)
          // Use custom Select dropdown instead of three-dots popover for value source selection
          renderValueSources: (props) => <ValueSourcesSelect {...props} />,
          renderFieldSources: (props) => <ValueSourcesSelect {...props} />,
          valueSourcesInfo: {
            value: {
              label: 'Value',
              widget: 'text'
            },
            field: {
              label: 'Field',
              widget: 'field'
            },
            func: {
              label: 'Function',
              widget: 'func'
            }
          },
          // Enable field-to-field comparison and filter by type
          canCompareFieldWithField: (leftField, leftFieldConfig, rightField, rightFieldConfig, op) => {
            // Check for null/undefined configs
            // When leftFieldConfig is null, we're inside a function argument (either left or right side)
            // In this case, allow all fields since function args can have any type
            if (!leftFieldConfig || !rightFieldConfig) {
              console.log('canCompareFieldWithField: null config detected (FUNCTION ARG CONTEXT)', {
                leftField, 
                leftFieldConfig, 
                rightField, 
                rightFieldConfig
              });
              // If rightFieldConfig exists, allow it (we're in function arg selection)
              return !!rightFieldConfig;
            }
            
            // When leftField is null or empty, we're in a function argument context
            // In this case, we can't filter by left field type, so allow all
            if (!leftField || leftField === '') {
              console.log('canCompareFieldWithField: IN FUNCTION ARG CONTEXT (no leftField)', {
                leftField,
                leftFieldConfig,
                rightField,
                rightType: rightFieldConfig.type
              });
              return true; // Allow all fields in function arguments
            }
            
            const leftType = leftFieldConfig.type;
            const rightType = rightFieldConfig.type;
            
            // Allow comparing fields of the same type OR different types (for functions)
            // Functions can accept different types as arguments than the rule's left field
            const result = true; // Allow all for now since functions need flexibility
            console.log('canCompareFieldWithField:', {
              leftField,
              leftType,
              rightField,
              rightType,
              op,
              result
            });
            return result;
          },
          // Customize button text
          addRuleLabel: 'Add Condition',
          addGroupLabel: 'Add Group',
          delGroupLabel: 'Delete Group'
        },
        fields: fields,
        funcs: customFuncs
      };

      console.log('Merged Config:', mergedConfig);
      console.log('Functions:', customFuncs);
      console.log('Sample field valueSources:', fields['TABLE1.NUMBER_FIELD_01']?.valueSources);

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

  // Transform rule type to condition type recursively
  const transformRuleToCondition = (node) => {
    if (!node) return node;
    
    const transformed = { ...node };
    
    // Change "rule" to "condition"
    if (transformed.type === 'rule') {
      transformed.type = 'condition';
    }
    
    // Recursively transform children and rename children1 to conditions
    if (transformed.children1 && Array.isArray(transformed.children1)) {
      transformed.conditions = transformed.children1.map(child => transformRuleToCondition(child));
      delete transformed.children1;
    }
    
    return transformed;
  };

  // Transform condition type back to rule type recursively
  const transformConditionToRule = (node) => {
    if (!node) return node;
    
    const transformed = { ...node };
    
    // Change "condition" back to "rule"
    if (transformed.type === 'condition') {
      transformed.type = 'rule';
    }
    
    // Recursively transform children and rename conditions back to children1
    if (transformed.conditions && Array.isArray(transformed.conditions)) {
      transformed.children1 = transformed.conditions.map(child => transformConditionToRule(child));
      delete transformed.conditions;
    }
    
    return transformed;
  };

  const handleSaveRule = async () => {
    if (!ruleId || !version) {
      message.warning('Please enter both Rule ID and Version');
      return;
    }

    try {
      let dataToSave;
      
      if (activeTab === '1') {
        // Save Condition Builder rule
        const jsonTree = QbUtils.getTree(tree);
        dataToSave = transformRuleToCondition(jsonTree);
      } else {
        // Save CASE Builder rule
        if (caseBuilderRef.current) {
          dataToSave = caseBuilderRef.current.getCaseOutput();
        } else {
          message.error('CASE Builder not initialized');
          return;
        }
      }

      await axios.post(`/api/rules/${ruleId}/${version}`, dataToSave);
      message.success(`Rule saved: ${ruleId} v${version}`);
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
      const loadedData = response.data;

      // Check if it's a CASE rule or Condition rule
      if (loadedData.type === 'case') {
        // Load into CASE Builder
        setActiveTab('2');
        setTimeout(() => {
          if (caseBuilderRef.current) {
            caseBuilderRef.current.loadCaseData(loadedData);
            message.success(`CASE rule loaded: ${ruleId} v${version}`);
          }
        }, 100);
      } else {
        // Load into Condition Builder
        setActiveTab('1');
        const transformedData = transformConditionToRule(loadedData);
        const loadedTree = QbUtils.checkTree(QbUtils.loadTree(transformedData), config);
        setTree(loadedTree);
        message.success(`Condition rule loaded: ${ruleId} v${version}`);
      }
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
          {/* Rule Management Card - shown for both tabs */}
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
          />

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: '1',
                label: 'Condition Builder',
                children: (
                  <>
                    <Card style={{ marginBottom: '20px' }}>
                      {config && tree && (
                        <Query
                          {...config}
                          value={tree}
                          onChange={handleTreeChange}
                          renderBuilder={renderBuilder}
                        />
                      )}
                    </Card>

                    <Collapse defaultActiveKey={[]} style={{ marginTop: '20px' }}>
                      <Panel header="Rule Output (JSON)" key="ruleOutput">
                        <pre style={{ 
                          background: darkMode ? '#1f1f1f' : '#f5f5f5', 
                          padding: '16px', 
                          borderRadius: '4px',
                          overflow: 'auto',
                          maxHeight: '400px',
                          color: darkMode ? '#d4d4d4' : 'inherit'
                        }}>
                          {tree ? JSON.stringify(QbUtils.getTree(tree), null, 2) : 'No rule defined yet'}
                        </pre>
                      </Panel>
                    </Collapse>
                  </>
                )
              },
              {
                key: '2',
                label: 'CASE Builder',
                children: config ? <CaseBuilder ref={caseBuilderRef} config={config} darkMode={darkMode} /> : <Spin />
              }
            ]}
          />
        </Content>
    </Layout>
    </ConfigProvider>
  );
};

export default App;
