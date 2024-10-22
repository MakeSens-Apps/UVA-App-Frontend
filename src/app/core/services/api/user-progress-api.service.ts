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
  constructor() {}

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
