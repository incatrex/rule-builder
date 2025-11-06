import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message, Input } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import ReactJson from 'react-json-view';

/**
 * JsonEditor Component
 * 
 * A reusable component that displays and allows editing of JSON data.
 * Has explicit Edit/Update/Cancel modes for clearer editing workflow.
 * 
 * Props:
 * - data: The JSON object to display/edit
 * - onChange: Callback function called when valid JSON is entered and Update is clicked
 * - darkMode: Boolean for dark mode styling
 * - title: Optional title for the card
 */
const JsonEditor = ({ data, onChange, darkMode = false, title = "JSON Output" }) => {
  const [jsonText, setJsonText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Update local state when data prop changes (only when not editing)
  useEffect(() => {
    if (data && !isEditing) {
      const formatted = JSON.stringify(data, null, 2);
      setJsonText(formatted);
      setDisplayText(formatted);
      setIsValid(true);
    } else if (!data && !isEditing) {
      // Handle null/undefined data
      setJsonText('');
      setDisplayText('');
    }
  }, [data, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    // If there's no display text, initialize with empty object
    setJsonText(displayText || '{}');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setJsonText(displayText);
    setIsValid(true);
  };

  const handleUpdate = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setIsValid(true);
      setIsEditing(false);
      setDisplayText(jsonText);
      if (onChange) {
        onChange(parsed);
        message.success('JSON updated successfully');
      }
    } catch (error) {
      setIsValid(false);
      message.error('Invalid JSON - please fix errors before updating');
    }
  };

  const handleJsonChange = (e) => {
    const newText = e.target.value;
    setJsonText(newText);

    // Validate JSON as user types
    try {
      JSON.parse(newText);
      setIsValid(true);
    } catch (error) {
      setIsValid(false);
    }
  };

  // Custom theme for react-json-view with specific highlighting
  const getJsonTheme = () => {
    if (darkMode) {
      return {
        base00: '#1f1f1f', // background
        base01: '#2a2a2a', // lighter background
        base02: '#434343', // selection background
        base03: '#666666', // comments
        base04: '#b0b0b0', // dark foreground
        base05: '#e0e0e0', // default foreground
        base06: '#f0f0f0', // light foreground
        base07: '#ffffff', // lightest foreground
        base08: '#ff6b6b', // red - for deletion
        base09: '#ffa726', // orange - for numbers
        base0A: '#ffeb3b', // yellow - for strings
        base0B: '#66bb6a', // green - for strings/true
        base0C: '#26c6da', // cyan - for null
        base0D: '#42a5f5', // blue - for keys/false
        base0E: '#ab47bc', // purple - for structure keys
        base0F: '#d32f2f'  // dark red - for error
      };
    } else {
      return {
        base00: '#ffffff', // background
        base01: '#f5f5f5', // lighter background
        base02: '#e0e0e0', // selection background
        base03: '#999999', // comments
        base04: '#666666', // dark foreground
        base05: '#333333', // default foreground
        base06: '#222222', // light foreground
        base07: '#000000', // lightest foreground
        base08: '#d32f2f', // red - for deletion
        base09: '#ff6f00', // orange - for numbers
        base0A: '#f57f17', // yellow - for strings
        base0B: '#388e3c', // green - for strings/true
        base0C: '#0097a7', // cyan - for null
        base0D: '#1976d2', // blue - for keys/false
        base0E: '#7b1fa2', // purple - for structure keys
        base0F: '#d32f2f'  // dark red - for error
      };
    }
  };

  // Custom styling for specific JSON keys
  const getKeyStyle = (keyName) => {
    const styles = {};
    
    // Highlight important structural keys
    if (['structure', 'returnType', 'uuId'].includes(keyName)) {
      styles.color = darkMode ? '#ab47bc' : '#7b1fa2';
      styles.fontWeight = 'bold';
    }
    
    // Highlight condition-related keys
    if (['when', 'then', 'condition', 'left', 'operator', 'right'].includes(keyName)) {
      styles.color = darkMode ? '#42a5f5' : '#1976d2';
      styles.fontWeight = 'bold';
    }
    
    // Highlight result keys
    if (['elseClause', 'result', 'value'].includes(keyName)) {
      styles.color = darkMode ? '#66bb6a' : '#388e3c';
      styles.fontWeight = 'bold';
    }
    
    return styles;
  };

  return (
    <Card
      title={title}
      extra={
        <Space>
          {!isEditing ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleEdit}
              size="small"
            >
              Edit
            </Button>
          ) : (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleUpdate}
                size="small"
                disabled={!isValid}
              >
                Update
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancel}
                size="small"
              >
                Cancel
              </Button>
            </>
          )}
        </Space>
      }
      style={{
        height: '100%',
        background: darkMode ? '#1f1f1f' : '#ffffff'
      }}
      styles={{
        body: {
          height: 'calc(100% - 57px)',
          padding: isEditing ? 0 : '8px',
          position: 'relative',
          overflow: 'auto'
        }
      }}
    >
      {isEditing ? (
        // Edit mode: use textarea
        <>
          <textarea
            value={jsonText}
            onChange={handleJsonChange}
            style={{
              width: '100%',
              height: '100%',
              fontFamily: 'Monaco, Menlo, monospace',
              fontSize: '12px',
              padding: '16px',
              border: isValid ? 'none' : '2px solid #ff4d4f',
              background: darkMode ? '#2a2a2a' : '#fffbe6',
              color: darkMode ? '#e0e0e0' : '#000000',
              resize: 'none',
              outline: 'none'
            }}
            placeholder={`{\n  "structure": "case",\n  "returnType": "boolean"\n}`}
          />
          {!isValid && (
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '16px',
                color: '#ff4d4f',
                fontSize: '12px',
                fontWeight: 'bold',
                background: darkMode ? '#1f1f1f' : '#ffffff',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #ff4d4f'
              }}
            >
              Invalid JSON - Fix errors before updating
            </div>
          )}
        </>
      ) : (
        // View mode: use ReactJson with syntax highlighting
        <div style={{ height: '100%', overflow: 'auto' }}>
          {displayText ? (
            <ReactJson
              src={JSON.parse(displayText || '{}')}
              theme={getJsonTheme()}
              displayDataTypes={false}
              displayObjectSize={false}
              enableClipboard={false}
              collapsed={2} // Collapse after 2 levels deep
              name={false} // Don't show root name
              quotesOnKeys={false}
              sortKeys={false}
              style={{
                backgroundColor: darkMode ? '#1f1f1f' : '#ffffff',
                fontSize: '12px',
                fontFamily: 'Monaco, Menlo, monospace',
                padding: '8px'
              }}
              iconStyle="triangle"
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: darkMode ? '#666666' : '#999999',
                fontStyle: 'italic'
              }}
            >
              No JSON data to display
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default JsonEditor;
