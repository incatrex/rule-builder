import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for RuleHistory logic
 * Manages state and business logic without UI dependencies
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.selectedRuleUuid - Currently selected rule UUID
 * @param {Function} options.onFetchHistory - Callback to fetch history: (uuid) => Promise<Array>
 * @param {Function} options.onRestoreVersion - Callback to restore version: (uuid, version) => Promise<void>
 * @param {Function} options.onError - Optional error handler
 * @returns {Object} State and methods for managing rule history
 */
export const useRuleHistory = ({
  selectedRuleUuid,
  onFetchHistory,
  onRestoreVersion,
  onError,
}) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stable error handler
  const handleError = useCallback((err) => {
    if (onError) {
      onError(err);
    } else {
      console.error(err);
    }
  }, [onError]);

  const fetchHistory = useCallback(async () => {
    console.log('[useRuleHistory] fetchHistory called for UUID:', selectedRuleUuid);
    
    if (!onFetchHistory) {
      console.error('[useRuleHistory] No onFetchHistory callback provided!');
      setError(new Error('onFetchHistory callback is required'));
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[useRuleHistory] Calling onFetchHistory...');
      const historyData = await onFetchHistory(selectedRuleUuid);
      console.log('[useRuleHistory] Received history data:', historyData);
      setHistory(historyData || []);
    } catch (err) {
      console.error('[useRuleHistory] Error loading rule history:', err);
      setError(err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [selectedRuleUuid, onFetchHistory, handleError]);

  useEffect(() => {
    console.log('[useRuleHistory] useEffect triggered:', { selectedRuleUuid, hasCallback: !!onFetchHistory });
    if (selectedRuleUuid) {
      console.log('[useRuleHistory] Calling fetchHistory for UUID:', selectedRuleUuid);
      fetchHistory();
    } else {
      console.log('[useRuleHistory] No UUID selected, clearing history');
      setHistory([]);
      setError(null);
    }
  }, [selectedRuleUuid, fetchHistory]);

  const restoreVersion = async (version) => {
    if (!onRestoreVersion) {
      const err = new Error('onRestoreVersion callback is required');
      setError(err);
      handleError(err);
      return Promise.reject(err);
    }

    try {
      await onRestoreVersion(selectedRuleUuid, version);
      await fetchHistory(); // Refresh history after restore
      return true;
    } catch (err) {
      console.error('Error restoring version:', err);
      setError(err);
      handleError(err);
      throw err;
    }
  };

  return {
    history,
    loading,
    error,
    fetchHistory,
    restoreVersion,
    hasRuleSelected: !!selectedRuleUuid,
  };
};
