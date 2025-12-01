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
 * Get the display name for a THEN result
 * Priority: custom resultName > rule ID (if rule selected) > default
 * This allows users to override the rule ID with a custom name
 */
const getThenResultDisplayName = (clause, defaultName) => {
  // If there's a custom result name, use it
  if (clause?.resultName) {
    return clause.resultName;
  }
  // If expression is a rule reference and no custom name, use the rule ID
  if (clause?.then?.type === 'ruleRef' && clause?.then?.id) {
    return clause.then.id;
  }
  // Otherwise use default
  return defaultName;
};

/**
 * Get the display name for an ELSE result
 * Priority: custom elseResultName > rule ID (if rule selected) > default
 * This allows users to override the rule ID with a custom name
 */
const getElseResultDisplayName = (caseData, defaultName) => {
  // If there's a custom result name, use it
  if (caseData?.elseResultName) {
    return caseData.elseResultName;
  }
  // If expression is a rule reference and no custom name, use the rule ID
  if (caseData?.elseClause?.type === 'ruleRef' && caseData?.elseClause?.id) {
    return caseData.elseClause.id;
  }
  // Otherwise use default
  return defaultName;
};

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
    elseClause: createDirectExpression('value', 'number', 0)
    // Don't set elseResultName - let it derive from rule ID or display as "Default"
  });
  const [editingElseResultName, setEditingElseResultName] = useState(false);
  const [editingStates, setEditingStates] = useState({}); // Track editing state for each clause
  const [userModifiedNames, setUserModifiedNames] = useState({}); // Track which names user explicitly modified
  
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
    
    // Get returnType from existing clauses or default to 'number'
    const returnType = caseData.elseClause?.returnType || 'number';
    
    // Create WHEN clause using factory (no resultName - will derive from rule ID or use default)
    const newWhen = createDefaultWhenClause(config, conditionName, null, returnType);
    
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

  // Handler for THEN expression changes - auto-populate resultName from rule ID
  // Behaves like WHEN clause: always updates to new rule ID, preserves custom names set after rule selection
  const handleThenExpressionChange = (index, newThen) => {
    const clause = caseData.whenClauses[index];
    const updates = { then: newThen };
    const userModifiedKey = `then_${index}`;
    
    console.log('[Case] THEN expression changed:', {
      index,
      newThenType: newThen?.type,
      newThenId: newThen?.id,
      currentResultName: clause?.resultName,
      userModifiedKey,
      isUserModified: userModifiedNames[userModifiedKey],
      allUserModifiedNames: userModifiedNames
    });
    
    // If expression is now a rule with an ID
    if (newThen?.type === 'ruleRef' && newThen?.id) {
      // ALWAYS set resultName to the rule ID when a rule is selected
      console.log('[Case] Setting resultName to rule ID:', newThen.id);
      updates.resultName = newThen.id;
      // Clear the user-modified flag since rule selection resets the name
      setUserModifiedNames(prev => {
        const updated = { ...prev };
        delete updated[userModifiedKey];
        return updated;
      });
    }
    // If expression changed away from rule, clear the resultName
    else if (newThen?.type !== 'ruleRef') {
      console.log('[Case] Clearing resultName (not a rule)');
      updates.resultName = undefined;
      // Also clear the user-modified flag
      setUserModifiedNames(prev => {
        const updated = { ...prev };
        delete updated[userModifiedKey];
        return updated;
      });
    }
    
    updateWhenClause(index, updates);
  };

  // Handler for ELSE expression changes - auto-populate elseResultName from rule ID
  const handleElseExpressionChange = (newElse) => {
    const updates = { elseClause: newElse };
    
    console.log('[Case] ELSE expression changed:', {
      newElseType: newElse?.type,
      newElseId: newElse?.id,
      currentElseResultName: caseData?.elseResultName,
      isUserModified: userModifiedNames.else,
      allUserModifiedNames: userModifiedNames
    });
    
    // If expression is now a rule with an ID
    if (newElse?.type === 'ruleRef' && newElse?.id) {
      // ALWAYS set elseResultName to the rule ID when a rule is selected
      console.log('[Case] Setting elseResultName to rule ID:', newElse.id);
      updates.elseResultName = newElse.id;
      // Clear the user-modified flag since rule selection resets the name
      setUserModifiedNames(prev => {
        const updated = { ...prev };
        delete updated.else;
        return updated;
      });
    }
    // If expression changed away from rule, clear the elseResultName
    else if (newElse?.type !== 'ruleRef') {
      console.log('[Case] Clearing elseResultName (not a rule)');
      updates.elseResultName = undefined;
      // Also clear the user-modified flag
      setUserModifiedNames(prev => {
        const updated = { ...prev };
        delete updated.else;
        return updated;
      });
    }
    
    handleChange(updates);
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
                    <Text strong data-testid={`when-header-${index}`}>WHEN</Text>
                    <ConditionSourceSelector
                      value={getWhenSourceType(clause.when)}
                      onChange={(newType) => handleWhenSourceChange(index, newType)}
                    />
                    {editingStates[`${index}_name`] ? (
                      <Input
                        data-testid="when-name-input"
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
                        <Text code data-testid={`when-clause-name-${expansionPath}-when-${index}`}>{clause.when?.name || `Condition ${index + 1}`}</Text>
                        <EditOutlined 
                          data-testid="when-edit-icon"
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
                        <Text strong style={{ marginLeft: '16px' }} data-testid={`then-header-${index}`}>THEN</Text>
                        {editingStates[`${index}_result`] ? (
                          <Input
                            data-testid="then-result-input"
                            size="small"
                            value={clause.resultName || getThenResultDisplayName(clause, `Result ${index + 1}`)}
                            onChange={(e) => {
                              updateWhenClause(index, { resultName: e.target.value });
                              setUserModifiedNames(prev => ({ ...prev, [`then_${index}`]: true }));
                            }}
                            onPressEnter={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                            onBlur={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                            autoFocus
                            style={{ width: '150px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <Text code data-testid={`then-result-name-${expansionPath}-when-${index}`}>
                              {getThenResultDisplayName(clause, `Result ${index + 1}`)}
                            </Text>
                            <EditOutlined 
                              data-testid="then-result-edit-icon"
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
                      hideHeader={true}
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
                      <Text strong data-testid={`then-header-expanded-${index}`}>THEN</Text>
                      {editingStates[`${index}_result`] ? (
                        <Input
                          data-testid="then-result-input-expanded"
                          size="small"
                          value={clause.resultName || getThenResultDisplayName(clause, `Result ${index + 1}`)}
                          onChange={(e) => {
                            updateWhenClause(index, { resultName: e.target.value });
                            setUserModifiedNames(prev => ({ ...prev, [`then_${index}`]: true }));
                          }}
                          onPressEnter={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                          onBlur={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: false }))}
                          autoFocus
                          style={{ width: '150px' }}
                        />
                      ) : (
                        <>
                          <Text code data-testid={`then-result-name-${expansionPath}-when-${index}`}>
                            {getThenResultDisplayName(clause, `Result ${index + 1}`)}
                          </Text>
                          <EditOutlined 
                            data-testid="then-result-edit-icon-expanded"
                            style={{ fontSize: '12px', cursor: 'pointer' }}
                            onClick={() => setEditingStates(prev => ({ ...prev, [`${index}_result`]: true }))}
                          />
                        </>
                      )}
                      <Text strong>:</Text>
                    </Space>
                    <Expression
                      value={clause.then}
                      onChange={(newThen) => handleThenExpressionChange(index, newThen)}
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
                <Text strong data-testid="else-header">ELSE</Text>
                {editingElseResultName ? (
                  <Input
                    data-testid="else-result-input"
                    size="small"
                    value={caseData.elseResultName || 'Default'}
                    onChange={(e) => {
                      handleChange({ elseResultName: e.target.value });
                      setUserModifiedNames(prev => ({ ...prev, else: true }));
                    }}
                    onPressEnter={() => setEditingElseResultName(false)}
                    onBlur={() => setEditingElseResultName(false)}
                    autoFocus
                    style={{ width: '150px' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <Text code data-testid="else-result-name">{getElseResultDisplayName(caseData, 'Default')}</Text>
                    <EditOutlined 
                      data-testid="else-result-edit-icon"
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
                onChange={handleElseExpressionChange}
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
