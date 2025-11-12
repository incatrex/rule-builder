import React, { useMemo } from 'react';
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

  nodes.push({
    id: groupId,
    data: { 
      label: `${notPrefix}${groupName}`,
      subtitle: conjunction,
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

  // Process conditions
  if (condGroup.conditions && Array.isArray(condGroup.conditions)) {
    condGroup.conditions.forEach((condition) => {
      if (condition.type === 'conditionGroup') {
        processConditionGroup(condition, groupId, nodes, edges, getNodeId);
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
          id: `${groupId}-${condId}`,
          source: groupId,
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
      const whenId = getNodeId();
      
      nodes.push({
        id: whenId,
        data: { 
          label: `WHEN ${index + 1}`,
          subtitle: 'condition',
          type: 'when'
        },
        type: 'default',
        style: {
          background: '#fa8c16',
          color: 'white',
          border: '2px solid #d46b08',
          borderRadius: '8px',
          padding: '10px'
        }
      });

      edges.push({
        id: `${parentId}-${whenId}`,
        source: parentId,
        target: whenId,
        label: 'WHEN',
        style: { stroke: '#fa8c16' }
      });

      // Process the condition
      if (whenClause.when) {
        if (whenClause.when.type === 'conditionGroup') {
          processConditionGroup(whenClause.when, whenId, nodes, edges, getNodeId);
        }
      }

      // Process the THEN result
      if (whenClause.then) {
        const thenId = getNodeId();
        nodes.push({
          id: thenId,
          data: { 
            label: 'THEN',
            subtitle: getExpressionLabel(whenClause.then),
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
          id: `${whenId}-${thenId}`,
          source: whenId,
          target: thenId,
          label: 'THEN',
          style: { stroke: '#722ed1' }
        });
      }
    });
  }

  // Process ELSE clause
  if (caseExpr.elseClause) {
    const elseId = getNodeId();
    nodes.push({
      id: elseId,
      data: { 
        label: 'ELSE',
        subtitle: getExpressionLabel(caseExpr.elseClause),
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

const RuleCanvas = ({ rule, darkMode = false, showExpandButton = true }) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const { nodes, edges } = convertRuleToGraph(rule);
    return getLayoutedElements(nodes, edges, 'LR'); // Changed from 'TB' to 'LR' for horizontal layout
  }, [rule]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const openInNewWindow = () => {
    // Encode rule data in URL hash for the main app
    const data = {
      rule: rule,
      darkMode: darkMode
    };
    const encoded = encodeURIComponent(JSON.stringify(data));
    
    // Open main app with special canvas-only parameter
    const url = `${window.location.origin}/?canvas=true#${encoded}`;
    
    // Open in new window with specific dimensions
    window.open(
      url, 
      'RuleCanvas',
      'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
    );
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
          background: darkMode ? '#1f1f1f' : '#fafafa'
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
