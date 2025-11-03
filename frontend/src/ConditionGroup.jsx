import React, { useState } from 'react';
import { Card, Space, Select, Switch, Button, Typography, Collapse, Input } from 'antd';
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
 * ConditionGroup Component - Recursive component for building condition groups
 * 
 * A group contains:
 * - Name (editable)
 * - Conjunction (AND/OR)
 * - Optional NOT toggle
 * - Children array of conditions or nested groups
 * - Collapsible/expandable
 * 
 * @param {Object} value - Group data: { type: 'group', id, name, conjunction, not, children: [], isExpanded: true }
 * @param {Function} onChange - Callback when group changes
 * @param {Function} onRemove - Callback to remove this group (only for nested groups)
 * @param {Object} config - Config object with operators, fields, and funcs
 * @param {number} level - Nesting depth (0 = root, 1+ = nested)
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
const ConditionGroup = ({ value, onChange, onRemove, config, level = 0, darkMode = false }) => {
  
  // Local state for name editing
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Get or initialize group name
  const groupName = value.name || `Group ${level + 1}`;
  const isExpanded = value.isExpanded !== false; // Default to expanded
  
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
      const oldIndex = (value.children || []).findIndex(child => child.id === active.id);
      const newIndex = (value.children || []).findIndex(child => child.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newChildren = arrayMove(value.children, oldIndex, newIndex);
        onChange({ ...value, children: newChildren });
      }
    }
  };
  
  // Add a new condition to this group
  const handleAddCondition = () => {
    const newCondition = {
      type: 'rule',
      id: generateId(),
      left: { type: 'value', valueType: 'text', value: '' },
      operator: 'equal',
      right: { type: 'value', valueType: 'text', value: '' }
    };
    
    onChange({
      ...value,
      children: [...(value.children || []), newCondition]
    });
  };
  
  // Add a new nested group (with an initial empty condition)
  const handleAddGroup = () => {
    const childGroupCount = (value.children || []).filter(c => c.type === 'group').length;
    const newGroup = {
      type: 'group',
      id: generateId(),
      name: `Group ${level + 2}.${childGroupCount + 1}`,
      conjunction: 'AND',
      not: false,
      children: [
        // Auto-add an empty condition to the new group
        {
          type: 'rule',
          id: generateId(),
          left: { type: 'value', valueType: 'text', value: '' },
          operator: 'equal',
          right: { type: 'value', valueType: 'text', value: '' }
        }
      ],
      isExpanded: true
    };
    
    onChange({
      ...value,
      children: [...(value.children || []), newGroup]
    });
  };
  
  // Update a child at specific index
  const updateChild = (index, newChild) => {
    const newChildren = [...(value.children || [])];
    newChildren[index] = newChild;
    onChange({ ...value, children: newChildren });
  };
  
  // Remove a child at specific index
  const removeChild = (index) => {
    const newChildren = (value.children || []).filter((_, i) => i !== index);
    onChange({ ...value, children: newChildren });
  };
  
  // Background colors based on nesting level
  const getBackgroundColor = (lvl) => {
    if (darkMode) {
      // Darker grays for dark mode, getting slightly lighter at each level
      const colors = ['#1f1f1f', '#252525', '#2a2a2a', '#2f2f2f', '#333333'];
      return colors[Math.min(lvl, colors.length - 1)];
    } else {
      // Light blues for light mode
      const colors = ['#ffffff', '#f0f5ff', '#e6f7ff', '#d6e4ff', '#bae7ff'];
      return colors[Math.min(lvl, colors.length - 1)];
    }
  };
  
  return (
    <Collapse
      activeKey={isExpanded ? ['group'] : []}
      onChange={(keys) => onChange({ ...value, isExpanded: keys.includes('group') })}
      style={{
        background: getBackgroundColor(level),
        border: level === 0 ? '2px solid #1890ff' : '1px solid #d9d9d9',
        marginLeft: level > 0 ? '20px' : '0'
      }}
    >
      <Panel
        key="group"
        header={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Text strong>Condition Group:</Text>
              {isEditingName ? (
                <Input
                  size="small"
                  value={groupName}
                  onChange={(e) => onChange({ ...value, name: e.target.value })}
                  onPressEnter={() => setIsEditingName(false)}
                  onBlur={() => setIsEditingName(false)}
                  autoFocus
                  style={{ width: '200px' }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <Text code>{groupName}</Text>
                  <EditOutlined 
                    style={{ fontSize: '12px', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingName(true);
                    }}
                  />
                </>
              )}
            </Space>
          </Space>
        }
        extra={
          level > 0 && onRemove ? (
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
          {/* Group Controls - Conjunction and NOT */}
          <Space wrap>
            {/* NOT Toggle */}
            <Switch
              checked={value.not || false}
              onChange={(not) => onChange({ ...value, not })}
              checkedChildren="NOT"
              unCheckedChildren="NOT"
              size="small"
            />
            
            <Text strong style={{ marginLeft: '8px', marginRight: '4px' }}>Conjunction:</Text>
            
            {/* Conjunction Selector */}
            <Select
              value={value.conjunction || 'AND'}
              onChange={(conjunction) => onChange({ ...value, conjunction })}
              style={{ width: 80 }}
              size="small"
            >
              <Select.Option value="AND">AND</Select.Option>
              <Select.Option value="OR">OR</Select.Option>
            </Select>
          </Space>
          
          {/* Children - Conditions and Nested Groups */}
          {value.children && value.children.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={(value.children || []).map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {value.children.map((child, index) => (
                  <DraggableItem key={child.id} id={child.id} darkMode={darkMode}>
                    {/* Show conjunction between children (except before first child) */}
                    {index > 0 && (
                      <div style={{ 
                        textAlign: 'left', 
                        margin: '4px 0 8px 0',
                        paddingLeft: '8px',
                        color: '#1890ff',
                        fontWeight: 'bold'
                      }}>
                        {value.conjunction}
                      </div>
                    )}
                    
                    {/* Render Condition or Nested Group */}
                    {child.type === 'rule' ? (
                      <Condition
                        value={child}
                        onChange={(newChild) => updateChild(index, newChild)}
                        onRemove={() => removeChild(index)}
                        config={config}
                        darkMode={darkMode}
                      />
                    ) : (
                      <ConditionGroup
                        value={child}
                        onChange={(newChild) => updateChild(index, newChild)}
                        onRemove={() => removeChild(index)}
                        config={config}
                        level={level + 1}
                        darkMode={darkMode}
                      />
                    )}
                  </DraggableItem>
                ))}
              </Space>
            </SortableContext>
          </DndContext>
        ) : null}
        
        {/* Action Buttons - Add Condition and Add Group */}
        <Space wrap style={{ marginTop: value.children && value.children.length > 0 ? '8px' : '0' }}>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddCondition}
          >
            Add Condition
          </Button>
          
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddGroup}
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
