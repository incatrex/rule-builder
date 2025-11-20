import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button, message, Spin } from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RuleService } from './services/RuleService.js';

const SqlViewer = forwardRef(({ ruleData, darkMode = false, onRefresh }, ref) => {
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastRuleDataRef = useRef(null);
  
  // Initialize RuleService
  const ruleService = new RuleService();

  useImperativeHandle(ref, () => ({
    refresh: () => {
      generateSql();
    }
  }));

  useEffect(() => {
    // Auto-generate SQL when component mounts or when ruleData changes
    if (ruleData && JSON.stringify(ruleData) !== JSON.stringify(lastRuleDataRef.current)) {
      lastRuleDataRef.current = ruleData;
      generateSql();
    }
  }, [ruleData]);

  const generateSql = async () => {
    if (!ruleData) {
      setSql('');
      setError('No rule data available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await ruleService.convertToSql(ruleData);
      
      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join(', '));
        setSql('');
      } else {
        setSql(result.sql || '');
        setError(null);
      }
    } catch (err) {
      setError(err.message);
      setSql('');
      message.error('Failed to generate SQL: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (sql) {
      navigator.clipboard.writeText(sql)
        .then(() => {
          message.success('SQL copied to clipboard');
        })
        .catch(err => {
          message.error('Failed to copy SQL: ' + err.message);
        });
    }
  };

  const handleRefresh = () => {
    generateSql();
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
      minWidth: 0,
      width: '100%'
    }}>
      <div style={{ 
        padding: '12px 16px',
        borderBottom: `1px solid ${darkMode ? '#434343' : '#f0f0f0'}`,
        display: 'flex',
        justifyContent: 'flex-end',
        flexShrink: 0
      }}>
        <div>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            disabled={loading || !ruleData}
            style={{ marginRight: 8 }}
            size="small"
          >
            Refresh
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!sql || loading}
            size="small"
          >
            Copy
          </Button>
        </div>
      </div>
      <div style={{ 
        flex: 1,
        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
        minHeight: 0,
        minWidth: 0
      }}>
        <Spin spinning={loading} tip="Generating SQL...">
          <div style={{ 
            padding: '12px',
            minHeight: '100%',
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff'
          }}>
            {error && (
              <div style={{ 
                color: '#ff4d4f', 
                padding: '12px',
                backgroundColor: '#fff2e8',
                border: '1px solid #ffbb96',
                borderRadius: '4px',
                marginBottom: '16px'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
            {sql ? (
              <div 
                style={{ 
                  overflow: 'auto',
                  width: '100%',
                  height: '100%'
                }}
              >
                <SyntaxHighlighter
                  language="sql"
                  style={tomorrow}
                  customStyle={{
                    margin: 0,
                    padding: '12px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    borderRadius: '4px',
                    display: 'inline-block',
                    minWidth: '100%',
                    backgroundColor: darkMode ? '#1e1e1e' : '#f5f5f5'
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace'
                    }
                  }}
                >
                  {sql}
                </SyntaxHighlighter>
              </div>
            ) : !loading && !error && (
              <div style={{ 
                color: darkMode ? '#888' : '#999',
                textAlign: 'center',
                padding: '40px',
                fontSize: '14px'
              }}>
                No SQL generated yet. Build a rule to see the SQL output.
              </div>
            )}
          </div>
        </Spin>
      </div>
    </div>
  );
});

SqlViewer.displayName = 'SqlViewer';

export default SqlViewer;
