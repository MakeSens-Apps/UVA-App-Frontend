/**
 * B04 — UserAPIService
 * Ported from: src/app/core/services/api/user-api.service.ts
 * Classification: Minor adaptation
 * Changes:
 *   - Removed @Injectable({ providedIn: 'root' }) — exported singleton instance
 *   - Import paths updated to mobile/ structure
 *   - generateClient() called at module level (Amplify.configure runs before this in App.tsx)
 *
 * NOTE: createUserOnly mutation is kept inline (as in original) to avoid extra connections.
 */

import { generateClient } from 'aws-amplify/api';
import { getUser } from '@/data/graphql/queries';
import {
  CreateUserInput,
  CreateUserMutation,
  GetUserQuery,
  GetUserQueryVariables,
} from '@/data/graphql/API';
import { handleAPIError, APIErrorResponse } from './errors-handle/errors';
import * as APITypes from '@/data/graphql/API';

type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};
const client = generateClient();

// Tipo para la respuesta exitosa
interface AuthSuccessResponse<T> {
  success: true;
  data: T;
}

// Unión de ambos tipos en la interfaz principal
export type APIUserResponse<T> = AuthSuccessResponse<T> | APIErrorResponse;

export const createUserOnly = /* GraphQL */ `mutation CreateUser(
  $input: CreateUserInput!
  $condition: ModelUserConditionInput
) {
  createUser(input: $input, condition: $condition) {
    id
    Name
    LastName
    PhoneNumber
    Email
    Rank
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateUserMutationVariables,
  APITypes.CreateUserMutation
>;

class UserAPIService {
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
        query: createUserOnly,
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

/** Singleton — import-level DI replacement (portability-matrix §4.1) */
export const userAPIService = new UserAPIService();
