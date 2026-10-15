/**
 * B04 — errors-api
 * Ported from: src/app/core/services/api/errors-handle/errors-api.service.ts
 * Classification: Reusable as-is
 * Changes:
 *   - Removed @Injectable (no Angular DI)
 *   - File renamed: errors-api.service.ts → errors.ts
 *
 * PRESERVED: typo 'mensage' is load-bearing across all callers (portability-matrix §4.4).
 * DO NOT rename mensage → message without a coordinated refactor.
 */

export interface errorAPIResponse {
  mensage?: string;
  name?: string;
  type?: 'validation' | 'network' | 'authentication' | 'unknown';
}

// Tipo para la respuesta de error
export interface APIErrorResponse {
  success: false;
  error: errorAPIResponse;
}

/**
 * Handles API errors by logging the error and returning a structured error response.
 * @param {unknown} err - The error object to be handled. It can be of any type.
 * @returns {errorAPIResponse} An object containing details about the error.
 * The object includes:
 * - name: A string representing the type of error.
 * - mensage: A string providing a message related to the error. (NOTE: typo preserved — load-bearing contract)
 * - type: A string categorizing the error type.
 */
export function handleAPIError(err: unknown): errorAPIResponse {
  console.error(err);
  if (err instanceof Error) {
    return { name: 'unexpecteError', mensage: err.message, type: 'unknown' };
  }
  return { name: 'unknownerror', mensage: 'unknown error', type: 'unknown' };
}

/**
 * Returns the AppSync `errorType` of a failed GraphQL call, if there is one (F4-06, #61).
 * Amplify v6 rejects with the raw response (`{ data, errors: [{ errorType, message }] }`),
 * and `response.errors` carries the same list when it resolves.
 * @param {unknown} err - What the call threw, or its `errors` list.
 * @returns {string | undefined} The first errorType found.
 */
export function getGraphQLErrorType(err: unknown): string | undefined {
  const errors: unknown = Array.isArray(err)
    ? err
    : typeof err === 'object' && err !== null
      ? (err as { errors?: unknown }).errors
      : undefined;
  if (!Array.isArray(errors)) return undefined;
  for (const item of errors) {
    const errorType: unknown =
      typeof item === 'object' && item !== null
        ? (item as { errorType?: unknown }).errorType
        : undefined;
    if (typeof errorType === 'string' && errorType) return errorType;
  }
  return undefined;
}

/**
 * Like handleAPIError, but keeps the AppSync errorType as `name`, so callers can tell a
 * business rejection (for example RacimoInactive) from any other failure.
 * @param {unknown} err - What the GraphQL call threw, or its `errors` list.
 * @returns {errorAPIResponse}
 */
export function handleGraphQLError(err: unknown): errorAPIResponse {
  const error = handleAPIError(err);
  const errorType = getGraphQLErrorType(err);
  return errorType ? { ...error, name: errorType } : error;
}
