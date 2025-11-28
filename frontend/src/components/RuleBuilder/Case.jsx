import React, { useState, useEffect, useRef } from 'react';
import { Card, Space, Button, Collapse, Input, Typography, Tag, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, DownOutlined, RightOutlined, EditOutlined } from '@ant-design/icons';
import ConditionGroup from './ConditionGroup';
import Condition from './Condition';
import Expression, { createDirectExpression } from './Expression';
import ConditionSourceSelector from './ConditionSourceSelector';
import { useNaming } from './contexts/NamingContext';
import { createDefaultWhenClause } from './utils/structureFactories';

const { Text } = Typography;

/**
 * Case Component
 * 
 * Represents a CASE expression with multiple WHEN/THEN clauses and an ELSE clause.
 * Follows structure: <case>:
 *   [
 *     <when>:<conditionGroup>,
 *     <then>:<expression>
 *   ],
 *   <elseClause>:<expression>
 * 
 * Props:
 * - value: Case object { whenClauses: [{ when, then, resultName }], elseClause, elseResultName }
 * - onChange: Callback when case changes
 * - config: Config with operators, fields, functions
 * - darkMode: Dark mode styling
 * - expansionPath: Path identifier for expansion state
 * - isExpanded: Function (path) => boolean to check expansion state
 * - onToggleExpansion: Function (path) => void to toggle expansion
 * - isNew: Boolean indicating if this is a newly created case (auto-expand) or loaded (selective expand)
 */
