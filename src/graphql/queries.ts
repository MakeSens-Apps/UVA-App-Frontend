/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getMoonPhase =
  /* GraphQL */ `query GetMoonPhase($year: Int!, $month: Int!) {
  getMoonPhase(year: $year, month: $month)
}
` as GeneratedQuery<
    APITypes.GetMoonPhaseQueryVariables,
    APITypes.GetMoonPhaseQuery
  >;
export const getRACIMO = /* GraphQL */ `query GetRACIMO($id: ID!) {
  getRACIMO(id: $id) {
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
` as GeneratedQuery<APITypes.GetRACIMOQueryVariables, APITypes.GetRACIMOQuery>;
export const listRACIMOS = /* GraphQL */ `query ListRACIMOS(
  $filter: ModelRACIMOFilterInput
  $limit: Int
  $nextToken: String
) {
  listRACIMOS(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      Name
      LinkageCode
      Configuration
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListRACIMOSQueryVariables,
  APITypes.ListRACIMOSQuery
>;
export const syncRACIMOS = /* GraphQL */ `query SyncRACIMOS(
  $filter: ModelRACIMOFilterInput
  $limit: Int
  $nextToken: String
  $lastSync: AWSTimestamp
) {
  syncRACIMOS(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    lastSync: $lastSync
  ) {
    items {
      id
      Name
      LinkageCode
      Configuration
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.SyncRACIMOSQueryVariables,
  APITypes.SyncRACIMOSQuery
>;
export const getMeasurement = /* GraphQL */ `query GetMeasurement($id: ID!) {
  getMeasurement(id: $id) {
    id
    type
    data
    logs
    ts
    ts_sync
    uvaID
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetMeasurementQueryVariables,
  APITypes.GetMeasurementQuery
>;
export const listMeasurements = /* GraphQL */ `query ListMeasurements(
  $filter: ModelMeasurementFilterInput
  $limit: Int
  $nextToken: String
) {
  listMeasurements(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      type
      data
      logs
      ts
      ts_sync
      uvaID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListMeasurementsQueryVariables,
  APITypes.ListMeasurementsQuery
>;
export const syncMeasurements = /* GraphQL */ `query SyncMeasurements(
  $filter: ModelMeasurementFilterInput
  $limit: Int
  $nextToken: String
  $lastSync: AWSTimestamp
) {
  syncMeasurements(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    lastSync: $lastSync
  ) {
    items {
      id
      type
      data
      logs
      ts
      ts_sync
      uvaID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.SyncMeasurementsQueryVariables,
  APITypes.SyncMeasurementsQuery
>;
export const measurementsByUvaIDAndTs =
  /* GraphQL */ `query MeasurementsByUvaIDAndTs(
  $uvaID: ID!
  $ts: ModelStringKeyConditionInput
  $sortDirection: ModelSortDirection
  $filter: ModelMeasurementFilterInput
  $limit: Int
  $nextToken: String
) {
  measurementsByUvaIDAndTs(
    uvaID: $uvaID
    ts: $ts
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      type
      data
      logs
      ts
      ts_sync
      uvaID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
    APITypes.MeasurementsByUvaIDAndTsQueryVariables,
    APITypes.MeasurementsByUvaIDAndTsQuery
  >;
export const getUserProgress = /* GraphQL */ `query GetUserProgress($id: ID!) {
  getUserProgress(id: $id) {
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
` as GeneratedQuery<
  APITypes.GetUserProgressQueryVariables,
  APITypes.GetUserProgressQuery
>;
export const listUserProgresses = /* GraphQL */ `query ListUserProgresses(
  $filter: ModelUserProgressFilterInput
  $limit: Int
  $nextToken: String
) {
  listUserProgresses(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserProgressesQueryVariables,
  APITypes.ListUserProgressesQuery
>;
export const syncUserProgresses = /* GraphQL */ `query SyncUserProgresses(
  $filter: ModelUserProgressFilterInput
  $limit: Int
  $nextToken: String
  $lastSync: AWSTimestamp
) {
  syncUserProgresses(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    lastSync: $lastSync
  ) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.SyncUserProgressesQueryVariables,
  APITypes.SyncUserProgressesQuery
>;
export const userProgressesByUserIDAndTs =
  /* GraphQL */ `query UserProgressesByUserIDAndTs(
  $userID: ID!
  $ts: ModelStringKeyConditionInput
  $sortDirection: ModelSortDirection
  $filter: ModelUserProgressFilterInput
  $limit: Int
  $nextToken: String
) {
  userProgressesByUserIDAndTs(
    userID: $userID
    ts: $ts
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
    APITypes.UserProgressesByUserIDAndTsQueryVariables,
    APITypes.UserProgressesByUserIDAndTsQuery
  >;
export const getUser = /* GraphQL */ `query GetUser($id: ID!) {
  getUser(id: $id) {
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
` as GeneratedQuery<APITypes.GetUserQueryVariables, APITypes.GetUserQuery>;
export const listUsers = /* GraphQL */ `query ListUsers(
  $filter: ModelUserFilterInput
  $limit: Int
  $nextToken: String
) {
  listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.ListUsersQueryVariables, APITypes.ListUsersQuery>;
export const syncUsers = /* GraphQL */ `query SyncUsers(
  $filter: ModelUserFilterInput
  $limit: Int
  $nextToken: String
  $lastSync: AWSTimestamp
) {
  syncUsers(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    lastSync: $lastSync
  ) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.SyncUsersQueryVariables, APITypes.SyncUsersQuery>;
export const getUVA = /* GraphQL */ `query GetUVA($id: ID!) {
  getUVA(id: $id) {
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
` as GeneratedQuery<APITypes.GetUVAQueryVariables, APITypes.GetUVAQuery>;
export const listUVAS =
  /* GraphQL */ `query ListUVAS($filter: ModelUVAFilterInput, $limit: Int, $nextToken: String) {
  listUVAS(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.ListUVASQueryVariables, APITypes.ListUVASQuery>;
export const syncUVAS = /* GraphQL */ `query SyncUVAS(
  $filter: ModelUVAFilterInput
  $limit: Int
  $nextToken: String
  $lastSync: AWSTimestamp
) {
  syncUVAS(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    lastSync: $lastSync
  ) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.SyncUVASQueryVariables, APITypes.SyncUVASQuery>;
export const UVAbyUserID = /* GraphQL */ `query UVAbyUserID(
  $userID: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelUVAFilterInput
  $limit: Int
  $nextToken: String
) {
  UVAbyUserID(
    userID: $userID
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.UVAbyUserIDQueryVariables,
  APITypes.UVAbyUserIDQuery
>;
export const UVAsByRacimoID = /* GraphQL */ `query UVAsByRacimoID(
  $racimoID: ID!
  $createdAt: ModelStringKeyConditionInput
  $sortDirection: ModelSortDirection
  $filter: ModelUVAFilterInput
  $limit: Int
  $nextToken: String
) {
  UVAsByRacimoID(
    racimoID: $racimoID
    createdAt: $createdAt
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
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
    nextToken
    startedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.UVAsByRacimoIDQueryVariables,
  APITypes.UVAsByRacimoIDQuery
>;
