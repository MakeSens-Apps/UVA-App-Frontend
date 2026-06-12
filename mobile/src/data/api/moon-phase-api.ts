/**
 * B04 — MoonPhaseAPIService
 * Ported from: src/app/core/services/api/moon-phase-api.service.ts
 * Classification: Minor adaptation
 * Changes:
 *   - Removed @Injectable({ providedIn: 'root' }) — exported singleton instance
 *   - Import paths updated to mobile/ structure
 *   - MoonPhaseService (B07) will compose this via import, not extends
 */

import { generateClient } from 'aws-amplify/api';
import { getMoonPhase } from '@/data/graphql/queries';
import { GetMoonPhaseQueryVariables, GetMoonPhaseQuery } from '@/data/graphql/API';
import {
  handleAPIError,
  APIErrorResponse,
} from './errors-handle/errors';

const client = generateClient();

/**
 * Union type for API response, which can either be a success or an error response.
 * @template T - The type of the data returned in the response.
 * @typedef {MoonPhaseSuccessResponse<T> | APIErrorResponse} APIMoonPhaseResponse
 */
interface MoonPhaseSuccessResponse<T> {
  success: true;
  data: T;
}

// Unión de ambos tipos en la interfaz principal
export type APIMoonPhaseResponse<T> =
  | MoonPhaseSuccessResponse<T>
  | APIErrorResponse;

class MoonPhaseAPIService {
  /**
   * Retrieves moon phase data for a given year/month.
   * @param {GetMoonPhaseQueryVariables} variables - The variables to query the moon phase.
   * @returns {Promise<APIMoonPhaseResponse<GetMoonPhaseQuery>>} - A promise that resolves to the API response, which includes success status, data, or error information.
   */
  async getMoonPhase(
    variables: GetMoonPhaseQueryVariables,
  ): Promise<APIMoonPhaseResponse<GetMoonPhaseQuery>> {
    try {
      const response = await client.graphql({
        query: getMoonPhase,
        variables: variables,
      });
      if (response.errors) {
        return { success: false, error: handleAPIError(response.errors) };
      }
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: handleAPIError(err) };
    }
  }
}

/** Singleton — import-level DI replacement (portability-matrix §4.1) */
export const moonPhaseAPIService = new MoonPhaseAPIService();
