import React, { useRef, useState } from 'react';
import RuleBuilder from './RuleBuilder';
import { useRuleBuilder } from './useRuleBuilder';
import { RuleBuilderUI } from './RuleBuilderUI';
import { RuleService, RuleConfigService } from '../../services';

/**
 * RuleBuilder Component - Usage Examples
 * 
 * This file demonstrates various ways to use the RuleBuilder component.
 */

// ============================================================================
// Example 1: Basic Usage
// ============================================================================
export function Example1_BasicUsage() {
  const [config, setConfig] = useState(null);

  const handleRuleChange = (ruleData) => {
    console.log('Rule changed:', ruleData);
  };

  const handleSaveSuccess = (result) => {
    console.log('Rule saved successfully:', result);
    alert(`Rule saved: ${result.ruleId} v${result.version}`);
  };

  return (
    <div>
      <h2>Example 1: Basic Usage</h2>
      <RuleBuilder
        config={config}
        darkMode={false}
        onRuleChange={handleRuleChange}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
}

// ============================================================================
// Example 2: With Ref - Accessing Methods
// ============================================================================
export function Example2_WithRef() {
  const ruleBuilderRef = useRef(null);
  const [config, setConfig] = useState(null);

  const handleGetOutput = () => {
    const output = ruleBuilderRef.current.getRuleOutput();
    console.log('Rule output:', output);
    alert(JSON.stringify(output, null, 2));
  };

  const handleLoadSampleRule = () => {
    ruleBuilderRef.current.loadRuleData({
      structure: 'condition',
      returnType: 'boolean',
      ruleType: 'Validation',
      metadata: {
        id: 'SAMPLE_RULE',
        description: 'A sample rule loaded from JSON'
      },
      definition: {
        type: 'conditionGroup',
        conjunction: 'AND',
        conditions: []
      }
    });
  };

  const handleCreateNew = () => {
    ruleBuilderRef.current.newRule({
      structure: 'expression',
      returnType: 'number'
    });
  };

  return (
    <div>
      <h2>Example 2: Using Ref Methods</h2>
      <div style={{ marginBottom: '16px' }}>
        <button onClick={handleGetOutput}>Get Rule Output</button>
        <button onClick={handleLoadSampleRule} style={{ marginLeft: '8px' }}>
          Load Sample Rule
        </button>
        <button onClick={handleCreateNew} style={{ marginLeft: '8px' }}>
          Create New Rule
        </button>
      </div>
      <RuleBuilder
        ref={ruleBuilderRef}
        config={config}
      />
    </div>
  );
}

// ============================================================================
// Example 3: Dark Mode
// ============================================================================
export function Example3_DarkMode() {
  const [darkMode, setDarkMode] = useState(true);
  const [config, setConfig] = useState(null);

  return (
    <div data-theme={darkMode ? 'dark' : 'light'} style={{
      background: darkMode ? '#141414' : '#ffffff',
      padding: '20px'
    }}>
      <h2 style={{ color: darkMode ? '#ffffff' : '#000000' }}>
        Example 3: Dark Mode
      </h2>
      <button onClick={() => setDarkMode(!darkMode)}>
        Toggle {darkMode ? 'Light' : 'Dark'} Mode
      </button>
      <RuleBuilder
        config={config}
        darkMode={darkMode}
      />
    </div>
  );
}

// ============================================================================
// Example 4: Custom Services
// ============================================================================
class MockRuleService {
  async getRuleVersions(uuid) {
    console.log('MockRuleService: getRuleVersions', uuid);
    return [1, 2, 3];
  }

  async getRuleVersion(uuid, version) {
    console.log('MockRuleService: getRuleVersion', uuid, version);
    return {
      structure: 'condition',
      returnType: 'boolean',
      uuId: uuid,
      version,
      metadata: { id: `RULE_${version}`, description: 'Mock rule' },
      definition: { type: 'conditionGroup', conditions: [] }
    };
  }

  async createRule(ruleData) {
    console.log('MockRuleService: createRule', ruleData);
    return {
      uuid: 'mock-uuid-' + Date.now(),
      version: 1,
      ruleId: ruleData.metadata.id
    };
  }

  async updateRule(uuid, ruleData) {
    console.log('MockRuleService: updateRule', uuid, ruleData);
    return {
      uuid,
      version: 2,
      ruleId: ruleData.metadata.id
    };
  }
}

class MockConfigService {
  async getConfig() {
    console.log('MockConfigService: getConfig');
    return {
      ruleTypes: ['Mock Type 1', 'Mock Type 2', 'Mock Type 3'],
      operators: [],
      functions: [],
      fields: []
    };
  }
}

export function Example4_CustomServices() {
  const [config, setConfig] = useState(null);

  return (
    <div>
      <h2>Example 4: Custom Services (Mock)</h2>
      <p>Check browser console to see mock service calls</p>
      <RuleBuilder
        config={config}
        ruleService={new MockRuleService()}
        configService={new MockConfigService()}
        onSaveSuccess={(result) => {
          console.log('Save success with mock service:', result);
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 5: Headless Usage (Hook Only)
// ============================================================================
export function Example5_HeadlessUsage() {
  const ruleService = new RuleService();
  const configService = new RuleConfigService();

  const {
    ruleData,
    ruleTypes,
    handleChange,
    handleSaveRule,
    getRuleOutput
  } = useRuleBuilder({
    ruleService,
    configService,
    onRuleChange: (data) => console.log('Rule changed:', data),
    onSaveSuccess: (result) => console.log('Saved:', result)
  });

  return (
    <div>
      <h2>Example 5: Headless Usage (Hook Only)</h2>
      <div style={{ padding: '20px', border: '1px solid #ccc' }}>
        <h3>Custom UI using useRuleBuilder hook</h3>
        <div style={{ marginBottom: '16px' }}>
          <label>
            Rule ID: 
            <input
              value={ruleData.metadata.id}
              onChange={(e) => handleChange({
                metadata: { ...ruleData.metadata, id: e.target.value }
              })}
              style={{ marginLeft: '8px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>
            Rule Type: 
            <select
              value={ruleData.ruleType}
              onChange={(e) => handleChange({ ruleType: e.target.value })}
              style={{ marginLeft: '8px' }}
            >
              {ruleTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <button onClick={handleSaveRule}>Save Rule</button>
          <button
            onClick={() => {
              const output = getRuleOutput();
              alert(JSON.stringify(output, null, 2));
            }}
            style={{ marginLeft: '8px' }}
          >
            Get Output
          </button>
        </div>
        <pre style={{ background: '#f5f5f5', padding: '12px' }}>
          {JSON.stringify(ruleData, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// Example 6: Presentation Only (UI Component Only)
// ============================================================================
export function Example6_PresentationOnly() {
  const [ruleData, setRuleData] = useState({
    structure: 'condition',
    returnType: 'boolean',
    uuId: null,
    version: 1,
    ruleType: 'Reporting',
    metadata: { id: 'CUSTOM_UI', description: 'Custom controlled UI' },
    definition: null
  });

  const [config] = useState(null);

  return (
    <div>
      <h2>Example 6: Presentation Only (Controlled UI)</h2>
      <p>Using RuleBuilderUI with custom state management</p>
      <RuleBuilderUI
        ruleData={ruleData}
        availableVersions={[]}
        loadingVersions={false}
        ruleTypes={['Custom Type 1', 'Custom Type 2']}
        isLoadedRule={false}
        config={config}
        darkMode={false}
        selectedRuleUuid={null}
        onMetadataChange={(metadata) => {
          setRuleData({ ...ruleData, metadata });
        }}
        onRuleTypeChange={(ruleType) => {
          setRuleData({ ...ruleData, ruleType });
        }}
        onVersionChange={(version) => {
          setRuleData({ ...ruleData, version });
        }}
        onReturnTypeChange={(returnType) => {
          setRuleData({ ...ruleData, returnType });
        }}
        onStructureChange={(structure) => {
          setRuleData({ ...ruleData, structure });
        }}
        onDefinitionChange={(definition) => {
          setRuleData({ ...ruleData, definition });
        }}
        onSave={() => {
          console.log('Custom save logic:', ruleData);
          alert('Custom save triggered!');
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 7: Themed Instance (Custom CSS Variables)
// ============================================================================
export function Example7_ThemedInstance() {
  const [config, setConfig] = useState(null);

  return (
    <div style={{
      '--rule-builder-card-bg': '#f0f8ff',
      '--rule-builder-card-border': '#4682b4',
      '--rule-builder-label-color': '#191970',
      '--rule-builder-save-btn-bg': '#4682b4',
      '--rule-builder-save-btn-hover-bg': '#5a9bd4'
    }}>
      <h2>Example 7: Custom Theme (CSS Variables)</h2>
      <RuleBuilder config={config} />
    </div>
  );
}

// ============================================================================
// Example 8: Multiple Builders on One Page
// ============================================================================
export function Example8_MultipleBuilders() {
  const [config, setConfig] = useState(null);

  return (
    <div>
      <h2>Example 8: Multiple Builders</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ border: '2px solid #1890ff', padding: '10px' }}>
          <h3>Builder 1: Condition Rules</h3>
          <RuleBuilder
            config={config}
            onRuleChange={(data) => console.log('Builder 1:', data.metadata.id)}
          />
        </div>
        <div style={{ border: '2px solid #52c41a', padding: '10px' }}>
          <h3>Builder 2: Expression Rules</h3>
          <RuleBuilder
            config={config}
            onRuleChange={(data) => console.log('Builder 2:', data.metadata.id)}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 9: With Version Management
// ============================================================================
export function Example9_VersionManagement() {
  const [config, setConfig] = useState(null);
  const [selectedUuid, setSelectedUuid] = useState('sample-uuid-123');

  return (
    <div>
      <h2>Example 9: Version Management</h2>
      <div style={{ marginBottom: '16px' }}>
        <label>
          Selected Rule UUID: 
          <input
            value={selectedUuid}
            onChange={(e) => setSelectedUuid(e.target.value)}
            style={{ marginLeft: '8px', width: '300px' }}
          />
        </label>
      </div>
      <RuleBuilder
        config={config}
        selectedRuleUuid={selectedUuid}
        onSaveSuccess={(result) => {
          console.log('New version created:', result.version);
          setSelectedUuid(result.uuid);
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 10: Complete Integration Example
// ============================================================================
export function Example10_CompleteIntegration() {
  const ruleBuilderRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [savedRules, setSavedRules] = useState([]);

  const handleSaveSuccess = (result) => {
    console.log('Rule saved:', result);
    
    // Add to saved rules list
    setSavedRules(prev => {
      const existing = prev.find(r => r.uuid === result.uuid);
      if (existing) {
        return prev.map(r => r.uuid === result.uuid ? result : r);
      }
      return [...prev, result];
    });
    
    setSelectedRule(result.uuid);
  };

  const handleLoadRule = (uuid) => {
    // In real app, fetch rule data from API
    console.log('Loading rule:', uuid);
    setSelectedRule(uuid);
  };

  const handleNewRule = () => {
    ruleBuilderRef.current?.newRule();
    setSelectedRule(null);
  };

  return (
    <div>
      <h2>Example 10: Complete Integration</h2>
      
      {/* Toolbar */}
      <div style={{ 
        padding: '12px', 
        background: darkMode ? '#1f1f1f' : '#f5f5f5',
        marginBottom: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <button onClick={handleNewRule}>New Rule</button>
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
        <select
          value={selectedRule || ''}
          onChange={(e) => handleLoadRule(e.target.value)}
          disabled={savedRules.length === 0}
        >
          <option value="">Select a rule...</option>
          {savedRules.map(rule => (
            <option key={rule.uuid} value={rule.uuid}>
              {rule.ruleId} v{rule.version}
            </option>
          ))}
        </select>
      </div>

      {/* Rule Builder */}
      <RuleBuilder
        ref={ruleBuilderRef}
        config={config}
        darkMode={darkMode}
        selectedRuleUuid={selectedRule}
        onRuleChange={(data) => {
          console.log('Current rule:', data.metadata.id);
        }}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
}

// ============================================================================
// Export all examples as a showcase
// ============================================================================
export function AllExamples() {
  const [activeExample, setActiveExample] = useState('1');

  const examples = [
    { id: '1', name: 'Basic Usage', component: Example1_BasicUsage },
    { id: '2', name: 'With Ref', component: Example2_WithRef },
    { id: '3', name: 'Dark Mode', component: Example3_DarkMode },
    { id: '4', name: 'Custom Services', component: Example4_CustomServices },
    { id: '5', name: 'Headless', component: Example5_HeadlessUsage },
    { id: '6', name: 'Presentation Only', component: Example6_PresentationOnly },
    { id: '7', name: 'Themed', component: Example7_ThemedInstance },
    { id: '8', name: 'Multiple Builders', component: Example8_MultipleBuilders },
    { id: '9', name: 'Version Management', component: Example9_VersionManagement },
    { id: '10', name: 'Complete Integration', component: Example10_CompleteIntegration }
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component;

  return (
    <div style={{ padding: '20px' }}>
      <h1>RuleBuilder Component - Examples</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <select 
          value={activeExample} 
          onChange={(e) => setActiveExample(e.target.value)}
          style={{ padding: '8px', fontSize: '16px' }}
        >
          {examples.map(ex => (
            <option key={ex.id} value={ex.id}>
              Example {ex.id}: {ex.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ border: '2px solid #1890ff', padding: '20px', borderRadius: '4px' }}>
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}

export default AllExamples;
