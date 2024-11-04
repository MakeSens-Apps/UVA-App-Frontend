import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { createUVA, updateUVA } from 'src/graphql/mutations';
import { UVAbyUserID, UVAsByRacimoID } from 'src/graphql/queries';
import {
  CreateUVAInput,
  CreateUVAMutation,
  UpdateUVAInput,
  UpdateUVAMutation,
  UVAbyUserIDQuery,
  UVAbyUserIDQueryVariables,
  UVAsByRacimoIDQuery,
  UVAsByRacimoIDQueryVariables,
} from 'src/API';
import {
  handleAPIError,
  APIErrorResponse,
} from './errors-handle/errors-api.service';

const client = generateClient();

// Tipo para la respuesta exitosa
interface UVASuccessResponse<T> {
  success: true;
  data: T;
}

// Unión de ambos tipos en la interfaz principal
export type APIUVAResponse<T> = UVASuccessResponse<T> | APIErrorResponse;

/**
 * Service class for interacting with the UVA API.
 * This class provides methods to retrieve and create UVA data.
 */
@Injectable({
  providedIn: 'root',
})
export class UvaAPIService {
  /**
   * Constructs an instance of the UvaAPIService.
   */
  constructor() {}
  /**
   * Retrieves UVA data for a specific user based on the provided variables.
   * @param {UVAbyUserIDQueryVariables} variables - The variables to filter UVA by user ID.
   * @returns {Promise<APIUVAResponse<UVAbyUserIDQuery>>} - A promise that resolves to the API response,
   * which includes success status, data, or error information.
   */
  async getUVAByUser(
    variables: UVAbyUserIDQueryVariables,
  ): Promise<APIUVAResponse<UVAbyUserIDQuery>> {
    try {
      const response = await client.graphql({
        query: UVAbyUserID,
        variables: variables,
      });

      if (response.errors) {
        return { success: false, error: handleAPIError(response.errors) };
      }

      const items = response.data?.UVAbyUserID?.items;
      if (items && items.length > 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: handleAPIError('No UVA found') };
      }
    } catch (err) {
      return { success: false, error: handleAPIError(err) };
    }
  }

  /**
   * Retrieves UVA data for a specific Racimo based on the provided variables.
   * @param {UVAsByRacimoIDQueryVariables} variables - The variables to filter UVAs by Racimo ID.
   * @returns {Promise<APIUVAResponse<UVAsByRacimoIDQuery>>} - A promise that resolves to the API response,
   * which includes success status, data, or error information.
   */
  async getUVAByRACIMO(
    variables: UVAsByRacimoIDQueryVariables,
  ): Promise<APIUVAResponse<UVAsByRacimoIDQuery>> {
    try {
      const response = await client.graphql({
        query: UVAsByRacimoID,
        variables: variables,
      });

      if (response.errors) {
        return { success: false, error: handleAPIError(response.errors) };
      }

      const items = response.data?.UVAsByRacimoID?.items;
      if (items && items.length > 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: handleAPIError('No UVA found') };
      }
    } catch (err) {
      return { success: false, error: handleAPIError(err) };
    }
  }

  /**
   * Creates a new UVA.
   * @param {CreateUVAInput} uva - The input data for creating the UVA.
   * @returns {Promise<APIUVAResponse<CreateUVAMutation>>} - A promise that resolves to the API response,
   * which includes success status, data, or error information.
   */
  async createUVA(
    uva: CreateUVAInput,
  ): Promise<APIUVAResponse<CreateUVAMutation>> {
    try {
      const response = await client.graphql({
        query: createUVA,
        variables: {
          input: uva,
        },
      });
      if (response.data.createUVA) {
        return { success: true, data: response.data };
      }
      if (response.errors) {
        return { success: false, error: handleAPIError(response.errors) };
      }
      return { success: false, error: handleAPIError('No create uva') };
    } catch (err) {
      return { success: false, error: handleAPIError(err) };
    }
  }

  /**
   * Updates UVA (Unit Value Added) information by sending a GraphQL mutation request.
   * @async
   * @param {UpdateUVAInput} uva - The UVA data to be updated.
   * @returns {Promise<APIUVAResponse<UpdateUVAMutation>>} - A promise that resolves to an object containing
   *          the success status and data of the mutation if successful, or an error message if it fails.
   */
  async updateUVA(
    uva: UpdateUVAInput,
  ): Promise<APIUVAResponse<UpdateUVAMutation>> {
    try {
      const response = await client.graphql({
        query: updateUVA,
        variables: {
          input: uva,
        },
      });
      if (response.data.updateUVA) {
        return { success: true, data: response.data };
      }
      if (response.errors) {
        return { success: false, error: handleAPIError(response.errors) };
      }
      return { success: false, error: handleAPIError('No create uva') };
    } catch (err) {
      return { success: false, error: handleAPIError(err) };
    }
  }
}
