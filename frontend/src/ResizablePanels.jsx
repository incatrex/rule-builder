import React, { useState, useRef, useEffect } from 'react';
import { ColumnWidthOutlined } from '@ant-design/icons';

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
 * - rightPanelCollapsed: External control for right panel collapse state
 */
const ResizablePanels = ({ 
  leftPanel, 
  rightPanel, 
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  darkMode = false,
  rightPanelCollapsed = false
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const savedWidthRef = useRef(defaultLeftWidth);

  const isCollapsed = rightPanelCollapsed;

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

  const actualLeftWidth = isCollapsed ? 100 : leftWidth;
  const rightWidth = 100 - actualLeftWidth;

  return (
    <div 
      ref={containerRef}
      style={{ 
        display: 'flex', 
        width: '100%',
        flex: 1,
        minWidth: 0,
        position: 'relative',
        userSelect: isDragging ? 'none' : 'auto',
        alignItems: 'stretch'
      }}
    >
      {/* Left Panel */}
      <div style={{ 
        width: isCollapsed ? '100%' : `${actualLeftWidth}%`, 
        flex: isCollapsed ? '1' : 'none',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {leftPanel}
      </div>

      {/* Divider */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '8px',
            alignSelf: 'stretch',
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
              position: 'sticky',
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
        </div>
      )}

      {/* Right Panel */}
      {!isCollapsed && (
        <div style={{ 
          width: `${rightWidth}%`, 
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0
        }}>
          {rightPanel}
        </div>
      )}
    </div>
  );
};

export default ResizablePanels;
