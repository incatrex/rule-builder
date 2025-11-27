import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Typography, Input, Collapse, Switch } from 'antd';
import { PlusOutlined, CloseOutlined, MenuOutlined, EditOutlined, LinkOutlined, GroupOutlined, BranchesOutlined } from '@ant-design/icons';
import ConditionSourceSelector from './ConditionSourceSelector';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Condition from './Condition';
import RuleReference from './RuleReference';

const { Text } = Typography;
const { Panel } = Collapse;

/**
 * DraggableItem - Wrapper component to make children draggable
 */
const DraggableItem = ({ id, children, darkMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            background: darkMode ? '#3a3a3a' : '#f0f0f0',
            borderRadius: '4px',
            border: darkMode ? '1px solid #555555' : '1px solid #d9d9d9',
          }}
          title="Drag to reorder"
        >
          <MenuOutlined style={{ fontSize: '14px', color: darkMode ? '#b0b0b0' : '#8c8c8c' }} />
        </div>
        {/* Original content */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * ConditionGroup Component
 * 
 * Represents a group of conditions with a conjunction (AND/OR).
 * Can contain nested ConditionGroups or Conditions.
 * Follows structure: <conditionGroup returnType="boolean" name="">
 *   <conjunction>
 *   [<condition> | <conditionGroup>]
 * 
 * Props:
 * - value: ConditionGroup object { name, returnType, conjunction, conditions }
 * - onChange: Callback when group changes
 * - config: Config with operators, fields, functions
 * - darkMode: Dark mode styling
 * - onRemove: Callback to remove this group
 * - depth: Nesting depth for styling
 * - expansionPath: Unique path identifier for expansion state
 * - isExpanded: Function to check if a path is expanded
 * - onToggleExpansion: Function to toggle expansion state
 * - isNew: Boolean indicating new vs loaded rule
 */
const ConditionGroup = ({ 
  value, 
  onChange, 
  config, 
  darkMode = false, 
  onRemove, 
  depth = 0, 
  isSimpleCondition = false, 
  compact = false,
  hideHeader = false,
  expansionPath = 'conditionGroup-0',
  isExpanded,
  onToggleExpansion,
  onSetExpansion,
  isNew = false
}) => {
  const [groupData, setGroupData] = useState(value || {
    type: 'conditionGroup',
    returnType: 'boolean',
    name: 'Main Condition',
    conjunction: 'AND',
    conditions: []
  });
  const [editingName, setEditingName] = useState(false);
  
  // Track source type: 'condition', 'conditionGroup', or 'ruleRef'
  const determineSourceType = (data) => {
    if (data.ruleRef) return 'ruleRef';
    if (data.type === 'condition') return 'condition';
    return 'conditionGroup';
  };
  const [sourceType, setSourceType] = useState(determineSourceType(groupData));
  
  // Use centralized expansion state
  const expanded = isExpanded(expansionPath);

  useEffect(() => {
    if (value) {
      setGroupData(value);
      setSourceType(determineSourceType(value));
    }
  }, [value]);

  // Setup drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const conditions = groupData.conditions || [];
      const oldIndex = parseInt(active.id);
      const newIndex = parseInt(over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newConditions = arrayMove(conditions, oldIndex, newIndex);
        handleChange({ conditions: newConditions });
      }
    }
  };

  const handleChange = (updates) => {
    const updated = { ...groupData, ...updates };
    setGroupData(updated);
    
    // Keep the structure intact for internal component communication
    // Only clean at the final JSON output stage
    onChange(updated);
  };

  // Handle source type changes (condition, conditionGroup, or ruleRef)
  const handleSourceChange = (newSourceType) => {
    setSourceType(newSourceType);
    
    if (newSourceType === 'ruleRef') {
      // Switching to ruleRef - create new ruleRef
      const newData = {
        type: 'conditionGroup',
        returnType: 'boolean',
        name: groupData.name || 'Rule Reference',
        ruleRef: {
          id: null,
          uuid: null,
          version: 1,
          returnType: 'boolean'
        }
      };
      setGroupData(newData);
      onChange(newData);
    } else if (newSourceType === 'condition') {
      // Switching to single condition
      if (groupData.type === 'conditionGroup' && groupData.conditions?.length > 0) {
        // If coming from a group, extract the first condition
        const firstCondition = groupData.conditions[0];
        setGroupData(firstCondition);
        onChange(firstCondition);
      } else {
        // Otherwise create a new empty condition
        const { ruleRef, conjunction, conditions, ...rest } = groupData;
        const defaultOperator = config?.types?.number?.defaultConditionOperator || 'equal';
        const newData = {
          ...rest,
          type: 'condition',
          returnType: 'boolean',
          name: groupData.name || 'Condition',
          left: { 
            type: 'expressionGroup',
            returnType: 'number',
            expressions: [{ type: 'field', returnType: 'number', field: null }],
            operators: []
          },
          operator: defaultOperator,
          right: { 
            type: 'expressionGroup',
            returnType: 'number',
            expressions: [{ type: 'value', returnType: 'number', value: '' }],
            operators: []
          }
        };
        setGroupData(newData);
        onChange(newData);
      }
    } else {
      // Switching to conditionGroup - wrap existing content + add new condition
      const defaultOperator = config?.types?.number?.defaultConditionOperator || 'equal';
      
      // Keep the existing condition as-is (expressions can be direct Expression or ExpressionGroup)
      const wrappedExistingCondition = {
        ...groupData,
        name: groupData.name || 'Condition 1'
      };
      
      // Create new empty condition with direct expressions
      const newCondition = {
        type: 'condition',
        returnType: 'boolean',
        name: 'Condition 2',
        left: { 
          type: 'field',
          returnType: 'number',
          field: 'TABLE1.NUMBER_FIELD_01'
        },
        operator: defaultOperator,
        right: { 
          type: 'value',
          returnType: 'number',
          value: 0
        }
      };
      
      // Create group containing existing item + new condition
      const newData = {
        type: 'conditionGroup',
        returnType: 'boolean',
        name: groupData.name || 'Group',
        conjunction: 'AND',
        not: false,
        conditions: [
          wrappedExistingCondition,
          newCondition
        ]
      };
      setGroupData(newData);
      onChange(newData);
      
      // Auto-expand both conditions in the new group
      if (onSetExpansion) {
        onSetExpansion(`${expansionPath}-condition-0`, true);
        onSetExpansion(`${expansionPath}-condition-1`, true);
      }
    }
    
    // Ensure the item stays expanded after source change
    if (onSetExpansion) {
      onSetExpansion(expansionPath, true);
    }
  };

  // Handle rule reference changes
  const handleRuleRefChange = (newRuleRef) => {
    const updated = {
      ...groupData,
      ruleRef: { ...newRuleRef, returnType: 'boolean' } // Ensure boolean for condition groups
    };
    setGroupData(updated);
    onChange(updated);
  };

  const addCondition = () => {
    const conditions = groupData.conditions || [];
    // Get default operator from config.types.number.defaultConditionOperator
    const defaultOperator = config?.types?.number?.defaultConditionOperator || 'equal';
    const newCondition = {
      type: 'condition',
      returnType: 'boolean',
      name: `Condition ${conditions.length + 1}`,
      left: { 
        type: 'expressionGroup',
        returnType: 'number',
        expressions: [{ type: 'field', returnType: 'number', field: null }],
        operators: []
      },
      operator: defaultOperator,
      right: { 
        type: 'expressionGroup',
        returnType: 'number',
        expressions: [{ type: 'value', returnType: 'number', value: '' }],
        operators: []
      }
    };
    handleChange({ conditions: [...conditions, newCondition] });
    
    // Auto-expand the new condition
    if (onSetExpansion) {
      const newConditionPath = `${expansionPath}-condition-${conditions.length}`;
      onSetExpansion(newConditionPath, true);
    }
  };

  const addConditionGroup = () => {
    const conditions = groupData.conditions || [];
    const newGroup = {
      type: 'conditionGroup',
      returnType: 'boolean',
      name: `Group ${depth + 2}.${conditions.filter(c => c.type === 'conditionGroup').length + 1}`,
      conjunction: 'AND',
      not: false,
      conditions: [
        // Auto-add 2 empty conditions to the new group (to prevent auto-unwrap)
        {
          type: 'condition',
          returnType: 'boolean',
          name: 'Condition 1',
          left: { 
            type: 'expressionGroup',
            returnType: 'number',
            expressions: [{ type: 'field', returnType: 'number', field: null }],
            operators: []
          },
          operator: null,
          right: { 
            type: 'expressionGroup',
            returnType: 'number',
            expressions: [{ type: 'value', returnType: 'number', value: '' }],
            operators: []
          }
        },
        {
          type: 'condition',
          returnType: 'boolean',
          name: 'Condition 2',
          left: { 
            type: 'expressionGroup',
            returnType: 'number',
            expressions: [{ type: 'field', returnType: 'number', field: null }],
            operators: []
          },
          operator: null,
          right: { 
            type: 'expressionGroup',
            returnType: 'number',
            expressions: [{ type: 'value', returnType: 'number', value: '' }],
            operators: []
          }
        }
      ]
    };
    handleChange({ conditions: [...conditions, newGroup] });
    
    // Auto-expand the new group and its conditions
    if (onSetExpansion) {
      // Use 'condition' prefix to match rendering path (Condition component routes internally)
      const newGroupIndex = conditions.length;
      const newGroupPath = `${expansionPath}-condition-${newGroupIndex}`;
      onSetExpansion(newGroupPath, true);
      onSetExpansion(`${newGroupPath}-condition-0`, true);
      onSetExpansion(`${newGroupPath}-condition-1`, true);
    }
  };

  const removeChild = (index) => {
    const conditions = groupData.conditions || [];
    const updatedConditions = conditions.filter((_, i) => i !== index);
    
    // Allow single-condition groups (useful for NOT toggle on groups)
    // No auto-unwrap - keep the group structure
    
    // If removing results in 0 conditions, let parent handle it (likely remove the entire group)
    if (updatedConditions.length === 0 && onRemove) {
      onRemove();
      return;
    }
    
    handleChange({ conditions: updatedConditions });
  };

  const updateChild = (index, newValue) => {
    const conditions = groupData.conditions || [];
    const updatedConditions = [...conditions];
    updatedConditions[index] = newValue;
    handleChange({ conditions: updatedConditions });
  };

  // Background colors for different depths
  const backgroundColors = darkMode 
    ? ['#1f1f1f', '#252525', '#2a2a2a', '#2f2f2f', '#333333']
    : ['#ffffff', '#f0f5ff', '#e6f7ff', '#d6e4ff', '#bae7ff'];
  
  const backgroundColor = backgroundColors[Math.min(depth, backgroundColors.length - 1)];

  // Main content that will be rendered either wrapped in Collapse or standalone
  const groupContent = (
    <div>
      {sourceType === 'ruleRef' ? (
        <RuleReference
          value={groupData.ruleRef || {}}
          onChange={handleRuleRefChange}
          config={config}
          darkMode={darkMode}
          expectedType="boolean"
          compact={compact}
        />
      ) : sourceType === 'condition' ? (
        <Condition
          value={groupData}
          onChange={(updatedCondition) => {
            setGroupData(updatedCondition);
            onChange(updatedCondition);
          }}
          config={config}
          darkMode={darkMode}
          compact={compact}
          hideRemove={true}
          expansionPath={`${expansionPath}-single`}
          isExpanded={isExpanded}
          onToggleExpansion={onToggleExpansion}
          onSetExpansion={onSetExpansion}
          isNew={isNew}
        />
      ) : (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Group Controls - NOT and Conjunction */}
      <Space wrap>
        {/* NOT Toggle */}
        <Switch
          checked={groupData.not || false}
          onChange={(not) => handleChange({ not })}
          checkedChildren="NOT"
          unCheckedChildren="NOT"
          size="small"
        />
        
        <Text strong style={{ marginLeft: '8px', marginRight: '4px', color: darkMode ? '#e0e0e0' : 'inherit' }}>
          Conjunction:
        </Text>
        
        {/* Conjunction Selector */}
        <Select
          value={groupData.conjunction}
          onChange={(conj) => handleChange({ conjunction: conj })}
          style={{ width: 80 }}
          size="small"
          options={[
            { value: 'AND', label: 'AND' },
            { value: 'OR', label: 'OR' }
          ]}
        />
      </Space>

      {/* Conditions - with drag-and-drop */}
      {groupData.conditions && groupData.conditions.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={(groupData.conditions || []).map((c, idx) => String(idx))}
            strategy={verticalListSortingStrategy}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {(groupData.conditions || []).map((child, index) => {
                return (
                  <div key={index}>
                    {/* Show conjunction between children (except before first child) */}
                    {index > 0 && (
                      <div style={{ 
                        textAlign: 'left', 
                        margin: '4px 0 8px 0',
                        paddingLeft: '8px',
                        color: '#1890ff',
                        fontWeight: 'bold'
                      }}>
                        {groupData.conjunction}
                      </div>
                    )}
                    
                    <DraggableItem id={String(index)} darkMode={darkMode}>
                      {/* Render Condition (smart router handles both condition and conditionGroup) */}
                      <Condition
                        value={child}
                        onChange={(newValue) => updateChild(index, newValue)}
                        config={config}
                        darkMode={darkMode}
                        onRemove={() => removeChild(index)}
                        depth={depth + 1}
                        isSimpleCondition={isSimpleCondition}
                        compact={false}
                        expansionPath={`${expansionPath}-condition-${index}`}
                        isExpanded={isExpanded}
                        onToggleExpansion={onToggleExpansion}
                        onSetExpansion={onSetExpansion}
                        isNew={isNew}
                      />
                    </DraggableItem>
                  </div>
                );
              })}
            </Space>
          </SortableContext>
        </DndContext>
      ) : (
        <Text 
          type="secondary" 
          style={{ 
            display: 'block', 
            textAlign: 'center',
            padding: '16px',
            color: darkMode ? '#888888' : '#999999'
          }}
        >
          No conditions yet. Add a condition or group below.
        </Text>
      )}

      {/* Add Buttons */}
      <Space wrap style={{ marginTop: groupData.conditions && groupData.conditions.length > 0 ? '8px' : '0' }}>
        <Button
          type="primary"
          size="small"
          icon={<BranchesOutlined />}
          onClick={addCondition}
        >
          Add Condition
        </Button>
        
        <Button
          size="small"
          icon={<GroupOutlined />}
          onClick={addConditionGroup}
        >
          Add Group
        </Button>
      </Space>
      </Space>
      )}
    </div>
  );  
  
  // Hide header mode: render content directly without any wrapper (used when embedded in Condition)
  if (hideHeader) {
    return groupContent;
  }
  
  // Compact mode: render without Collapse wrapper
  if (compact) {
    return (
      <div style={{ width: '100%' }}>
        {groupContent}
      </div>
    );
  }

  // Normal mode: render with Collapse wrapper and header
  return (
    <Collapse
      activeKey={expanded ? ['group'] : []}
      onChange={() => onToggleExpansion(expansionPath)}
      style={{
        background: backgroundColor,
        border: depth === 0 ? '2px solid #1890ff' : '1px solid #d9d9d9',
        marginLeft: depth > 0 ? '20px' : '0',
        marginBottom: '8px'
      }}
    >
      <Panel
        key="group"
        style={{
          background: backgroundColor
        }}
        header={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size="small">
              <Space size="small" align="center">
                <ConditionSourceSelector
                  value={sourceType}
                  onChange={handleSourceChange}
                />
              </Space>
              <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>Condition Group:</Text>
              {editingName ? (
                <Input
                  data-testid={`conditionGroup-${depth}-name-input`}
                  size="small"
                  value={groupData.name || ''}
                  onChange={(e) => handleChange({ name: e.target.value })}
                  onPressEnter={() => setEditingName(false)}
                  onBlur={() => setEditingName(false)}
                  autoFocus
                  style={{ width: '200px' }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <Text code>{groupData.name || 'Unnamed Group'}</Text>
                  <EditOutlined 
                    data-testid={`conditionGroup-${depth}-name-edit-icon`}
                    style={{ fontSize: '12px', cursor: 'pointer', color: darkMode ? '#b0b0b0' : '#8c8c8c' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingName(true);
                    }}
                  />
                </>
              )}
            </Space>
          </Space>
        }
        extra={
          depth > 0 && onRemove ? (
            <CloseOutlined
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{ color: 'red', cursor: 'pointer' }}
            />
          ) : null
        }
      >
        {groupContent}
      </Panel>
    </Collapse>
  );
};

export default ConditionGroup;
