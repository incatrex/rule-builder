import React, { useState, useEffect } from 'react';
import { Query, Builder, Utils as QbUtils } from '@react-awesome-query-builder/ui';
import { Layout, Card, Button, Input, Space, message, Spin } from 'antd';
import { AntdConfig } from '@react-awesome-query-builder/antd';
import '@react-awesome-query-builder/antd/css/styles.css';
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

      // Define custom functions exactly like the working demo
      const customFuncs = {
        TEXT_CONCAT: {
          label: 'TEXT.CONCAT',
          sqlFunc: 'CONCAT',
          mongoFunc: '$concat',
          jsonLogic: 'concat',
          returnType: 'text',
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
        TEXT_MID: {
          label: 'TEXT.MID',
          sqlFunc: 'SUBSTRING',
          mongoFunc: '$substr',
          jsonLogic: 'substr',
          returnType: 'text',
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
        TEXT_LEN: {
          label: 'TEXT.LEN',
          sqlFunc: 'LENGTH',
          mongoFunc: '$strLenCP',
          jsonLogic: 'length',
          returnType: 'number',
          args: {
            text: {
              label: 'Text',
              type: 'text',
              valueSources: ['value', 'field', 'func']
            }
          }
        },
        MATH_ROUND: {
          label: 'MATH.ROUND',
          sqlFunc: 'ROUND',
          mongoFunc: '$round',
          jsonLogic: 'round',
          returnType: 'number',
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
        MATH_ABS: {
          label: 'MATH.ABS',
          sqlFunc: 'ABS',
          mongoFunc: '$abs',
          jsonLogic: 'abs',
          returnType: 'number',
          args: {
            number: {
              label: 'Number',
              type: 'number',
              valueSources: ['value', 'field', 'func']
            }
          }
        },
        DATE_DIFF: {
          label: 'DATE.DIFF',
          sqlFunc: 'DATEDIFF',
          mongoFunc: '$dateDiff',
          jsonLogic: 'date_diff',
          returnType: 'number',
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
          fieldSources: ['field', 'func'],  // Left side: only field and func (no value)
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
          }
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
