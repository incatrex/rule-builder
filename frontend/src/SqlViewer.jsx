import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button, message, Spin } from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const SqlViewer = forwardRef(({ ruleData, darkMode = false, onRefresh }, ref) => {
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastRuleDataRef = useRef(null);

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
      const response = await fetch('http://localhost:8080/api/rules/to-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
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
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '16px',
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
          >
            Refresh
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!sql || loading}
          >
            Copy
          </Button>
        </div>
      </div>
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
        width: '100%'
      }}>
        <Spin spinning={loading} tip="Generating SQL...">
          <div style={{ 
            padding: '16px',
            minHeight: '200px',
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            width: '100%',
            boxSizing: 'border-box'
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
              <SyntaxHighlighter
                language="sql"
                style={tomorrow}
                customStyle={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: darkMode ? '#1e1e1e' : '#f5f5f5',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                  maxWidth: '100%'
                }}
                wrapLines={false}
                wrapLongLines={false}
              >
                {sql}
              </SyntaxHighlighter>
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
