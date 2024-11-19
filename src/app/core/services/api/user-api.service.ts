import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { createUser } from 'src/graphql/mutations';
import { getUser } from 'src/graphql/queries';
import {
  CreateUserInput,
  CreateUserMutation,
  GetUserQuery,
  GetUserQueryVariables,
} from 'src/API';
import {
  handleAPIError,
  APIErrorResponse,
} from './errors-handle/errors-api.service';
const client = generateClient();

// Tipo para la respuesta exitosa
interface AuthSuccessResponse<T> {
  success: true;
  data: T;
}

// Unión de ambos tipos en la interfaz principal
export type APIUserResponse<T> = AuthSuccessResponse<T> | APIErrorResponse;

@Injectable({
  providedIn: 'root',
})
export class UserAPIService {
  /**
   * Creates an instance of UserAPIService.
   * @memberof UserAPIService
   */
  constructor() {}
  /**
   * Creates a new user in the system.
   * This method sends a GraphQL request to create a user and handles any potential errors
   * that may arise during the request.
   * @param {CreateUserInput} user - The input data required to create the user.
   * @returns {Promise<APIUserResponse>} A promise that resolves to an object containing the
   * success status and either the user data or an error message.
   */
  async createUser(
    user: CreateUserInput,
  ): Promise<APIUserResponse<CreateUserMutation>> {
    try {
      const response = await client.graphql({
        query: createUser,
        variables: {
          input: user,
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

  /**
   * Fetches a user from the API using the provided query variables.
   * @param {GetUserQueryVariables} input - The input variables for the GraphQL `getUser` query.
   * @returns {Promise<APIUserResponse<GetUserQuery>>} - A promise resolving to an object indicating
   * the success or failure of the operation, including the user data or an error.
   */
  async getUser(
    input: GetUserQueryVariables,
  ): Promise<APIUserResponse<GetUserQuery>> {
    try {
      const response = await client.graphql({
        query: getUser,
        variables: input,
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
