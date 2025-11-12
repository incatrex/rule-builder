import React, { useMemo, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

/**
 * RuleCanvas Component
 * 
 * Visualizes rules as an interactive tree diagram using React Flow.
 * Converts rule JSON structure into nodes and edges for visualization.
 */

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 200;
const nodeHeight = 80;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';

    // Shift to center the node
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

// Convert rule structure to nodes and edges
const convertRuleToGraph = (rule) => {
  if (!rule || !rule.content) {
    return { nodes: [], edges: [] };
  }

  const nodes = [];
  const edges = [];
  let nodeIdCounter = 0;

  const getNodeId = () => `node-${nodeIdCounter++}`;

  // Root node
  const rootId = getNodeId();
  nodes.push({
    id: rootId,
    data: { 
      label: rule.metadata?.id || 'Rule',
      subtitle: rule.structure,
      returnType: rule.returnType
    },
    type: 'default',
    style: {
      background: '#1890ff',
      color: 'white',
      border: '2px solid #096dd9',
      borderRadius: '8px',
      padding: '10px',
      fontWeight: 'bold'
    }
  });

  // Process based on structure type
  if (rule.structure === 'condition') {
    processConditionGroup(rule.content, rootId, nodes, edges, getNodeId);
  } else if (rule.structure === 'case') {
    processCaseExpression(rule.content, rootId, nodes, edges, getNodeId);
  } else if (rule.structure === 'expression') {
    processExpression(rule.content, rootId, nodes, edges, getNodeId);
  }

  return { nodes, edges };
};

// Process condition group recursively
const processConditionGroup = (condGroup, parentId, nodes, edges, getNodeId) => {
  if (!condGroup) return;

  const groupId = getNodeId();
  const groupName = condGroup.name || 'Condition Group';
  const conjunction = condGroup.conjunction || 'AND';
  const notPrefix = condGroup.not ? 'NOT ' : '';

  // Create condition group name node
  nodes.push({
    id: groupId,
    data: { 
      label: `${notPrefix}${groupName}`,
      subtitle: 'condition group',
      type: 'group'
    },
    type: 'default',
    style: {
      background: '#52c41a',
      color: 'white',
      border: '2px solid #389e0d',
      borderRadius: '8px',
      padding: '10px'
    }
  });

  edges.push({
    id: `${parentId}-${groupId}`,
    source: parentId,
    target: groupId,
    animated: false,
    style: { stroke: '#52c41a' }
  });

  // Create conjunction node (AND/OR)
  const conjunctionId = getNodeId();
  nodes.push({
    id: conjunctionId,
    data: { 
      label: conjunction,
      subtitle: 'operator',
      type: 'conjunction'
    },
    type: 'default',
    style: {
      background: '#faad14',
      color: 'white',
      border: '2px solid #d48806',
      borderRadius: '6px',
      padding: '8px',
      fontSize: '14px',
      fontWeight: 'bold'
    }
  });

  edges.push({
    id: `${groupId}-${conjunctionId}`,
    source: groupId,
    target: conjunctionId,
    style: { stroke: '#52c41a' }
  });

  // Process conditions
  if (condGroup.conditions && Array.isArray(condGroup.conditions)) {
    condGroup.conditions.forEach((condition) => {
      if (condition.type === 'conditionGroup') {
        processConditionGroup(condition, conjunctionId, nodes, edges, getNodeId);
      } else if (condition.type === 'condition') {
        const condId = getNodeId();
        const condName = condition.name || 'Condition';
        const operator = condition.operator || '==';

        nodes.push({
          id: condId,
          data: { 
            label: condName,
            subtitle: operator,
            type: 'condition'
          },
          type: 'default',
          style: {
            background: '#fff',
            color: '#333',
            border: '2px solid #52c41a',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '12px'
          }
        });

        edges.push({
          id: `${conjunctionId}-${condId}`,
          source: conjunctionId,
          target: condId,
          style: { stroke: '#52c41a' }
        });
      }
    });
  }
};

// Process case expression
const processCaseExpression = (caseExpr, parentId, nodes, edges, getNodeId) => {
  if (!caseExpr) return;

  // Process WHEN clauses
  if (caseExpr.whenClauses && Array.isArray(caseExpr.whenClauses)) {
    caseExpr.whenClauses.forEach((whenClause, index) => {
      // Process the condition group directly
      if (whenClause.when && whenClause.when.type === 'conditionGroup') {
        const condGroup = whenClause.when;
        const groupId = getNodeId();
        const groupName = condGroup.name || `Condition ${index + 1}`;
        const conjunction = condGroup.conjunction || 'AND';
        const notPrefix = condGroup.not ? 'NOT ' : '';

        // Create condition group name node
        nodes.push({
          id: groupId,
          data: { 
            label: `${notPrefix}${groupName}`,
            subtitle: 'condition group',
            type: 'conditionGroup'
          },
          type: 'default',
          style: {
            background: '#52c41a',
            color: 'white',
            border: '2px solid #389e0d',
            borderRadius: '8px',
            padding: '10px'
          }
        });

        edges.push({
          id: `${parentId}-${groupId}`,
          source: parentId,
          target: groupId,
          label: 'WHEN',
          style: { stroke: '#fa8c16' }
        });

        // Create conjunction node (AND/OR)
        const conjunctionId = getNodeId();
        nodes.push({
          id: conjunctionId,
          data: { 
            label: conjunction,
            subtitle: 'operator',
            type: 'conjunction'
          },
          type: 'default',
          style: {
            background: '#faad14',
            color: 'white',
            border: '2px solid #d48806',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '14px',
            fontWeight: 'bold'
          }
        });

        edges.push({
          id: `${groupId}-${conjunctionId}`,
          source: groupId,
          target: conjunctionId,
          style: { stroke: '#52c41a' }
        });

        // Process conditions - point to individual condition nodes
        if (condGroup.conditions && Array.isArray(condGroup.conditions)) {
          condGroup.conditions.forEach((condition) => {
            if (condition.type === 'conditionGroup') {
              // Nested condition group - recursive call
              processConditionGroup(condition, conjunctionId, nodes, edges, getNodeId);
            } else if (condition.type === 'condition') {
              const condId = getNodeId();
              const condName = condition.name || 'Condition';
              const operator = condition.operator || '==';

              nodes.push({
                id: condId,
                data: { 
                  label: condName,
                  subtitle: operator,
                  type: 'condition'
                },
                type: 'default',
                style: {
                  background: '#fff',
                  color: '#333',
                  border: '2px solid #52c41a',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px'
                }
              });

              edges.push({
                id: `${conjunctionId}-${condId}`,
                source: conjunctionId,
                target: condId,
                style: { stroke: '#52c41a' }
              });
            }
          });
        }

        // Process the THEN result - comes from condition group node
        if (whenClause.then) {
          const thenId = getNodeId();
          const thenLabel = whenClause.resultName || getThenClauseName(whenClause.then);
          
          nodes.push({
            id: thenId,
            data: { 
              label: thenLabel,
              subtitle: whenClause.then.returnType || 'result',
              type: 'then'
            },
            type: 'default',
            style: {
              background: '#722ed1',
              color: 'white',
              border: '2px solid #531dab',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '12px'
            }
          });

          edges.push({
            id: `${groupId}-${thenId}`,
            source: groupId,
            target: thenId,
            label: 'THEN',
            style: { stroke: '#722ed1' }
          });
        }
      }
    });
  }

  // Process ELSE clause
  if (caseExpr.elseClause) {
    const elseId = getNodeId();
    const elseLabel = getThenClauseName(caseExpr.elseClause);
    
    nodes.push({
      id: elseId,
      data: { 
        label: elseLabel,
        subtitle: caseExpr.elseClause.returnType || 'result',
        type: 'else'
      },
      type: 'default',
      style: {
        background: '#eb2f96',
        color: 'white',
        border: '2px solid #c41d7f',
        borderRadius: '6px',
        padding: '8px'
      }
    });

    edges.push({
      id: `${parentId}-${elseId}`,
      source: parentId,
      target: elseId,
      label: 'ELSE',
      style: { stroke: '#eb2f96' }
    });
  }
};

// Process expression
const processExpression = (expr, parentId, nodes, edges, getNodeId) => {
  if (!expr) return;

  const exprId = getNodeId();
  const label = getExpressionLabel(expr);

  nodes.push({
    id: exprId,
    data: { 
      label: label,
      subtitle: expr.returnType || 'expression',
      type: 'expression'
    },
    type: 'default',
    style: {
      background: '#13c2c2',
      color: 'white',
      border: '2px solid #08979c',
      borderRadius: '6px',
      padding: '10px'
    }
  });

  edges.push({
    id: `${parentId}-${exprId}`,
    source: parentId,
    target: exprId,
    style: { stroke: '#13c2c2' }
  });
};

// Get a human-readable label for an expression
const getExpressionLabel = (expr) => {
  if (!expr) return 'null';
  
  if (expr.type === 'expressionGroup') {
    const expCount = expr.expressions?.length || 0;
    const opCount = expr.operators?.length || 0;
    if (expCount > 1) {
      return `Expression (${expCount} parts)`;
    } else if (expCount === 1 && expr.expressions[0]) {
      return getExpressionLabel(expr.expressions[0]);
    }
    return 'Expression';
  }
  
  if (expr.type === 'value') {
    const val = expr.value !== undefined ? String(expr.value) : '?';
    return val.length > 20 ? val.substring(0, 20) + '...' : val;
  }
  
  if (expr.type === 'field') {
    return expr.field || 'Field';
  }
  
  if (expr.type === 'function') {
    const funcName = expr.function?.name?.split('.').pop() || 'Function';
    return `${funcName}()`;
  }

  if (expr.type === 'ruleRef') {
    return `→ ${expr.id || 'Rule'}`;
  }
  
  return expr.type || 'Expression';
};

// Get a descriptive name for THEN clause content
const getThenClauseName = (expr) => {
  if (!expr) return 'null';
  
  if (expr.type === 'expressionGroup') {
    // Try to get a meaningful name from the expression
    const expCount = expr.expressions?.length || 0;
    if (expCount === 1 && expr.expressions[0]) {
      return getThenClauseName(expr.expressions[0]);
    }
    return `Expression (${expCount} parts)`;
  }
  
  if (expr.type === 'value') {
    const val = expr.value !== undefined ? String(expr.value) : '?';
    return val.length > 30 ? val.substring(0, 30) + '...' : val;
  }
  
  if (expr.type === 'field') {
    return expr.field || 'Field';
  }
  
  if (expr.type === 'function') {
    const funcName = expr.function?.name?.split('.').pop() || 'Function';
    const argCount = expr.function?.arguments?.length || 0;
    return argCount > 0 ? `${funcName}(${argCount} args)` : `${funcName}()`;
  }

  if (expr.type === 'ruleRef') {
    return expr.id || 'Rule Reference';
  }
  
  return expr.type || 'Expression';
};

const RuleCanvas = ({ rule, darkMode = false, showExpandButton = true }) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const { nodes, edges } = convertRuleToGraph(rule);
    return getLayoutedElements(nodes, edges, 'LR'); // Changed from 'TB' to 'LR' for horizontal layout
  }, [rule]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [canvasWindow, setCanvasWindow] = React.useState(null);

  // Update nodes and edges when rule changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = convertRuleToGraph(rule);
    const layouted = getLayoutedElements(newNodes, newEdges, 'LR');
    setNodes(layouted.nodes);
    setEdges(layouted.edges);

    // Send update to canvas window if it's open
    if (canvasWindow && !canvasWindow.closed) {
      canvasWindow.postMessage({
        type: 'RULE_UPDATE',
        rule: rule,
        darkMode: darkMode
      }, window.location.origin);
    }
  }, [rule, darkMode, setNodes, setEdges, canvasWindow]);

    const openInNewWindow = () => {
    // Open new window with just the canvas parameter (no rule data in URL)
    const canvasUrl = `${window.location.origin}${window.location.pathname}?canvas=true`;
    
    // Open new window and store reference
    const newWindow = window.open(canvasUrl, '_blank', 'width=1200,height=800');
    
    // Store window reference
    setCanvasWindow(newWindow);

    // Listen for CANVAS_READY message from child window
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === 'CANVAS_READY') {
        // Send initial state to child
        newWindow.postMessage({
          type: 'RULE_UPDATE',
          rule: rule,
          darkMode: darkMode
        }, window.location.origin);
      }
    };

    window.addEventListener('message', handleMessage);

    // Clean up listener when window closes
    const checkWindowClosed = setInterval(() => {
      if (newWindow.closed) {
        clearInterval(checkWindowClosed);
        window.removeEventListener('message', handleMessage);
        setCanvasWindow(null);
      }
    }, 1000);
  };

  if (!rule || !rule.content) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: darkMode ? '#999' : '#666'
      }}>
        No rule data to visualize
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {showExpandButton && (
        <Tooltip title="Open in new window">
          <Button
            type="primary"
            icon={<ExpandOutlined />}
            onClick={openInNewWindow}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            Expand
          </Button>
        </Tooltip>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
        style={{
          background: darkMode ? '#1f1f1f' : '#f5f5f5'
        }}
      >
        <Background 
          color={darkMode ? '#555' : '#aaa'} 
          gap={16} 
        />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            return node.style?.background || '#1890ff';
          }}
          maskColor={darkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
        />
      </ReactFlow>
    </div>
  );
};

export default RuleCanvas;
