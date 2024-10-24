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
 * - message: A string providing a message related to the error.
 * - type: A string categorizing the error type.
 */
export function handleAPIError(err: unknown): errorAPIResponse {
  console.error(err);
  if (err instanceof Error) {
    return { name: 'unexpecteError', mensage: err.message, type: 'unknown' };
  }
  return { name: 'unknownerror', mensage: 'unknown error', type: 'unknown' };
}
