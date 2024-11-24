import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { getMoonPhase } from 'src/graphql/queries';
import { GetMoonPhaseQueryVariables, GetMoonPhaseQuery } from 'src/API';
import {
  handleAPIError,
  APIErrorResponse,
} from './errors-handle/errors-api.service';

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

@Injectable({
  providedIn: 'root',
})
export class MoonPhaseAPIService {
  /**
   * Constructs an instance of the RacimoAPIService.
   */
  constructor() {}

  /**
   * Retrieves a list of Racimos based on the provided variables.
   * @param {GetMoonPhaseQueryVariables} variables - The variables to filter the list of Racimos.
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
