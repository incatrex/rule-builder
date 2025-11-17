import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message, Input, Alert, Tag, Collapse, Typography } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined, LoadingOutlined, MenuFoldOutlined, InfoCircleOutlined, BulbOutlined } from '@ant-design/icons';
import axios from 'axios';
import { translateValidationErrors } from './services/ValidationTranslator.js';

/**
 * Generate a placeholder UUID for validation purposes
 */
const generatePlaceholderUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Add placeholder UUID to rule data for validation if needed
 */
const addPlaceholderUUID = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Check if this looks like rule data without a UUID
  if ((data.structure || data.metadata) && (!data.uuId || data.uuId === null)) {
    return {
      ...data,
      uuId: generatePlaceholderUUID(),
      __placeholderUUID: true // Flag to indicate this is a placeholder
    };
  }

  return data;
};

/**
 * Remove placeholder UUID flags and UI-only properties from rule data before validation
 */
const removePlaceholderFlags = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const removeUIPropertiesFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(removeUIPropertiesFromObject);
    }

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip UI-only properties
      if (key.startsWith('editing') || 
          key === 'elseExpanded' || 
          key === '__placeholderUUID' ||
          key.includes('Expanded') ||
          key.includes('editing')) {
        continue;
      }
      
      // Recursively clean nested objects
      if (value && typeof value === 'object') {
        cleaned[key] = removeUIPropertiesFromObject(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  const cleaned = removeUIPropertiesFromObject(data);
  
  // Handle the special case of removing placeholder UUID flag
  if (cleaned.__placeholderUUID) {
    delete cleaned.__placeholderUUID;
    // Don't delete the UUID itself - let the service handle that
  }

  return cleaned;
};

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
 * - title: Optional title for the card (set to null to hide card wrapper)
 * - onCollapse: Optional callback for collapse button (set to null to hide button)
 */
const JsonEditor = ({ data, onChange, darkMode = false, title = "JSON Output", onCollapse = null }) => {
  const [jsonText, setJsonText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [schemaInfo, setSchemaInfo] = useState(null);
  const [hasPlaceholderUUID, setHasPlaceholderUUID] = useState(false);
  const [translatedErrors, setTranslatedErrors] = useState(null);
  const [showTechnicalErrors, setShowTechnicalErrors] = useState(false);

  // Update local state when data prop changes (only when not editing)
  useEffect(() => {
    if (data && !isEditing) {
      // Add placeholder UUID if needed for validation
      const dataWithPlaceholder = addPlaceholderUUID(data);
      const hasPlaceholder = dataWithPlaceholder.__placeholderUUID === true;
      
      setHasPlaceholderUUID(hasPlaceholder);
      
      const formatted = JSON.stringify(dataWithPlaceholder, null, 2);
      setJsonText(formatted);
      setDisplayText(formatted);
      setIsValid(true);
    } else if (!data && !isEditing) {
      // Handle null/undefined data
      setJsonText('');
      setDisplayText('');
      setHasPlaceholderUUID(false);
    }
  }, [data, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    // If there's no display text, initialize with empty object
    const initialText = displayText || '{}';
    setJsonText(initialText);
    
    // Check if we need to add placeholder UUID to current text
    try {
      const parsedData = JSON.parse(initialText);
      const withPlaceholder = addPlaceholderUUID(parsedData);
      const hasPlaceholder = withPlaceholder.__placeholderUUID === true;
      
      if (hasPlaceholder) {
        setHasPlaceholderUUID(true);
        setJsonText(JSON.stringify(withPlaceholder, null, 2));
      }
    } catch (error) {
      // If JSON is invalid, just use the original text
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setJsonText(displayText);
    setIsValid(true);
    setValidationErrors([]);
    setTranslatedErrors(null);
    setShowTechnicalErrors(false);
    // Don't reset hasPlaceholderUUID here - it should persist
  };

  const handleUpdate = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setIsValid(true);
      
      // Clean placeholder flags before validation
      const cleanedForValidation = removePlaceholderFlags(parsed);
      
      // Validate against schema
      setIsValidating(true);
      setValidationErrors([]);
      
      try {
        const response = await axios.post('/api/rules/validate', cleanedForValidation);
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
          setTranslatedErrors(null);
          
          if (onChange) {
            // Pass the cleaned data (without placeholder flags) to the parent
            onChange(cleanedForValidation);
            message.success('JSON validated and updated successfully');
          }
        } else {
          // Invalid according to schema - translate errors for better UX
          const rawErrors = validationResult.errors || [];
          setValidationErrors(rawErrors);
          
          // Translate errors to user-friendly messages
          const translated = translateValidationErrors(rawErrors, cleanedForValidation);
          setTranslatedErrors(translated.errors || translated); // Handle both array and object response
          
          message.error(`Schema validation failed: ${translated.summary || 'Multiple validation issues found'}`);
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



  // Helper function to render the JSON editor content
  const renderContent = () => (
    <>
      {/* Placeholder UUID Notice */}
      {hasPlaceholderUUID && (
        <div style={{
          padding: '12px',
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: '6px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0
        }}>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <div>
            <Tag color="blue" style={{ margin: 0, marginRight: '8px' }}>PLACEHOLDER UUID</Tag>
            <span style={{ fontSize: '12px', color: '#595959' }}>
              A temporary UUID has been added for validation. The server will generate the final UUID when the rule is saved.
            </span>
          </div>
        </div>
      )}

      {/* Use textarea for both editing and viewing modes */}
      <textarea
        value={isEditing ? jsonText : displayText}
        onChange={isEditing ? handleJsonChange : undefined}
        readOnly={!isEditing}
        style={{
          width: '100%',
          flex: 1,
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          padding: '16px',
          border: isEditing && !isValid ? '2px solid #ff4d4f' : 'none',
          background: isEditing 
            ? (darkMode ? '#2a2a2a' : '#fffbe6')
            : (darkMode ? '#1f1f1f' : '#ffffff'),
          color: darkMode ? '#e0e0e0' : '#000000',
          resize: 'none',
          outline: 'none',
          cursor: isEditing ? 'text' : 'default',
          boxSizing: 'border-box'
        }}
        placeholder={isEditing ? `{\n  "structure": "case",\n  "returnType": "boolean"\n}` : "No JSON data to display"}
      />
      
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div style={{ padding: '16px', maxHeight: '200px', overflow: 'auto', flexShrink: 0 }}>
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
            border: '1px solid #ff4d4f',
            zIndex: 10
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
            fontFamily: 'Monaco, Menlo, monospace',
            flexShrink: 0
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
    </>
  );

  // If title is null, render without Card wrapper (for use in tabs)
  if (title === null) {
    return (
      <div style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: darkMode ? '#1f1f1f' : '#ffffff',
        width: '100%'
      }}>
        <div style={{ 
          padding: '16px',
          borderBottom: `1px solid ${darkMode ? '#434343' : '#f0f0f0'}`,
          display: 'flex',
          justifyContent: 'flex-end',
          flexShrink: 0
        }}>
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
        </div>
        <div style={{ 
          flex: 1,
          padding: '8px',
          position: 'relative',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {renderContent()}
        </div>
      </div>
    );
  }

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
      {/* Placeholder UUID Notice */}
      {hasPlaceholderUUID && (
        <div style={{
          padding: '12px',
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: '6px',
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <div>
            <Tag color="blue" style={{ margin: 0, marginRight: '8px' }}>PLACEHOLDER UUID</Tag>
            <span style={{ fontSize: '12px', color: '#595959' }}>
              A temporary UUID has been added for validation. The server will generate the final UUID when the rule is saved.
            </span>
          </div>
        </div>
      )}

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
