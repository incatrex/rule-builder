import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Typography, Input, Collapse, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, MenuOutlined, EditOutlined } from '@ant-design/icons';
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
 * - value: ConditionGroup object { name, returnType, conjunction, children }
 * - onChange: Callback when group changes
 * - config: Config with operators, fields, funcs
 * - darkMode: Dark mode styling
 * - onRemove: Callback to remove this group
 * - depth: Nesting depth for styling
 */
const ConditionGroup = ({ value, onChange, config, darkMode = false, onRemove, depth = 0 }) => {
  const [groupData, setGroupData] = useState(value || {
    returnType: 'boolean',
    name: 'New Group',
    conjunction: 'AND',
    not: false,
    children: [],
    isExpanded: true
  });
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    if (value) {
      setGroupData(value);
    }
  }, [value]);

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      const oldIndex = (groupData.children || []).findIndex(child => child.id === active.id);
      const newIndex = (groupData.children || []).findIndex(child => child.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newChildren = arrayMove(groupData.children, oldIndex, newIndex);
        handleChange({ children: newChildren });
      }
    }
  };

  const handleChange = (updates) => {
    const updated = { ...groupData, ...updates };
    setGroupData(updated);
    onChange(updated);
  };

  const addCondition = () => {
    const newCondition = {
      type: 'condition',
      id: generateId(),
      returnType: 'boolean',
      name: `Condition ${groupData.children.length + 1}`,
      left: { source: 'field', returnType: 'text', field: null },
      operator: null,
      right: { source: 'value', returnType: 'text', value: '' }
    };
    handleChange({ children: [...groupData.children, newCondition] });
  };

  const addConditionGroup = () => {
    const newGroup = {
      type: 'conditionGroup',
      id: generateId(),
      returnType: 'boolean',
      name: `Group ${depth + 2}.${groupData.children.filter(c => c.type === 'conditionGroup').length + 1}`,
      conjunction: 'AND',
      not: false,
      children: [
        // Auto-add an empty condition to the new group
        {
          type: 'condition',
          id: generateId(),
          returnType: 'boolean',
          name: 'Condition 1',
          left: { source: 'field', returnType: 'text', field: null },
          operator: null,
          right: { source: 'value', returnType: 'text', value: '' }
        }
      ],
      isExpanded: true
    };
    handleChange({ children: [...groupData.children, newGroup] });
  };

  const removeChild = (index) => {
    const updatedChildren = groupData.children.filter((_, i) => i !== index);
    handleChange({ children: updatedChildren });
  };

  const updateChild = (index, newValue) => {
    const updatedChildren = [...groupData.children];
    updatedChildren[index] = newValue;
    handleChange({ children: updatedChildren });
  };

  // Background colors for different depths
  const backgroundColors = darkMode 
    ? ['#1f1f1f', '#252525', '#2a2a2a', '#2f2f2f', '#333333']
    : ['#ffffff', '#f0f5ff', '#e6f7ff', '#d6e4ff', '#bae7ff'];
  
  const backgroundColor = backgroundColors[Math.min(depth, backgroundColors.length - 1)];
  const isExpanded = groupData.isExpanded !== false; // Default to expanded

  return (
    <Collapse
      activeKey={isExpanded ? ['group'] : []}
      onChange={(keys) => handleChange({ isExpanded: keys.includes('group') })}
      style={{
        background: backgroundColor,
        border: depth === 0 ? '2px solid #1890ff' : '1px solid #d9d9d9',
        marginLeft: depth > 0 ? '20px' : '0',
        marginBottom: '8px'
      }}
    >
      <Panel
        key="group"
        header={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size="small">
              <Text strong style={{ color: darkMode ? '#e0e0e0' : 'inherit' }}>Condition Group:</Text>
              {editingName ? (
                <Input
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
            <DeleteOutlined
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{ color: 'red' }}
            />
          ) : null
        }
      >
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

          {/* Children - with drag-and-drop */}
          {groupData.children && groupData.children.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={(groupData.children || []).map(c => c.id || c.type + Math.random())}
                strategy={verticalListSortingStrategy}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {groupData.children.map((child, index) => {
                    // Ensure child has an ID
                    if (!child.id) {
                      child.id = generateId();
                    }
                    
                    return (
                      <div key={child.id}>
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
                        
                        <DraggableItem id={child.id} darkMode={darkMode}>
                          {/* Render Condition or Nested Group */}
                          {child.type === 'condition' ? (
                            <Condition
                              value={child}
                              onChange={(newValue) => updateChild(index, newValue)}
                              config={config}
                              darkMode={darkMode}
                              onRemove={() => removeChild(index)}
                            />
                          ) : (
                            <ConditionGroup
                              value={child}
                              onChange={(newValue) => updateChild(index, newValue)}
                              config={config}
                              darkMode={darkMode}
                              onRemove={() => removeChild(index)}
                              depth={depth + 1}
                            />
                          )}
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
          <Space wrap style={{ marginTop: groupData.children && groupData.children.length > 0 ? '8px' : '0' }}>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={addCondition}
            >
              Add Condition
            </Button>
            
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={addConditionGroup}
            >
              Add Group
            </Button>
          </Space>
        </Space>
      </Panel>
    </Collapse>
  );
};

export default ConditionGroup;
