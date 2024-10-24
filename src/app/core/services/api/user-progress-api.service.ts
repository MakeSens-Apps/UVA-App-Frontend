import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { createUserProgress } from 'src/graphql/mutations';
import { CreateUserProgressInput, CreateUserProgressMutation } from 'src/API';
import {
  handleAPIError,
  APIErrorResponse,
} from './errors-handle/errors-api.service';

const client = generateClient();

interface AuthSuccessResponse {
  success: true;
  data: CreateUserProgressMutation;
}
export type APIUserProgressResponse = AuthSuccessResponse | APIErrorResponse;

@Injectable({
  providedIn: 'root',
})
export class UserProgressAPIService {
  /**
   * Creates an instance of UserProgressAPIService.
   * @memberof UserProgressAPIService
   */
  constructor() {}

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
