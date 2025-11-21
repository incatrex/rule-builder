import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRuleBuilder } from '../useRuleBuilder';
import { message } from 'antd';

// Mock antd message
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    message: {
      warning: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    },
  };
});

/**
 * Tests for useRuleBuilder return type validation
 * 
 * These tests verify that:
 * 1. Warning is shown when user changes return type to a mismatched value
 * 2. Rules cannot be saved when return type doesn't match the evaluated expression type
 * 3. Rules can be saved when types match correctly
 * 
 * This prevents issues like:
 * - Creating a rule that declares "returns text" but actually evaluates to a number
 * - Using a rule reference that expects one type but receives another
 */
describe('useRuleBuilder - Return Type Validation', () => {
  let mockRuleService;
  let mockConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRuleService = {
      createRule: vi.fn(),
      updateRule: vi.fn(),
      getVersionNumbers: vi.fn().mockResolvedValue([]),
    };
    
    mockConfigService = {
      getConfig: vi.fn().mockResolvedValue({ ruleTypes: ['Reporting', 'Transformation'] }),
    };
  });

  describe('Return Type Change Validation', () => {
    it('should show warning when changing return type on expression structure with mismatched type', async () => {
      const { result } = renderHook(() => useRuleBuilder({
        ruleService: mockRuleService,
        configService: mockConfigService,
        selectedRuleUuid: null,
        onRuleChange: vi.fn(),
        onSaveSuccess: vi.fn(),
      }));

      // Wait for initial state
      await waitFor(() => {
        expect(result.current.ruleData.definition).toBeDefined();
      });

      // Set up an expression structure
      act(() => {
        result.current.handleStructureChange('expression');
      });

      await waitFor(() => {
        expect(result.current.ruleData.structure).toBe('expression');
      });

      // Set the definition to have a number expression
      act(() => {
        result.current.handleChange({
          definition: {
            type: 'value',
            returnType: 'number',
            value: 42
          }
        });
      });

      // Now try to change the return type to text (should trigger warning)
      act(() => {
        result.current.handleChange({ returnType: 'text' });
      });

      // Verify warning was shown
      expect(message.warning).toHaveBeenCalledWith(
        expect.stringContaining('Return type changed to text'),
        5
      );
      expect(message.warning).toHaveBeenCalledWith(
        expect.stringContaining('expression evaluates to number'),
        5
      );
    });

    it('should not show warning when return types match', async () => {
      const { result } = renderHook(() => useRuleBuilder({
        ruleService: mockRuleService,
        configService: mockConfigService,
        selectedRuleUuid: null,
        onRuleChange: vi.fn(),
        onSaveSuccess: vi.fn(),
      }));

      await waitFor(() => {
        expect(result.current.ruleData.definition).toBeDefined();
      });

      act(() => {
        result.current.handleStructureChange('expression');
      });

      await waitFor(() => {
        expect(result.current.ruleData.structure).toBe('expression');
      });

      // Set definition with number type
      act(() => {
        result.current.handleChange({
          definition: {
            type: 'value',
            returnType: 'number',
            value: 42
          }
        });
      });

      // Change to matching type (should not trigger warning)
      act(() => {
        result.current.handleChange({ returnType: 'number' });
      });

      expect(message.warning).not.toHaveBeenCalled();
    });
  });

  describe('Save Validation', () => {
    it('should prevent saving when return type does not match evaluated type', async () => {
      mockRuleService.createRule.mockResolvedValue({
        ruleId: 'BAD_RULE',
        uuid: 'test-uuid',
        version: 1
      });

      const { result } = renderHook(() => useRuleBuilder({
        ruleService: mockRuleService,
        configService: mockConfigService,
        selectedRuleUuid: null,
        onRuleChange: vi.fn(),
        onSaveSuccess: vi.fn(),
      }));

      await waitFor(() => {
        expect(result.current.ruleData.definition).toBeDefined();
      });

      // Set up expression structure
      act(() => {
        result.current.handleStructureChange('expression');
      });

      await waitFor(() => {
        expect(result.current.ruleData.structure).toBe('expression');
      });

      // Set rule ID, definition, and mismatched return type
      act(() => {
        result.current.handleChange({
          metadata: { id: 'BAD_RULE' },
          definition: {
            type: 'value',
            returnType: 'number',
            value: 42
          },
          returnType: 'text'
        });
      });

      // Try to save (should fail)
      await act(async () => {
        await result.current.handleSaveRule();
      });

      // Verify error was shown
      expect(message.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot save')
      );
      expect(message.error).toHaveBeenCalledWith(
        expect.stringContaining('return text but the expression evaluates to number')
      );

      // Verify save was not attempted
      expect(mockRuleService.createRule).not.toHaveBeenCalled();
    });

    it('should allow saving when return type matches evaluated type', async () => {
      mockRuleService.createRule.mockResolvedValue({
        ruleId: 'GOOD_RULE',
        uuid: 'good-uuid',
        version: 1
      });

      const { result } = renderHook(() => useRuleBuilder({
        ruleService: mockRuleService,
        configService: mockConfigService,
        selectedRuleUuid: null,
        onRuleChange: vi.fn(),
        onSaveSuccess: vi.fn(),
      }));

      await waitFor(() => {
        expect(result.current.ruleData.definition).toBeDefined();
      });

      // Set up expression structure
      act(() => {
        result.current.handleStructureChange('expression');
      });

      await waitFor(() => {
        expect(result.current.ruleData.structure).toBe('expression');
      });

      // Set rule ID, definition, and matching return type
      act(() => {
        result.current.handleChange({
          metadata: { id: 'GOOD_RULE' },
          definition: {
            type: 'value',
            returnType: 'number',
            value: 42
          },
          returnType: 'number'
        });
      });

      // Save should succeed
      await act(async () => {
        await result.current.handleSaveRule();
      });

      // Verify no error was shown
      expect(message.error).not.toHaveBeenCalled();

      // Verify save was attempted
      expect(mockRuleService.createRule).toHaveBeenCalledWith(
        expect.objectContaining({
          structure: 'expression',
          returnType: 'number',
          metadata: expect.objectContaining({ id: 'GOOD_RULE' })
        })
      );

      // Verify success message
      expect(message.success).toHaveBeenCalledWith(
        expect.stringContaining('GOOD_RULE')
      );
    });
  });
});

