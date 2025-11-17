# RuleHistory Component

A standalone, reusable React component for displaying and managing rule version history with full dependency injection and theming support.

## Features

- ✅ **Dependency Injection**: No hardcoded service dependencies
- ✅ **Headless Hook**: Separate logic from UI for maximum flexibility
- ✅ **Full Theming**: CSS variables for easy customization
- ✅ **TypeScript Ready**: (types can be added)
- ✅ **Ant Design**: Uses Ant Design components (peer dependency)
- ✅ **Zero Backend Coupling**: Works with any API through callbacks

## Installation

```bash
# If using as standalone package
npm install @yourorg/rule-history

# Peer dependencies
npm install react react-dom antd
```

## Basic Usage

```jsx
import { RuleHistory } from './components/RuleHistory';

function MyApp() {
  const fetchHistory = async (uuid) => {
    const response = await fetch(`/api/rules/${uuid}/history`);
    return response.json();
  };

  const restoreVersion = async (uuid, version) => {
    await fetch(`/api/rules/${uuid}/restore/${version}`, {
      method: 'POST'
    });
  };

  return (
    <RuleHistory
      selectedRuleUuid="abc-123"
      onFetchHistory={fetchHistory}
      onRestoreVersion={restoreVersion}
      onViewVersion={(uuid, version) => {
        console.log('View version:', uuid, version);
      }}
    />
  );
}
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `selectedRuleUuid` | `string` | Currently selected rule UUID |
| `onFetchHistory` | `(uuid: string) => Promise<Array>` | Callback to fetch history records |
| `onRestoreVersion` | `(uuid: string, version: number) => Promise<void>` | Callback to restore a version |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onViewVersion` | `(uuid: string, version: number) => void` | - | Called when user clicks "View" |
| `onRestoreComplete` | `() => void` | - | Called after successful restore |
| `onError` | `(error: Error) => void` | - | Custom error handler |
| `showNotifications` | `boolean` | `true` | Show Ant Design messages |
| `theme` | `Object` | - | Theme customization object |
| `className` | `string` | - | Additional CSS classes |
| `classNames` | `Object` | - | Override specific part classes |
| `sx` | `Object` | - | Style object |
| `unstyled` | `boolean` | `false` | Disable default styles |
| `darkMode` | `boolean` | `false` | Enable dark mode (legacy) |
| `messages` | `Object` | - | Customize UI messages |
| `showRuleId` | `boolean` | `true` | Show Rule ID column |
| `pageSize` | `number` | `null` | Enable pagination |
| `scrollY` | `number` | `150` | Table scroll height |

## Theming

### Using CSS Variables

```jsx
<RuleHistory
  selectedRuleUuid="abc-123"
  onFetchHistory={fetchHistory}
  onRestoreVersion={restoreVersion}
  theme={{
    background: '#f5f5f5',
    textColor: '#333333',
    textSecondary: '#666666',
    borderColor: '#d9d9d9',
    primaryColor: '#007bff',
    spacing: '16px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
  }}
/>
```

### Using Custom Classes

```jsx
<RuleHistory
  selectedRuleUuid="abc-123"
  onFetchHistory={fetchHistory}
  onRestoreVersion={restoreVersion}
  classNames={{
    root: 'my-history',
    title: 'my-title',
    table: 'my-table',
    viewButton: 'my-view-btn',
    restoreButton: 'my-restore-btn',
  }}
/>
```

### Using Inline Styles

```jsx
<RuleHistory
  selectedRuleUuid="abc-123"
  onFetchHistory={fetchHistory}
  onRestoreVersion={restoreVersion}
  sx={{
    '--rh-background': '#ffffff',
    '--rh-primary-color': '#ff0000',
    padding: '20px',
  }}
/>
```

## Headless Usage

Use the `useRuleHistory` hook to build your own custom UI:

```jsx
import { useRuleHistory } from './components/RuleHistory';

function CustomHistoryUI() {
  const {
    history,
    loading,
    error,
    restoreVersion,
    hasRuleSelected,
  } = useRuleHistory({
    selectedRuleUuid: 'abc-123',
    onFetchHistory: async (uuid) => {
      const res = await fetch(`/api/rules/${uuid}/history`);
      return res.json();
    },
    onRestoreVersion: async (uuid, version) => {
      await fetch(`/api/rules/${uuid}/restore/${version}`, {
        method: 'POST'
      });
    },
  });

  if (!hasRuleSelected) {
    return <div>Select a rule</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {history.map((record) => (
        <div key={record.version}>
          <span>Version {record.version}</span>
          <button onClick={() => restoreVersion(record.version)}>
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Advanced Examples

### With Material-UI Styling

```jsx
import { Box, Typography } from '@mui/material';
import { RuleHistory } from './components/RuleHistory';

<Box sx={{ p: 2 }}>
  <RuleHistory
    selectedRuleUuid="abc-123"
    onFetchHistory={fetchHistory}
    onRestoreVersion={restoreVersion}
    theme={{
      fontFamily: 'Roboto, sans-serif',
      primaryColor: theme.palette.primary.main,
    }}
  />
</Box>
```

### With Tailwind CSS

```jsx
<RuleHistory
  selectedRuleUuid="abc-123"
  onFetchHistory={fetchHistory}
  onRestoreVersion={restoreVersion}
  unstyled
  className="bg-white rounded-lg shadow-lg p-4"
  classNames={{
    title: 'text-2xl font-bold mb-4',
    viewButton: 'bg-blue-500 hover:bg-blue-700 text-white',
    restoreButton: 'bg-green-500 hover:bg-green-700 text-white',
  }}
/>
```

### Custom Messages

```jsx
<RuleHistory
  selectedRuleUuid="abc-123"
  onFetchHistory={fetchHistory}
  onRestoreVersion={restoreVersion}
  messages={{
    noRuleSelected: 'Please select a rule from the list',
    title: 'Version Control',
    confirmTitle: 'Confirm Restoration',
    confirmRestore: (ruleId, version) => 
      `Restore ${ruleId} to version ${version}?`,
    restoreSuccess: (version) => `Successfully restored v${version}`,
    restoreError: 'Failed to restore version',
    okText: 'Yes, Restore',
    cancelText: 'No, Cancel',
  }}
/>
```

## Data Format

The `onFetchHistory` callback should return an array of history records:

```typescript
type HistoryRecord = {
  ruleId: string;
  version: number;
  modifiedBy: string;
  modifiedOn: string | Date; // Will be formatted using toLocaleString()
};
```

Example:

```javascript
const historyData = [
  {
    ruleId: 'MY_RULE_001',
    version: 3,
    modifiedBy: 'john.doe',
    modifiedOn: '2025-11-17T10:30:00Z'
  },
  {
    ruleId: 'MY_RULE_001',
    version: 2,
    modifiedBy: 'jane.smith',
    modifiedOn: '2025-11-16T15:45:00Z'
  },
  // ...
];
```

## CSS Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `--rh-background` | `#ffffff` | Background color |
| `--rh-text-color` | `#000000` | Primary text color |
| `--rh-text-secondary` | `#666666` | Secondary text color |
| `--rh-border-color` | `#d9d9d9` | Border color |
| `--rh-primary-color` | `#1890ff` | Primary/accent color |
| `--rh-spacing` | `12px` | Base spacing unit |
| `--rh-font-size` | `13px` | Base font size |
| `--rh-font-family` | `inherit` | Font family |

## License

MIT
