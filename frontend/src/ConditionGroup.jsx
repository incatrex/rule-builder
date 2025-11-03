import React from 'react';
import { Card, Space, Select, Switch, Button, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, MenuOutlined } from '@ant-design/icons';
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

/**
 * DraggableItem - Wrapper component to make children draggable
 */
const DraggableItem = ({ id, children }) => {
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
            background: '#f0f0f0',
            borderRadius: '4px',
            border: '1px solid #d9d9d9',
          }}
          title="Drag to reorder"
        >
          <MenuOutlined style={{ fontSize: '14px', color: '#8c8c8c' }} />
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
 * - Conjunction (AND/OR)
 * - Optional NOT toggle
 * - Children array of conditions or nested groups
 * 
 * @param {Object} value - Group data: { type: 'group', id, conjunction, not, children: [] }
 * @param {Function} onChange - Callback when group changes
 * @param {Function} onRemove - Callback to remove this group (only for nested groups)
 * @param {Object} config - RAQB config with operators, fields, and funcs
 * @param {number} level - Nesting depth (0 = root, 1+ = nested)
 */
const ConditionGroup = ({ value, onChange, onRemove, config, level = 0 }) => {
  
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
  
  // Add a new nested group
  const handleAddGroup = () => {
    const newGroup = {
      type: 'group',
      id: generateId(),
      conjunction: 'AND',
      not: false,
      children: []
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
    const colors = ['#ffffff', '#f0f5ff', '#e6f7ff', '#d6e4ff', '#bae7ff'];
    return colors[Math.min(lvl, colors.length - 1)];
  };
  
  return (
    <Card
      size="small"
      style={{
        background: getBackgroundColor(level),
        border: level === 0 ? '2px solid #1890ff' : '1px solid #d9d9d9',
        marginLeft: level > 0 ? '20px' : '0'
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Group Header - Conjunction, NOT, and Action Buttons */}
        <Space wrap>
          <Text strong style={{ marginRight: '8px' }}>
            Group
          </Text>
          
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
          
          {/* NOT Toggle */}
          <Switch
            checked={value.not || false}
            onChange={(not) => onChange({ ...value, not })}
            checkedChildren="NOT"
            unCheckedChildren="NOT"
            size="small"
          />
          
          {/* Action Buttons */}
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
          
          {/* Delete Group button (only for nested groups) */}
          {level > 0 && onRemove && (
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={onRemove}
            >
              Delete Group
            </Button>
          )}
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
                  <DraggableItem key={child.id} id={child.id}>
                    {/* Show conjunction between children (except before first child) */}
                    {index > 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        margin: '4px 0 8px 0',
                        color: '#1890ff',
                        fontWeight: 'bold'
                      }}>
                        {value.not && index === 1 ? `NOT ${value.conjunction}` : value.conjunction}
                      </div>
                    )}
                    
                    {/* Render Condition or Nested Group */}
                    {child.type === 'rule' ? (
                      <Condition
                        value={child}
                        onChange={(newChild) => updateChild(index, newChild)}
                        onRemove={() => removeChild(index)}
                        config={config}
                      />
                    ) : (
                      <ConditionGroup
                        value={child}
                        onChange={(newChild) => updateChild(index, newChild)}
                        onRemove={() => removeChild(index)}
                        config={config}
                        level={level + 1}
                      />
                    )}
                  </DraggableItem>
                ))}
              </Space>
            </SortableContext>
          </DndContext>
        ) : (
          <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '16px' }}>
            No conditions yet. Click "Add Condition" or "Add Group" to start building.
          </Text>
        )}
      </Space>
    </Card>
  );
};

export default ConditionGroup;
