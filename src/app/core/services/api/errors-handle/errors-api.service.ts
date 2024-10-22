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

export function handleAPIError(err: unknown): errorAPIResponse {
  console.error(err);
  if (err instanceof Error) {
    return { name: 'unexpecteError', mensage: err.message, type: 'unknown' };
  }
  return { name: 'unknownerror', mensage: 'unknown error', type: 'unknown' };
}
