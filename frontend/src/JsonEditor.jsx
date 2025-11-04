import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

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
          padding: 0,
          position: 'relative'
        }
      }}
    >
      <textarea
        value={isEditing ? jsonText : displayText}
        onChange={handleJsonChange}
        readOnly={!isEditing}
        style={{
          width: '100%',
          height: '100%',
          fontFamily: 'monospace',
          fontSize: '13px',
          padding: '16px',
          border: isValid ? 'none' : '2px solid #ff4d4f',
          background: isEditing 
            ? (darkMode ? '#2a2a2a' : '#fffbe6') 
            : (darkMode ? '#1a1a1a' : '#f5f5f5'),
          color: darkMode ? '#e0e0e0' : '#000000',
          resize: 'none',
          outline: 'none',
          cursor: isEditing ? 'text' : 'default',
          opacity: isEditing ? 1 : 0.9
        }}
        placeholder={`{\n  "structure": "case",\n  "returnType": "boolean"\n}`}
      />
      {!isValid && isEditing && (
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
    </Card>
  );
};

export default JsonEditor;
