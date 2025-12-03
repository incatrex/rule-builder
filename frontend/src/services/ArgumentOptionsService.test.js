import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArgumentOptionsService } from './ArgumentOptionsService';

// Mock fetch globally
global.fetch = vi.fn();

describe('ArgumentOptionsService', () => {
  let service;

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.clearAllMocks();
    // Create new service instance with test config
    const testConfig = {
      'daysOfMonth': '/api/config/argument-options/days-of-month',
      'currencies': '/api/config/argument-options/currencies',
      'customers': {
        endpoint: '/api/config/argument-options/customers',
        paginated: true,
        searchParam: 'q'
      }
    };
    service = new ArgumentOptionsService(testConfig);
  });

  describe('getOptionsForRef', () => {
    it('should fetch and cache simple options', async () => {
      // Given
      const mockOptions = [
        { value: 1, label: '1st' },
        { value: 2, label: '2nd' }
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOptions
      });

      // When
      const options1 = await service.getOptionsForRef('daysOfMonth');
      const options2 = await service.getOptionsForRef('daysOfMonth');

      // Then
      expect(options1).toEqual(mockOptions);
      expect(options2).toEqual(mockOptions);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Cached after first call
      expect(global.fetch).toHaveBeenCalledWith('/api/config/argument-options/days-of-month');
    });

    it('should fetch paginated options with search', async () => {
      // Given
      const mockResults = [
        { value: 'CUST001', label: 'Acme Corp' }
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      // When
      const options = await service.getOptionsForRef('customers', 'acme');

      // Then
      expect(options).toEqual(mockResults);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/config/argument-options/customers?q=acme'
      );
    });

    it('should not cache paginated options', async () => {
      // Given
      const mockResults1 = [{ value: 'CUST001', label: 'Acme Corp' }];
      const mockResults2 = [{ value: 'CUST002', label: 'Tech Inc' }];
      
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockResults1 })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResults2 });

      // When
      const options1 = await service.getOptionsForRef('customers', 'acme');
      const options2 = await service.getOptionsForRef('customers', 'tech');

      // Then
      expect(options1).toEqual(mockResults1);
      expect(options2).toEqual(mockResults2);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Not cached
    });

    it('should return empty array for unconfigured optionsRef', async () => {
      // When
      const options = await service.getOptionsForRef('invalidRef');

      // Then
      expect(options).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Given
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // When
      const options = await service.getOptionsForRef('currencies');

      // Then
      expect(options).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle non-ok responses', async () => {
      // Given
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      // When
      const options = await service.getOptionsForRef('currencies');

      // Then
      expect(options).toEqual([]);
    });

    it('should use default search param if not specified', async () => {
      // Given
      const configWithDefaults = {
        'test': {
          endpoint: '/api/test',
          paginated: true
          // No searchParam specified
        }
      };
      const serviceWithDefaults = new ArgumentOptionsService(configWithDefaults);
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      // When
      await serviceWithDefaults.getOptionsForRef('test', 'query');

      // Then
      expect(global.fetch).toHaveBeenCalledWith('/api/test?q=query');
    });
  });

  describe('isPaginated', () => {
    it('should return true for paginated config', () => {
      // When/Then
      expect(service.isPaginated('customers')).toBe(true);
    });

    it('should return false for simple string config', () => {
      // When/Then
      expect(service.isPaginated('currencies')).toBe(false);
    });

    it('should return false for unconfigured ref', () => {
      // When/Then
      expect(service.isPaginated('invalidRef')).toBe(false);
    });

    it('should return false for object without paginated flag', () => {
      // Given
      const configWithoutFlag = {
        'test': {
          endpoint: '/api/test'
          // No paginated flag
        }
      };
      const serviceWithoutFlag = new ArgumentOptionsService(configWithoutFlag);

      // When/Then
      expect(serviceWithoutFlag.isPaginated('test')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cached options', async () => {
      // Given
      const mockOptions = [{ value: 1, label: '1st' }];
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockOptions
      });

      // Load and cache
      await service.getOptionsForRef('daysOfMonth');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // When - clear cache
      service.clearCache();

      // Then - should fetch again
      await service.getOptionsForRef('daysOfMonth');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
