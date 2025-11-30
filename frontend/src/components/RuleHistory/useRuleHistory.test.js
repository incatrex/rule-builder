import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRuleHistory } from './useRuleHistory';

describe('useRuleHistory Hook', () => {
  let mockFetchHistory;
  let mockRestoreVersion;
  let mockOnError;

  beforeEach(() => {
    mockFetchHistory = vi.fn();
    mockRestoreVersion = vi.fn();
    mockOnError = vi.fn();
  });

  it('should initialize with empty history when no UUID selected', () => {
    const { result } = renderHook(() => useRuleHistory({
      selectedRuleUuid: null,
      onFetchHistory: mockFetchHistory,
      onRestoreVersion: mockRestoreVersion,
    }));

    expect(result.current.history).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasRuleSelected).toBe(false);
    expect(mockFetchHistory).not.toHaveBeenCalled();
  });

  it('should fetch history when UUID is provided', async () => {
    const mockHistory = [
      { ruleId: 'TEST_001', version: 2, modifiedBy: 'user1', modifiedOn: '2025-11-17' },
      { ruleId: 'TEST_001', version: 1, modifiedBy: 'user2', modifiedOn: '2025-11-16' },
    ];
    
    mockFetchHistory.mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useRuleHistory({
      selectedRuleUuid: 'abc-123',
      onFetchHistory: mockFetchHistory,
      onRestoreVersion: mockRestoreVersion,
    }));

    expect(result.current.loading).toBe(true);
    expect(result.current.hasRuleSelected).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchHistory).toHaveBeenCalledWith('abc-123');
    expect(result.current.history).toEqual(mockHistory);
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = new Error('Failed to fetch');
    mockFetchHistory.mockRejectedValue(mockError);

    const { result } = renderHook(() => useRuleHistory({
      selectedRuleUuid: 'abc-123',
      onFetchHistory: mockFetchHistory,
      onRestoreVersion: mockRestoreVersion,
      onError: mockOnError,
    }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(mockError);
    expect(mockOnError).toHaveBeenCalledWith(mockError);
  });

  it('should restore version and refresh history', async () => {
    const mockHistory = [
      { ruleId: 'TEST_001', version: 2, modifiedBy: 'user1', modifiedOn: '2025-11-17' },
    ];
    const updatedHistory = [
      { ruleId: 'TEST_001', version: 3, modifiedBy: 'user1', modifiedOn: '2025-11-17' },
      { ruleId: 'TEST_001', version: 2, modifiedBy: 'user1', modifiedOn: '2025-11-17' },
    ];

    mockFetchHistory
      .mockResolvedValueOnce(mockHistory)
      .mockResolvedValueOnce(updatedHistory);
    mockRestoreVersion.mockResolvedValue();

    const { result } = renderHook(() => useRuleHistory({
      selectedRuleUuid: 'abc-123',
      onFetchHistory: mockFetchHistory,
      onRestoreVersion: mockRestoreVersion,
    }));

    await waitFor(() => {
      expect(result.current.history).toEqual(mockHistory);
    });

    await result.current.restoreVersion(2);

    expect(mockRestoreVersion).toHaveBeenCalledWith('abc-123', 2);
    
    await waitFor(() => {
      expect(result.current.history).toEqual(updatedHistory);
    });
  });

  it('should handle restore errors', async () => {
    const mockError = new Error('Restore failed');
    mockFetchHistory.mockResolvedValue([]);
    mockRestoreVersion.mockRejectedValue(mockError);

    const { result } = renderHook(() => useRuleHistory({
      selectedRuleUuid: 'abc-123',
      onFetchHistory: mockFetchHistory,
      onRestoreVersion: mockRestoreVersion,
      onError: mockOnError,
    }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.restoreVersion(1)).rejects.toThrow('Restore failed');
    expect(mockOnError).toHaveBeenCalledWith(mockError);
  });
});
