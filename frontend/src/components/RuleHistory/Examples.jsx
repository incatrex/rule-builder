/**
 * RuleHistory Component Usage Examples
 * 
 * This file demonstrates various ways to use the refactored RuleHistory component
 */

import React from 'react';
import { RuleHistory, useRuleHistory, RuleHistoryUI } from '../components/RuleHistory';
import { RuleService } from '../services/RuleService';

// ============================================================================
// Example 1: Basic Usage (Most Common)
// ============================================================================

export function BasicExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('abc-123');
  const ruleService = new RuleService();

  return (
    <RuleHistory
      selectedRuleUuid={selectedUuid}
      onFetchHistory={(uuid) => ruleService.getRuleVersions(uuid)}
      onRestoreVersion={(uuid, version) => ruleService.restoreRuleVersion(uuid, version)}
      onViewVersion={(uuid, version) => {
        console.log('View version:', uuid, version);
      }}
    />
  );
}

// ============================================================================
// Example 2: With Custom Theming
// ============================================================================

export function ThemedExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('abc-123');
  const ruleService = new RuleService();

  return (
    <RuleHistory
      selectedRuleUuid={selectedUuid}
      onFetchHistory={(uuid) => ruleService.getRuleVersions(uuid)}
      onRestoreVersion={(uuid, version) => ruleService.restoreRuleVersion(uuid, version)}
      theme={{
        background: '#f5f5f5',
        textColor: '#333333',
        primaryColor: '#007bff',
        spacing: '16px',
        fontSize: '14px',
      }}
    />
  );
}

// ============================================================================
// Example 3: With Custom CSS Classes (Tailwind)
// ============================================================================

export function TailwindExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('abc-123');
  const ruleService = new RuleService();

  return (
    <RuleHistory
      selectedRuleUuid={selectedUuid}
      onFetchHistory={(uuid) => ruleService.getRuleVersions(uuid)}
      onRestoreVersion={(uuid, version) => ruleService.restoreRuleVersion(uuid, version)}
      unstyled
      className="bg-white rounded-lg shadow-lg"
      classNames={{
        title: 'text-xl font-bold text-gray-800 mb-4',
        viewButton: 'bg-blue-500 hover:bg-blue-700 text-white px-3 py-1 rounded',
        restoreButton: 'bg-green-500 hover:bg-green-700 text-white px-3 py-1 rounded',
      }}
    />
  );
}

// ============================================================================
// Example 4: With Custom Messages
// ============================================================================

export function CustomMessagesExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('abc-123');
  const ruleService = new RuleService();

  return (
    <RuleHistory
      selectedRuleUuid={selectedUuid}
      onFetchHistory={(uuid) => ruleService.getRuleVersions(uuid)}
      onRestoreVersion={(uuid, version) => ruleService.restoreRuleVersion(uuid, version)}
      messages={{
        noRuleSelected: '👈 Please select a rule from the list',
        title: '📜 Version History',
        confirmTitle: '⚠️ Confirm Restoration',
        confirmRestore: (ruleId, version) => 
          `Are you absolutely sure you want to restore "${ruleId}" to version ${version}?`,
        restoreSuccess: (version) => `✅ Successfully restored to version ${version}!`,
        restoreError: '❌ Failed to restore version. Please try again.',
        okText: 'Yes, Restore It',
        cancelText: 'No, Keep Current',
      }}
    />
  );
}

// ============================================================================
// Example 5: Headless Usage with Custom UI
// ============================================================================

