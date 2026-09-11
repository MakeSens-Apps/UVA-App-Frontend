/**
 * B04 Gate — Jest test: errors-api contract {success,data} | {success,error}
 *
 * Verifies:
 *   1. handleAPIError returns {name, mensage (typo preserved), type}
 *   2. API response union type is discriminated by 'success'
 *   3. typo 'mensage' is present (load-bearing contract, portability-matrix §4.4)
 */

import {
  handleAPIError,
  errorAPIResponse,
  APIErrorResponse,
} from '../data/api/errors-handle/errors';

describe('B04 — errors-api contract', () => {
  describe('handleAPIError', () => {
    it('returns structured error for Error instance', () => {
      const err = new Error('test error message');
      const result = handleAPIError(err);
      expect(result).toEqual({
        name: 'unexpecteError',
        mensage: 'test error message', // typo preserved: 'mensage' not 'message'
        type: 'unknown',
      });
    });

    it('returns structured error for unknown throw', () => {
      const result = handleAPIError('some string error');
      expect(result).toEqual({
        name: 'unknownerror',
        mensage: 'unknown error',
        type: 'unknown',
      });
    });

    it('returns structured error for null', () => {
      const result = handleAPIError(null);
      expect(result).toEqual({
        name: 'unknownerror',
        mensage: 'unknown error',
        type: 'unknown',
      });
    });

    it('preserves typo: field is named "mensage" not "message"', () => {
      const result = handleAPIError(new Error('test'));
      // The typo 'mensage' is load-bearing — all callers use this key
      expect('mensage' in result).toBe(true);
      expect('message' in result).toBe(false);
    });

    it('returns type: unknown for Error instance', () => {
      const result = handleAPIError(new Error('test'));
      expect(result.type).toBe('unknown');
    });
  });

  describe('APIErrorResponse shape', () => {
    it('success=false shape is valid', () => {
      const errorResponse: APIErrorResponse = {
        success: false,
        error: {
          name: 'TestError',
          mensage: 'test message',
          type: 'validation',
        },
      };
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.mensage).toBe('test message');
    });
  });

  describe('success/error union discrimination', () => {
    it('success=true carries data, success=false carries error', () => {
      type APIResponse<T> =
        | { success: true; data: T }
        | { success: false; error: errorAPIResponse };

      const successResult: APIResponse<{ id: string }> = {
        success: true,
        data: { id: 'test-id' },
      };

      const errorResult: APIResponse<{ id: string }> = {
        success: false,
        error: handleAPIError(new Error('fail')),
      };

      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.data.id).toBe('test-id');
      }

      expect(errorResult.success).toBe(false);
      if (!errorResult.success) {
        expect(errorResult.error.type).toBe('unknown');
      }
    });
  });
});
