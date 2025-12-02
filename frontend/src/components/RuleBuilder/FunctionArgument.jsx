import React from 'react';
import { Space, Typography, Tag, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import Expression from './Expression';

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
  const expectedArgType = isDynamicArgs 
    ? (argDef?.type || argDef?.argType) 
    : argDef?.type;
  
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
        <Expression
          value={arg.value}
          onChange={onChange}
          config={config}
          expectedType={expectedArgType}
          propArgDef={argDef}
          darkMode={darkMode}
          expansionPath={`${expansionPath}-arg-${index}`}
          isExpanded={isExpanded}
          onToggleExpansion={onToggleExpansion}
          isNew={isNew}
        />
      </Space>
    </div>
  );
};

export default FunctionArgument;
