import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { createUser } from 'src/graphql/mutations';
import { CreateUserInput, CreateUserMutation } from 'src/API';
import {
  handleAPIError,
  APIErrorResponse,
} from './errors-handle/errors-api.service';
const client = generateClient();

// Tipo para la respuesta exitosa
interface AuthSuccessResponse {
  success: true;
  data: CreateUserMutation;
}

// Unión de ambos tipos en la interfaz principal
export type APIUserResponse = AuthSuccessResponse | APIErrorResponse;

@Injectable({
  providedIn: 'root',
})
export class UserAPIService {
  constructor() {}

  async createUser(user: CreateUserInput): Promise<APIUserResponse> {
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
}