export function HeadlessExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('abc-123');
  const ruleService = new RuleService();

  const {
    history,
    loading,
    error,
    restoreVersion,
    hasRuleSelected,
  } = useRuleHistory({
    selectedRuleUuid: selectedUuid,
    onFetchHistory: (uuid) => ruleService.getRuleVersions(uuid),
    onRestoreVersion: (uuid, version) => ruleService.restoreRuleVersion(uuid, version),
  });

  if (!hasRuleSelected) {
    return <div className="text-center p-4">No rule selected</div>;
  }

  if (loading) {
    return <div className="text-center p-4">Loading history...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">Error: {error.message}</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold">Custom History View</h3>
      {history.map((record) => (
        <div 
          key={record.version}
          className="border rounded p-3 flex justify-between items-center"
        >
          <div>
            <div className="font-semibold">Version {record.version}</div>
            <div className="text-sm text-gray-600">
              {record.modifiedBy} • {new Date(record.modifiedOn).toLocaleDateString()}
            </div>
          </div>
          <div className="space-x-2">
            <button 
              className="px-3 py-1 bg-blue-500 text-white rounded"
              onClick={() => console.log('View', record.version)}
            >
              View
            </button>
            <button 
              className="px-3 py-1 bg-green-500 text-white rounded"
              onClick={() => restoreVersion(record.version)}
            >
              Restore
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 6: With Material-UI Styling
// ============================================================================

export function MaterialUIExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('abc-123');
  const ruleService = new RuleService();

  // Assuming you have Material-UI theme available
  const muiTheme = {
    background: '#ffffff',
    textColor: '#212121',
    primaryColor: '#1976d2',
    fontFamily: 'Roboto, sans-serif',
  };

  return (
    <div style={{ padding: '16px' }}>
      <RuleHistory
        selectedRuleUuid={selectedUuid}
        onFetchHistory={(uuid) => ruleService.getRuleVersions(uuid)}
        onRestoreVersion={(uuid, version) => ruleService.restoreRuleVersion(uuid, version)}
        theme={muiTheme}
        sx={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: '4px',
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 7: With Custom Error Handling
// ============================================================================

export function CustomErrorHandlingExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('abc-123');
  const [errorLog, setErrorLog] = React.useState([]);
  const ruleService = new RuleService();

  const handleError = (error) => {
    // Custom error logging/tracking
    console.error('[Custom Error Handler]', error);
    setErrorLog(prev => [...prev, {
      timestamp: new Date(),
      message: error.message,
    }]);
    
    // Could also send to error tracking service
    // Sentry.captureException(error);
  };

  return (
    <div>
      <RuleHistory
        selectedRuleUuid={selectedUuid}
        onFetchHistory={(uuid) => ruleService.getRuleVersions(uuid)}
        onRestoreVersion={(uuid, version) => ruleService.restoreRuleVersion(uuid, version)}
        onError={handleError}
        showNotifications={false} // Disable default notifications
      />
      
      {errorLog.length > 0 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
          <h4 className="font-bold">Error Log:</h4>
          <ul>
            {errorLog.map((log, i) => (
              <li key={i} className="text-sm">
                {log.timestamp.toLocaleTimeString()}: {log.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 8: With Different API Endpoints
// ============================================================================

export function CustomAPIExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('abc-123');

  // Using completely different API structure
  const fetchHistory = async (uuid) => {
    const response = await fetch(`https://my-api.com/rules/${uuid}/versions`);
    const data = await response.json();
    
    // Transform API response to expected format
    return data.versions.map(v => ({
      ruleId: data.ruleId,
      version: v.versionNumber,
      modifiedBy: v.author,
      modifiedOn: v.createdAt,
    }));
  };

  const restoreVersion = async (uuid, version) => {
    await fetch(`https://my-api.com/rules/${uuid}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetVersion: version }),
    });
  };

  return (
    <RuleHistory
      selectedRuleUuid={selectedUuid}
      onFetchHistory={fetchHistory}
      onRestoreVersion={restoreVersion}
    />
  );
}

// ============================================================================
// Example 9: Presentation Component Only
// ============================================================================

export function PresentationOnlyExample() {
  const mockHistory = [
    { ruleId: 'RULE_001', version: 3, modifiedBy: 'john.doe', modifiedOn: '2025-11-17T10:00:00Z' },
    { ruleId: 'RULE_001', version: 2, modifiedBy: 'jane.smith', modifiedOn: '2025-11-16T15:30:00Z' },
    { ruleId: 'RULE_001', version: 1, modifiedBy: 'john.doe', modifiedOn: '2025-11-15T09:00:00Z' },
  ];

  return (
    <RuleHistoryUI
      history={mockHistory}
      loading={false}
      hasRuleSelected={true}
      onView={(record) => console.log('View:', record)}
      onRestore={(record) => console.log('Restore:', record)}
    />
  );
}

// ============================================================================
// Example 10: Testing / Storybook Usage
// ============================================================================

export function TestingExample() {
  const [selectedUuid, setSelectedUuid] = React.useState('test-uuid');

  // Mock functions for testing
  const mockFetchHistory = async (uuid) => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    return [
      { ruleId: 'TEST_RULE', version: 2, modifiedBy: 'test-user', modifiedOn: new Date().toISOString() },
      { ruleId: 'TEST_RULE', version: 1, modifiedBy: 'test-user', modifiedOn: new Date().toISOString() },
    ];
  };

  const mockRestoreVersion = async (uuid, version) => {
    console.log(`Mock restore: ${uuid} to version ${version}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <RuleHistory
      selectedRuleUuid={selectedUuid}
      onFetchHistory={mockFetchHistory}
      onRestoreVersion={mockRestoreVersion}
      onViewVersion={(uuid, version) => {
        console.log(`Mock view: ${uuid} version ${version}`);
      }}
    />
  );
}
