import React, { useState, useEffect } from 'react';
import { Space, Typography, Tag, Button, Spin } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import Expression from './Expression';
import argumentOptionsService from '../../services/ArgumentOptionsService';

const { Text } = Typography;

/**
 * FunctionArgument Component
 * 
 * Renders a single function argument with its label and expression editor.
 * 
 * Props:
 * - arg: The argument object { name, value }
 * - argDef: The argument definition from function config
 * - isDynamicArgs: Whether this is part of a dynamic args function
 * - index: Argument index
 * - canRemove: Whether this argument can be removed
 * - onRemove: Callback when remove button clicked
 * - onChange: Callback when argument value changes
 * - config: Config object
 * - darkMode: Dark mode styling
 * - expansionPath: Path for expansion state tracking
 * - isExpanded: Expansion state checker
 * - onToggleExpansion: Toggle expansion callback
 * - isNew: Whether this is a new rule
 * - customComponents: Map of custom component names to implementations
 */
const FunctionArgument = ({
  arg,
  argDef,
  isDynamicArgs,
  index,
  canRemove,
  onRemove,
  onChange,
  config,
  darkMode = false,
  expansionPath,
  isExpanded,
  onToggleExpansion,
  isNew
}) => {
  const [dynamicOptions, setDynamicOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const expectedArgType = isDynamicArgs 
    ? (argDef?.type || argDef?.argType) 
    : argDef?.type;

  // Load dynamic options if optionsRef is specified
  useEffect(() => {
    if (argDef?.optionsRef) {
      setIsLoading(true);
      argumentOptionsService.getOptionsForRef(argDef.optionsRef)
        .then(options => {
          setDynamicOptions(options);
          setIsLoading(false);
        })
        .catch(err => {
          console.error(`Failed to load options for ${argDef.optionsRef}:`, err);
          setDynamicOptions([]);
          setIsLoading(false);
        });
    }
  }, [argDef?.optionsRef]);

  // Determine final options and pagination status
  const options = argDef?.optionsRef ? dynamicOptions : argDef?.options;
  const isPaginated = argDef?.optionsRef && 
    argumentOptionsService.isPaginated(argDef.optionsRef);

  // Create enhanced argDef with dynamic options
  const enhancedArgDef = {
    ...argDef,
    options,
    isPaginated,
    loading: isLoading,
    onSearch: isPaginated ? (searchTerm) => {
      argumentOptionsService.getOptionsForRef(argDef.optionsRef, searchTerm)
        .then(setDynamicOptions)
        .catch(err => {
          console.error(`Search failed for ${argDef.optionsRef}:`, err);
        });
    } : undefined
  };
  
  return (
    <div style={{ 
      paddingLeft: '12px', 
      borderLeft: darkMode ? '2px solid #555555' : '2px solid #d9d9d9' 
    }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {isDynamicArgs ? `Arg ${index + 1}` : (argDef?.label || arg.name)}
            {expectedArgType && (
              <Tag color="blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                {expectedArgType}
              </Tag>
            )}
          </Text>
          {canRemove && (
            <Button
              type="text"
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Remove argument"
            />
          )}
        </Space>
        {isLoading ? (
          <div data-testid="loading-indicator">
            <Spin size="small" />
          </div>
        ) : (
          <Expression
            value={arg.value}
            onChange={onChange}
            config={config}
            expectedType={expectedArgType}
            propArgDef={enhancedArgDef}
            darkMode={darkMode}
            expansionPath={`${expansionPath}-arg-${index}`}
            isExpanded={isExpanded}
            onToggleExpansion={onToggleExpansion}
            isNew={isNew}
          />
        )}
      </Space>
    </div>
  );
};

export default FunctionArgument;
