/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createRACIMO = /* GraphQL */ `mutation CreateRACIMO(
  $input: CreateRACIMOInput!
  $condition: ModelRACIMOConditionInput
) {
  createRACIMO(input: $input, condition: $condition) {
    id
    Name
    LinkageCode
    Configuration
    UVAs {
      nextToken
      startedAt
      __typename
    }
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateRACIMOMutationVariables,
  APITypes.CreateRACIMOMutation
>;
export const updateRACIMO = /* GraphQL */ `mutation UpdateRACIMO(
  $input: UpdateRACIMOInput!
  $condition: ModelRACIMOConditionInput
) {
  updateRACIMO(input: $input, condition: $condition) {
    id
    Name
    LinkageCode
    Configuration
    UVAs {
      nextToken
      startedAt
      __typename
    }
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateRACIMOMutationVariables,
  APITypes.UpdateRACIMOMutation
>;
export const deleteRACIMO = /* GraphQL */ `mutation DeleteRACIMO(
  $input: DeleteRACIMOInput!
  $condition: ModelRACIMOConditionInput
) {
  deleteRACIMO(input: $input, condition: $condition) {
    id
    Name
    LinkageCode
    Configuration
    UVAs {
      nextToken
      startedAt
      __typename
    }
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteRACIMOMutationVariables,
  APITypes.DeleteRACIMOMutation
>;
export const createMeasurement = /* GraphQL */ `mutation CreateMeasurement(
  $input: CreateMeasurementInput!
  $condition: ModelMeasurementConditionInput
) {
  createMeasurement(input: $input, condition: $condition) {
    id
    type
    data
    logs
    ts
    task
    uvaID
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateMeasurementMutationVariables,
  APITypes.CreateMeasurementMutation
>;
export const updateMeasurement = /* GraphQL */ `mutation UpdateMeasurement(
  $input: UpdateMeasurementInput!
  $condition: ModelMeasurementConditionInput
) {
  updateMeasurement(input: $input, condition: $condition) {
    id
    type
    data
    logs
    ts
    task
    uvaID
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateMeasurementMutationVariables,
  APITypes.UpdateMeasurementMutation
>;
export const deleteMeasurement = /* GraphQL */ `mutation DeleteMeasurement(
  $input: DeleteMeasurementInput!
  $condition: ModelMeasurementConditionInput
) {
  deleteMeasurement(input: $input, condition: $condition) {
    id
    type
    data
    logs
    ts
    task
    uvaID
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteMeasurementMutationVariables,
  APITypes.DeleteMeasurementMutation
>;
export const createUserProgress = /* GraphQL */ `mutation CreateUserProgress(
  $input: CreateUserProgressInput!
  $condition: ModelUserProgressConditionInput
) {
  createUserProgress(input: $input, condition: $condition) {
    id
    ts
    Seed
    Streak
    Milestones
    completedTasks
    userID
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateUserProgressMutationVariables,
  APITypes.CreateUserProgressMutation
>;
export const updateUserProgress = /* GraphQL */ `mutation UpdateUserProgress(
  $input: UpdateUserProgressInput!
  $condition: ModelUserProgressConditionInput
) {
  updateUserProgress(input: $input, condition: $condition) {
    id
    ts
    Seed
    Streak
    Milestones
    completedTasks
    userID
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateUserProgressMutationVariables,
  APITypes.UpdateUserProgressMutation
>;
export const deleteUserProgress = /* GraphQL */ `mutation DeleteUserProgress(
  $input: DeleteUserProgressInput!
  $condition: ModelUserProgressConditionInput
) {
  deleteUserProgress(input: $input, condition: $condition) {
    id
    ts
    Seed
    Streak
    Milestones
    completedTasks
    userID
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteUserProgressMutationVariables,
  APITypes.DeleteUserProgressMutation
>;
export const createUser = /* GraphQL */ `mutation CreateUser(
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
    UserProgresses {
      nextToken
      startedAt
      __typename
    }
    UVA {
      id
      latitude
      longitude
      altitude
      fields
      enabled
      createdAt
      userID
      racimoID
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
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
export const updateUser = /* GraphQL */ `mutation UpdateUser(
  $input: UpdateUserInput!
  $condition: ModelUserConditionInput
) {
  updateUser(input: $input, condition: $condition) {
    id
    Name
    LastName
    PhoneNumber
    Email
    Rank
    UserProgresses {
      nextToken
      startedAt
      __typename
    }
    UVA {
      id
      latitude
      longitude
      altitude
      fields
      enabled
      createdAt
      userID
      racimoID
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateUserMutationVariables,
  APITypes.UpdateUserMutation
>;
export const deleteUser = /* GraphQL */ `mutation DeleteUser(
  $input: DeleteUserInput!
  $condition: ModelUserConditionInput
) {
  deleteUser(input: $input, condition: $condition) {
    id
    Name
    LastName
    PhoneNumber
    Email
    Rank
    UserProgresses {
      nextToken
      startedAt
      __typename
    }
    UVA {
      id
      latitude
      longitude
      altitude
      fields
      enabled
      createdAt
      userID
      racimoID
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteUserMutationVariables,
  APITypes.DeleteUserMutation
>;
export const createUVA = /* GraphQL */ `mutation CreateUVA(
  $input: CreateUVAInput!
  $condition: ModelUVAConditionInput
) {
  createUVA(input: $input, condition: $condition) {
    id
    latitude
    longitude
    altitude
    fields
    enabled
    createdAt
    userID
    User {
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
    Measurements {
      nextToken
      startedAt
      __typename
    }
    racimoID
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateUVAMutationVariables,
  APITypes.CreateUVAMutation
>;
export const updateUVA = /* GraphQL */ `mutation UpdateUVA(
  $input: UpdateUVAInput!
  $condition: ModelUVAConditionInput
) {
  updateUVA(input: $input, condition: $condition) {
    id
    latitude
    longitude
    altitude
    fields
    enabled
    createdAt
    userID
    User {
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
    Measurements {
      nextToken
      startedAt
      __typename
    }
    racimoID
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateUVAMutationVariables,
  APITypes.UpdateUVAMutation
>;
export const deleteUVA = /* GraphQL */ `mutation DeleteUVA(
  $input: DeleteUVAInput!
  $condition: ModelUVAConditionInput
) {
  deleteUVA(input: $input, condition: $condition) {
    id
    latitude
    longitude
    altitude
    fields
    enabled
    createdAt
    userID
    User {
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
    Measurements {
      nextToken
      startedAt
      __typename
    }
    racimoID
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteUVAMutationVariables,
  APITypes.DeleteUVAMutation
>;
