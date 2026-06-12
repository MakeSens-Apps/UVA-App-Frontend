/**
 * B04 — UserProgressAPIService
 * Ported from: src/app/core/services/api/user-progress-api.service.ts
 * Classification: Minor adaptation
 * Changes:
 *   - Removed @Injectable({ providedIn: 'root' }) — exported singleton instance
 *   - Import paths updated to mobile/ structure
 */

import { generateClient } from 'aws-amplify/api';
import { createUserProgress } from '@/data/graphql/mutations';
import { CreateUserProgressInput, CreateUserProgressMutation } from '@/data/graphql/API';
import {
  handleAPIError,
  APIErrorResponse,
} from './errors-handle/errors';

const client = generateClient();

interface AuthSuccessResponse {
  success: true;
  data: CreateUserProgressMutation;
}
export type APIUserProgressResponse = AuthSuccessResponse | APIErrorResponse;

class UserProgressAPIService {
  /**
   * Crea el progreso del usuario enviando la información a través de una consulta GraphQL.
   * @param {CreateUserProgressInput} userProgress - Objeto que contiene la información del progreso del usuario a crear.
   * @returns {Promise<APIUserProgressResponse>} Una promesa que se resuelve con la respuesta de la API, que incluye el éxito de la operación y, en caso de error, los detalles del error.
   */
  async createUserProgress(
    userProgress: CreateUserProgressInput,
  ): Promise<APIUserProgressResponse> {
    try {
      const response = await client.graphql({
        query: createUserProgress,
        variables: {
          input: userProgress,
        },
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
export const userProgressAPIService = new UserProgressAPIService();
