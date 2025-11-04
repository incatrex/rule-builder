import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'antd';
import { LeftOutlined, RightOutlined, ColumnWidthOutlined } from '@ant-design/icons';

/**
 * ResizablePanels Component
 * 
 * A two-panel layout with a draggable divider and collapse/expand functionality.
 * 
 * Props:
 * - leftPanel: React element for left panel
 * - rightPanel: React element for right panel
 * - defaultLeftWidth: Default width percentage for left panel (default: 50)
 * - minLeftWidth: Minimum width percentage for left panel (default: 20)
 * - maxLeftWidth: Maximum width percentage for left panel (default: 80)
 * - darkMode: Dark mode styling
 */
const ResizablePanels = ({ 
  leftPanel, 
  rightPanel, 
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  darkMode = false 
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const savedWidthRef = useRef(defaultLeftWidth);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const offsetX = e.clientX - containerRect.left;
      const newLeftWidth = (offsetX / containerRect.width) * 100;

      // Clamp between min and max
      const clampedWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
      setLeftWidth(clampedWidth);
      savedWidthRef.current = clampedWidth;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  const handleCollapse = () => {
    if (isCollapsed) {
      // Expand: restore saved width
      setLeftWidth(savedWidthRef.current);
      setIsCollapsed(false);
    } else {
      // Collapse: save current width and expand left to 100%
      savedWidthRef.current = leftWidth;
      setLeftWidth(100);
      setIsCollapsed(true);
    }
  };

  const actualLeftWidth = isCollapsed ? 100 : leftWidth;
  const rightWidth = 100 - actualLeftWidth;

  return (
    <div 
      ref={containerRef}
      style={{ 
        display: 'flex', 
        height: '100%', 
        position: 'relative',
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      {/* Left Panel */}
      <div style={{ width: `${actualLeftWidth}%`, height: '100%', overflow: 'auto' }}>
        {leftPanel}
      </div>

      {/* Divider */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '8px',
            height: '100%',
            background: darkMode ? '#434343' : '#d9d9d9',
            cursor: 'col-resize',
            position: 'relative',
            flexShrink: 0,
            transition: isDragging ? 'none' : 'background 0.2s',
            ':hover': {
              background: darkMode ? '#555555' : '#bfbfbf'
            }
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = darkMode ? '#555555' : '#bfbfbf';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = darkMode ? '#434343' : '#d9d9d9';
            }
          }}
        >
          {/* Drag Handle Icon */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: darkMode ? '#888888' : '#666666',
              fontSize: '16px',
              pointerEvents: 'none'
            }}
          >
            <ColumnWidthOutlined />
          </div>
          
          {/* Collapse Button on Divider */}
          <Button
            type="primary"
            size="small"
            icon={<RightOutlined />}
            onClick={handleCollapse}
            style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'auto'
            }}
            title="Hide JSON Panel"
          />
        </div>
      )}

      {/* Right Panel */}
      {!isCollapsed && (
        <div style={{ width: `${rightWidth}%`, height: '100%', overflow: 'auto' }}>
          {rightPanel}
        </div>
      )}

      {/* Expand Button - Only shown when collapsed */}
      {isCollapsed && (
        <Button
          type="primary"
          icon={<LeftOutlined />}
          onClick={handleCollapse}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
          title="Show JSON Panel"
        >
          Show JSON
        </Button>
      )}
    </div>
  );
};

export default ResizablePanels;
