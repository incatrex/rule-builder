import { message } from 'antd';
import { useCallback } from 'react';
import { useRuleHistory } from './useRuleHistory';
import { RuleHistoryUI } from './RuleHistoryUI';

/**
 * RuleHistory Component - Main component combining logic and UI
 * 
 * This component manages rule version history with full dependency injection.
 * It can be used standalone with custom callbacks or with the default RuleService.
 * 
 * @param {Object} props - Component props
 * 
 * @param {string} props.selectedRuleUuid - Currently selected rule UUID
 * 
 * @param {Function} props.onFetchHistory - Callback to fetch history
 *   Signature: (uuid: string) => Promise<Array<HistoryRecord>>
 *   HistoryRecord: { ruleId, version, modifiedBy, modifiedOn }
 * 
 * @param {Function} props.onRestoreVersion - Callback to restore a version
 *   Signature: (uuid: string, version: number) => Promise<void>
 * 
 * @param {Function} props.onViewVersion - Callback when user clicks "View"
 *   Signature: (uuid: string, version: number) => void
 * 
 * @param {Function} props.onRestoreComplete - Callback after successful restore
 *   Signature: () => void
 * 
 * @param {Function} props.onError - Custom error handler
 *   Signature: (error: Error) => void
 * 
 * @param {boolean} props.showNotifications - Show success/error messages (default: true)
 * 
 * @param {Object} props.theme - Theme customization
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.classNames - Override specific part classes
 * @param {Object} props.sx - Style object
 * @param {boolean} props.unstyled - Disable default styles
 * @param {boolean} props.darkMode - Enable dark mode (legacy support)
 * 
 * @param {Object} props.messages - Customizable UI messages
 * @param {boolean} props.showRuleId - Show Rule ID column (default: true)
 * @param {number} props.pageSize - Items per page (default: null for no pagination)
 * @param {number} props.scrollY - Table scroll height (default: 150)
 * 
 * @example
 * // Basic usage with callbacks
 * <RuleHistory
 *   selectedRuleUuid="abc-123"
 *   onFetchHistory={async (uuid) => {
 *     const response = await fetch(`/api/rules/${uuid}/history`);
 *     return response.json();
 *   }}
 *   onRestoreVersion={async (uuid, version) => {
 *     await fetch(`/api/rules/${uuid}/restore/${version}`, { method: 'POST' });
 *   }}
 *   onViewVersion={(uuid, version) => {
 *     console.log('View version:', uuid, version);
 *   }}
 * />
 * 
 * @example
 * // With custom styling
 * <RuleHistory
 *   selectedRuleUuid="abc-123"
 *   onFetchHistory={fetchHistory}
 *   onRestoreVersion={restoreVersion}
 *   theme={{
 *     background: '#f5f5f5',
 *     textColor: '#333',
 *     primaryColor: '#007bff',
 *   }}
 *   classNames={{
 *     root: 'my-custom-history',
 *     title: 'my-custom-title',
 *   }}
 * />
 * 
 * @example
 * // Headless usage with custom UI
 * const { history, loading, restoreVersion } = useRuleHistory({
 *   selectedRuleUuid,
 *   onFetchHistory,
 *   onRestoreVersion,
 * });
 * // Build your own UI with the hook data
 */
export const RuleHistory = ({
  selectedRuleUuid,
  onFetchHistory,
  onRestoreVersion,
  onViewVersion,
  onRestoreComplete,
  onError,
  showNotifications = true,
  
  // Styling props
  theme,
  className,
  classNames,
  sx,
  unstyled,
  darkMode, // Legacy support
  
  // UI customization
  messages,
  showRuleId,
  pageSize,
  scrollY,
}) => {
  // Handle errors with notifications if enabled
  const handleError = useCallback((error) => {
    if (showNotifications) {
      message.error(error.message || 'An error occurred');
    }
    if (onError) {
      onError(error);
    }
  }, [showNotifications, onError]);

  // Use the logic hook
  const {
    history,
    loading,
    restoreVersion,
    hasRuleSelected,
  } = useRuleHistory({
    selectedRuleUuid,
    onFetchHistory,
    onRestoreVersion,
    onError: handleError,
  });

  // Handle view action
  const handleView = useCallback((record) => {
    if (onViewVersion) {
      onViewVersion(selectedRuleUuid, record.version);
    }
  }, [onViewVersion, selectedRuleUuid]);

  // Handle restore with notification
  const handleRestore = useCallback(async (record) => {
    try {
      await restoreVersion(record.version);
      
      if (showNotifications) {
        message.success(
          messages?.restoreSuccess?.(record.version) || 
          `Version ${record.version} restored successfully`
        );
      }
      
      if (onRestoreComplete) {
        onRestoreComplete();
      }
    } catch (error) {
      // Error already handled by useRuleHistory hook
      throw error;
    }
  }, [restoreVersion, showNotifications, messages, onRestoreComplete]);

  // Support legacy darkMode prop by converting to theme
  const effectiveTheme = theme || (darkMode ? {
    background: '#1f1f1f',
    textColor: '#ffffff',
    textSecondary: '#999999',
    borderColor: '#434343',
  } : undefined);

  return (
    <RuleHistoryUI
      history={history}
      loading={loading}
      onView={handleView}
      onRestore={handleRestore}
      hasRuleSelected={hasRuleSelected}
      theme={effectiveTheme}
      className={className}
      classNames={classNames}
      sx={sx}
      unstyled={unstyled}
      messages={messages}
      showRuleId={showRuleId}
      pageSize={pageSize}
      scrollY={scrollY}
    />
  );
};

export default RuleHistory;