const Case = ({ 
  value, 
  onChange, 
  config, 
  darkMode = false, 
  expansionPath = 'case',
  isExpanded = () => true,
  onToggleExpansion = () => {},
  onSetExpansion,
  isNew = true
}) => {
  const naming = useNaming();
  
  const [caseData, setCaseData] = useState(value || {
    whenClauses: [],
    elseClause: createDirectExpression('value', 'number', 0),
    elseResultName: 'Default'
  });
  const [editingElseResultName, setEditingElseResultName] = useState(false);
  const [editingStates, setEditingStates] = useState({}); // Track editing state for each clause
  
  // Use centralized expansion state
  const elseExpansionPath = `${expansionPath}-else`;
  const elseExpanded = isExpanded(elseExpansionPath);

  useEffect(() => {
    if (value) {
      setCaseData(value);
    }
  }, [value]);

  const handleChange = (updates) => {
    const updated = { ...caseData, ...updates };
    setCaseData(updated);
    
    // Remove UI-only properties recursively before passing to parent
    const cleanData = removeUIProperties(updated);
    
    // Pass the cleaned data to parent component
    onChange(cleanData);
  };

  // Helper function to recursively remove UI-only properties
  const removeUIProperties = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(removeUIProperties);
    }

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip UI-only properties
      if (key.startsWith('editing') || 
          key === 'elseExpanded' || 
          key.includes('Expanded') ||
          key.includes('editing')) {
        continue;
      }
      
      // Recursively clean nested objects
      if (value && typeof value === 'object') {
        cleaned[key] = removeUIProperties(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  const addWhenClause = () => {
    const whenClauses = caseData.whenClauses || [];
    const newIndex = whenClauses.length;
    
    // Get names from naming context
    const conditionName = naming.getNameForNew('condition', expansionPath, whenClauses.map(wc => wc.when));
    const resultName = naming.getResultName(newIndex);
    
    // Get returnType from existing clauses or default to 'number'
    const returnType = caseData.elseClause?.returnType || 'number';
    
    // Create WHEN clause using factory
    const newWhen = createDefaultWhenClause(config, conditionName, resultName, returnType);
    
    handleChange({ whenClauses: [...whenClauses, newWhen] });
    
    // Auto-expand the new WHEN clause
    if (onSetExpansion) {
      const newWhenPath = `${expansionPath}-when-${newIndex}`;
      onSetExpansion(newWhenPath, true);
    }
  };

  const removeWhenClause = (index) => {
    const updatedClauses = caseData.whenClauses.filter((_, i) => i !== index);
    handleChange({ whenClauses: updatedClauses });
  };

  const updateWhenClause = (index, updates) => {
    const updatedClauses = [...caseData.whenClauses];
    updatedClauses[index] = { ...updatedClauses[index], ...updates };
    handleChange({ whenClauses: updatedClauses });
  };

  // Helper to determine source type from when clause structure
  const getWhenSourceType = (whenClause) => {
    if (!whenClause) return 'condition';
    if (whenClause.ruleRef) return 'ruleRef';
    if (whenClause.type === 'condition') return 'condition';
    if (whenClause.type === 'conditionGroup') return 'conditionGroup';
    return 'condition';
  };

  // Handler for when source type changes
  const handleWhenSourceChange = (index, newSourceType) => {
    const currentWhen = caseData.whenClauses[index]?.when;
    const whenPath = `${expansionPath}-when-${index}`;
    const oldSourceType = getWhenSourceType(currentWhen);
    
    if (newSourceType === 'ruleRef') {
      // Switching to ruleRef - preserve name until rule selected
      const newName = naming.updateName(
        currentWhen?.name,
        oldSourceType,
        'ruleRef',
        whenPath,
        null // No rule ID yet
      );
      
      const newWhen = {
        type: 'conditionGroup',
        returnType: 'boolean',
        name: newName,
        ruleRef: {
          id: null,
          uuid: null,
          version: 1,
          returnType: 'boolean'
        }
      };
      updateWhenClause(index, { when: newWhen });
    } else if (newSourceType === 'condition') {
      // Switching to single condition
      if (currentWhen?.type === 'conditionGroup' && currentWhen.conditions?.length > 0) {
        // Extract first condition from group
        const firstCondition = currentWhen.conditions[0];
        
        // Update name appropriately
        const newName = naming.updateName(
          currentWhen.name,
          oldSourceType,
          'condition',
          whenPath
        );
        
        const updated = {
          ...firstCondition,
          name: newName
        };
        updateWhenClause(index, { when: updated });
      } else {
        // Create new empty condition
        const newName = naming.updateName(
          currentWhen?.name,
          oldSourceType,
          'condition',
          whenPath
        );
        
        const newWhen = {
          type: 'condition',
          returnType: 'boolean',
          name: newName,
          left: createDirectExpression('field', 'number', 'TABLE1.NUMBER_FIELD_01'),
          operator: config?.types?.number?.defaultConditionOperator || 'equal',
          right: createDirectExpression('value', 'number', 0)
        };
        updateWhenClause(index, { when: newWhen });
      }
    } else {
      // Switching to conditionGroup - wrap existing or create new
      const defaultOperator = config?.types?.number?.defaultConditionOperator || 'equal';
      
      // Update group name
      const groupName = naming.updateName(
        currentWhen?.name,
        oldSourceType,
        'conditionGroup',
        whenPath
      );
      
      if (currentWhen?.type === 'condition') {
        // Wrap existing condition in a group
        // Get names for children using naming context
        const child1Name = naming.getNameForNew('condition', whenPath, []);
        const child2Name = naming.getNameForNew('condition', whenPath, [{ name: child1Name }]);
        
        const wrappedCondition = {
          ...currentWhen,
          name: child1Name
        };
        
        const newCondition = {
          type: 'condition',
          returnType: 'boolean',
          name: child2Name,
          left: createDirectExpression('field', 'number', 'TABLE1.NUMBER_FIELD_01'),
          operator: defaultOperator,
          right: createDirectExpression('value', 'number', 0)
        };
        
        const newWhen = {
          type: 'conditionGroup',
          returnType: 'boolean',
          name: groupName,
          conjunction: 'AND',
          not: false,
          conditions: [wrappedCondition, newCondition]
        };
        updateWhenClause(index, { when: newWhen });
        
        // Auto-expand conditions in the new group
        if (onSetExpansion) {
          onSetExpansion(`${whenPath}-condition-0`, true);
          onSetExpansion(`${whenPath}-condition-1`, true);
        }
      } else {
        // Create new condition group
        const child1Name = naming.getNameForNew('condition', whenPath, []);
        
        const newWhen = {
          type: 'conditionGroup',
          returnType: 'boolean',
          name: groupName,
          conjunction: 'AND',
          not: false,
          conditions: [
            {
              type: 'condition',
              returnType: 'boolean',
              name: child1Name,
              left: createDirectExpression('field', 'number', 'TABLE1.NUMBER_FIELD_01'),
              operator: defaultOperator,
              right: createDirectExpression('value', 'number', 0)
            }
          ]
        };
        updateWhenClause(index, { when: newWhen });
      }
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* WHEN Clauses */}
        <Collapse 
          activeKey={caseData.whenClauses.map((_, index) => {
            const whenPath = `${expansionPath}-when-${index}-clause`;
            return isExpanded(whenPath) ? String(index) : null;
          }).filter(Boolean)}
          onChange={(keys) => {
            caseData.whenClauses.forEach((_, index) => {
              const whenPath = `${expansionPath}-when-${index}-clause`;
              const shouldBeExpanded = keys.includes(String(index));
              const currentlyExpanded = isExpanded(whenPath);
              if (shouldBeExpanded !== currentlyExpanded) {
                onToggleExpansion(whenPath);
              }
            });
          }}
          style={{ marginBottom: '16px' }}
          items={caseData.whenClauses.map((clause, index) => {
            const whenPath = `${expansionPath}-when-${index}-clause`;
            const whenExpanded = isExpanded(whenPath);
            
            return {
              key: String(index),
              label: (
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Text strong>WHEN</Text>
                    <ConditionSourceSelector
                      value={getWhenSourceType(clause.when)}
                      onChange={(newType) => handleWhenSourceChange(index, newType)}
                    />
                    {editingStates[`${index}_name`] ? (
                      <Input
                        size="small"
                        value={clause.when?.name || `Condition ${index + 1}`}
                        onChange={(e) => updateWhenClause(index, { when: { ...clause.when, name: e.target.value } })}
                        onPressEnter={() => setEditingStates(prev => ({ ...prev, [`${index}_name`]: false }))}
                        onBlur={() => setEditingStates(prev => ({ ...prev, [`${index}_name`]: false }))}
                        autoFocus
                        style={{ width: '200px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <Text code>{clause.when?.name || `Condition ${index + 1}`}</Text>
                        <EditOutlined 
                          style={{ fontSize: '12px', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStates(prev => ({ ...prev, [`${index}_name`]: true }));
                          }}
                        />
                      </>
                    )}
                    {!whenExpanded && (
                      <>
                        <Text strong style={{ marginLeft: '16px' }}>THEN</Text>
                        {editingStates[`${index}_result`] ? (
                          <Input
                            size="small"
                            value={clause.resultName || `Result ${index + 1}`}
                            onChange={(e) => updateWhenClause(index, { resultName: e.target.value })}
                            onPressEnter={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                            onBlur={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                            autoFocus
                            style={{ width: '150px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <Text code>{clause.resultName || `Result ${index + 1}`}</Text>
                            <EditOutlined 
                              style={{ fontSize: '12px', cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStates(prev => ({ ...prev, [`${index}_result`]: true }));
                              }}
                            />
                          </>
                        )}
                      </>
                    )}
                  </Space>
                </Space>
              ),
              extra: (
                <DeleteOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWhenClause(index);
                  }}
                  style={{ color: 'red' }}
                />
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {/* Condition or Condition Group */}
                  <div>
                    <Condition
                      value={clause.when}
                      onChange={(newWhen) => updateWhenClause(index, { when: newWhen })}
                      config={config}
                      darkMode={darkMode}
                      compact={true}
                      expansionPath={`${expansionPath}-when-${index}`}
                      isExpanded={isExpanded}
                      onToggleExpansion={onToggleExpansion}
                      onSetExpansion={onSetExpansion}
                      isNew={isNew}
                    />
                  </div>

                  {/* THEN Result */}
                  <div>
                    <Space style={{ marginBottom: '8px' }}>
                      <Text strong>THEN</Text>
                      {editingStates[`${index}_result`] ? (
                        <Input
                          size="small"
                          value={clause.resultName || `Result ${index + 1}`}
                          onChange={(e) => updateWhenClause(index, { resultName: e.target.value })}
                          onPressEnter={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                          onBlur={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                          autoFocus
                          style={{ width: '150px' }}
                        />
                      ) : (
                        <>
                          <Text code>{clause.resultName || `Result ${index + 1}`}</Text>
                          <EditOutlined 
                            style={{ fontSize: '12px', cursor: 'pointer' }}
                            onClick={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: true }))}
                          />
                        </>
                      )}
                      <Text strong>:</Text>
                    </Space>
                    <Expression
                      value={clause.then}
                      onChange={(newThen) => updateWhenClause(index, { then: newThen })}
                      config={config}
                      darkMode={darkMode}
                      expansionPath={`${expansionPath}-when-${index}-then`}
                      isExpanded={isExpanded}
                      onToggleExpansion={onToggleExpansion}
                      onSetExpansion={onSetExpansion}
                      isNew={isNew}
                    />
                  </div>
                </Space>
              )
            };
          })}
        />

        {/* Add WHEN Button */}
        <Button 
          data-testid="add-when-clause-button"
          type="dashed" 
          onClick={addWhenClause} 
          icon={<PlusOutlined />}
          block
        >
          Add WHEN Clause
        </Button>

        {/* ELSE Clause */}
        <Collapse 
          activeKey={elseExpanded ? ['else'] : []} 
          onChange={() => onToggleExpansion(elseExpansionPath)}
          items={[{
            key: 'else',
            label: (
              <Space>
                <Text strong>ELSE</Text>
                {editingElseResultName ? (
                  <Input
                    size="small"
                    value={caseData.elseResultName || 'Default'}
                    onChange={(e) => handleChange({ elseResultName: e.target.value })}
                    onPressEnter={() => setEditingElseResultName(false)}
                    onBlur={() => setEditingElseResultName(false)}
                    autoFocus
                    style={{ width: '150px' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <Text code>{caseData.elseResultName || 'Default'}</Text>
                    <EditOutlined 
                      style={{ fontSize: '12px', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingElseResultName(true);
                      }}
                    />
                  </>
                )}
              </Space>
            ),
            children: (
              <Expression
                value={caseData.elseClause}
                onChange={(newElse) => handleChange({ elseClause: newElse })}
                config={config}
                darkMode={darkMode}
                expansionPath={`${expansionPath}-else-expression`}
                isExpanded={isExpanded}
                onToggleExpansion={onToggleExpansion}
                onSetExpansion={onSetExpansion}
                isNew={isNew}
              />
            )
          }]}
        />
      </Space>
  );
};

export default Case;
