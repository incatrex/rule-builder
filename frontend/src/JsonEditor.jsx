import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message, Input, Alert } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined, LoadingOutlined, MenuFoldOutlined } from '@ant-design/icons';
import axios from 'axios';

/**
 * JsonEditor Component
 * 
 * A reusable component that displays and allows editing of JSON data using a basic textarea.
 * Has explicit Edit/Update/Cancel modes for clearer editing workflow.
 * 
 * Props:
 * - data: The JSON object to display/edit
 * - onChange: Callback function called when valid JSON is entered and Update is clicked
 * - darkMode: Boolean for dark mode styling
 * - title: Optional title for the card
 * - onCollapse: Optional callback for collapse button
 */
const JsonEditor = ({ data, onChange, darkMode = false, title = "JSON Output", onCollapse = null }) => {
  const [jsonText, setJsonText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [schemaInfo, setSchemaInfo] = useState(null);

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
    setValidationErrors([]);
  };

  const handleUpdate = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setIsValid(true);
      
      // Validate against schema
      setIsValidating(true);
      setValidationErrors([]);
      
      try {
        const response = await axios.post('/api/rules/validate', parsed);
        const validationResult = response.data;
        
        // Store schema info
        if (validationResult.schema) {
          setSchemaInfo(validationResult.schema);
        }
        
        if (validationResult.valid) {
          // Valid - update the component
          setIsEditing(false);
          setDisplayText(jsonText);
          setValidationErrors([]);
          
          if (onChange) {
            onChange(parsed);
            message.success('JSON validated and updated successfully');
          }
        } else {
          // Invalid according to schema
          setValidationErrors(validationResult.errors || []);
          message.error(`Schema validation failed with ${validationResult.errors?.length || 0} error(s)`);
        }
      } catch (error) {
        console.error('Validation error:', error);
        message.error('Failed to validate rule against schema');
      } finally {
        setIsValidating(false);
      }
    } catch (error) {
      setIsValid(false);
      message.error('Invalid JSON - please fix syntax errors before updating');
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
      title={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%'
        }}>
          <span>{title}</span>
          {onCollapse && !isEditing && (
            <Button 
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={onCollapse}
              size="small"
              style={{ 
                marginRight: '-8px',
                color: darkMode ? '#e0e0e0' : '#666'
              }}
              title="Hide JSON Panel"
            />
          )}
        </div>
      }
      extra={
        !onCollapse || isEditing ? (
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
                  icon={isValidating ? <LoadingOutlined /> : <CheckOutlined />}
                  onClick={handleUpdate}
                  size="small"
                  disabled={!isValid || isValidating}
                  loading={isValidating}
                >
                  {isValidating ? 'Validating...' : 'Update'}
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  size="small"
                  disabled={isValidating}
                >
                  Cancel
                </Button>
              </>
            )}
          </Space>
        ) : null
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
      {/* Use textarea for both editing and viewing modes */}
      <textarea
        value={isEditing ? jsonText : displayText}
        onChange={isEditing ? handleJsonChange : undefined}
        readOnly={!isEditing}
        style={{
          width: '100%',
          height: '100%',
          fontFamily: 'Monaco, Menlo, monospace',
          fontSize: '12px',
          padding: '16px',
          border: isEditing && !isValid ? '2px solid #ff4d4f' : 'none',
          background: isEditing 
            ? (darkMode ? '#2a2a2a' : '#fffbe6')
            : (darkMode ? '#1f1f1f' : '#ffffff'),
          color: darkMode ? '#e0e0e0' : '#000000',
          resize: 'none',
          outline: 'none',
          cursor: isEditing ? 'text' : 'default'
        }}
        placeholder={isEditing ? `{\n  "structure": "case",\n  "returnType": "boolean"\n}` : "No JSON data to display"}
      />
      
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div style={{ padding: '16px', maxHeight: '200px', overflow: 'auto' }}>
          <Alert
            message="Schema Validation Errors"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                {validationErrors.map((error, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    <strong>{error.path || 'root'}:</strong> {error.message}
                  </li>
                ))}
              </ul>
            }
            type="error"
            showIcon
          />
        </div>
      )}
      
      {/* JSON Syntax Error */}
      {isEditing && !isValid && validationErrors.length === 0 && (
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
      
      {/* Schema Information */}
      {schemaInfo && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid ' + (darkMode ? '#434343' : '#f0f0f0'),
            background: darkMode ? '#141414' : '#fafafa',
            fontSize: '11px',
            color: darkMode ? '#8c8c8c' : '#595959',
            fontFamily: 'Monaco, Menlo, monospace'
          }}
        >
          <div style={{ marginBottom: '2px' }}>
            <strong>Validated against:</strong> {schemaInfo.filename}
          </div>
          {schemaInfo.title && (
            <div style={{ marginBottom: '2px' }}>
              <strong>Schema:</strong> {schemaInfo.title}
            </div>
          )}
          {schemaInfo.id && (
            <div style={{ marginBottom: '2px' }}>
              <strong>Schema ID:</strong> {schemaInfo.id}
            </div>
          )}
          {schemaInfo.draft && (
            <div>
              <strong>JSON Schema:</strong> {schemaInfo.draft}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default JsonEditor;
