import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { getRACIMO, listRACIMOS } from 'src/graphql/queries';
import {
  GetRACIMOQuery,
  GetRACIMOQueryVariables,
  ListRACIMOSQuery,
  ListRACIMOSQueryVariables,
} from 'src/API';
import {
  handleAPIError,
  APIErrorResponse,
} from './errors-handle/errors-api.service';

const client = generateClient();

/**
 * Union type for API response, which can either be a success or an error response.
 * @template T - The type of the data returned in the response.
 * @typedef {RACIMOSuccessResponse<T> | APIErrorResponse} APIRACIMOResponse
 */
interface RACIMOSuccessResponse<T> {
  success: true;
  data: T;
}

// Unión de ambos tipos en la interfaz principal
export type APIRACIMOResponse<T> = RACIMOSuccessResponse<T> | APIErrorResponse;

/**
 * Service class for interacting with the Racimo API.
 * This class provides methods to retrieve Racimo data.
 */
@Injectable({
  providedIn: 'root',
})
export class RacimoAPIService {
  /**
   * Constructs an instance of the RacimoAPIService.
   */
  constructor() {}

  /**
   * Retrieves a list of Racimos based on the provided variables.
   * @param {ListRACIMOSQueryVariables} variables - The variables to filter the list of Racimos.
   * @returns {Promise<APIRACIMOResponse<ListRACIMOSQuery>>} - A promise that resolves to the API response, which includes success status, data, or error information.
   */
  async listRACIMOS(
    variables: ListRACIMOSQueryVariables,
  ): Promise<APIRACIMOResponse<ListRACIMOSQuery>> {
    try {
      const response = await client.graphql({
        query: listRACIMOS,
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

  /**
   * Retrieves a Racimo by its ID based on the provided variables.
   * @param {GetRACIMOQueryVariables} variables - The variables to filter the Racimo by ID.
   * @returns {Promise<APIRACIMOResponse<GetRACIMOQuery>>} - A promise that resolves to the API response, which includes success status, data, or error information.
   */
  async getRACIMO(
    variables: GetRACIMOQueryVariables,
  ): Promise<APIRACIMOResponse<GetRACIMOQuery>> {
    try {
      const response = await client.graphql({
        query: getRACIMO,
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
