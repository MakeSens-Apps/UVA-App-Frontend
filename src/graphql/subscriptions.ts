/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateRACIMO = /* GraphQL */ `subscription OnCreateRACIMO($filter: ModelSubscriptionRACIMOFilterInput) {
  onCreateRACIMO(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateRACIMOSubscriptionVariables,
  APITypes.OnCreateRACIMOSubscription
>;
export const onUpdateRACIMO = /* GraphQL */ `subscription OnUpdateRACIMO($filter: ModelSubscriptionRACIMOFilterInput) {
  onUpdateRACIMO(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateRACIMOSubscriptionVariables,
  APITypes.OnUpdateRACIMOSubscription
>;
export const onDeleteRACIMO = /* GraphQL */ `subscription OnDeleteRACIMO($filter: ModelSubscriptionRACIMOFilterInput) {
  onDeleteRACIMO(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteRACIMOSubscriptionVariables,
  APITypes.OnDeleteRACIMOSubscription
>;
export const onCreateMeasurement = /* GraphQL */ `subscription OnCreateMeasurement(
  $filter: ModelSubscriptionMeasurementFilterInput
) {
  onCreateMeasurement(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateMeasurementSubscriptionVariables,
  APITypes.OnCreateMeasurementSubscription
>;
export const onUpdateMeasurement = /* GraphQL */ `subscription OnUpdateMeasurement(
  $filter: ModelSubscriptionMeasurementFilterInput
) {
  onUpdateMeasurement(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateMeasurementSubscriptionVariables,
  APITypes.OnUpdateMeasurementSubscription
>;
export const onDeleteMeasurement = /* GraphQL */ `subscription OnDeleteMeasurement(
  $filter: ModelSubscriptionMeasurementFilterInput
) {
  onDeleteMeasurement(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteMeasurementSubscriptionVariables,
  APITypes.OnDeleteMeasurementSubscription
>;
export const onCreateUserProgress = /* GraphQL */ `subscription OnCreateUserProgress(
  $filter: ModelSubscriptionUserProgressFilterInput
) {
  onCreateUserProgress(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateUserProgressSubscriptionVariables,
  APITypes.OnCreateUserProgressSubscription
>;
export const onUpdateUserProgress = /* GraphQL */ `subscription OnUpdateUserProgress(
  $filter: ModelSubscriptionUserProgressFilterInput
) {
  onUpdateUserProgress(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateUserProgressSubscriptionVariables,
  APITypes.OnUpdateUserProgressSubscription
>;
export const onDeleteUserProgress = /* GraphQL */ `subscription OnDeleteUserProgress(
  $filter: ModelSubscriptionUserProgressFilterInput
) {
  onDeleteUserProgress(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteUserProgressSubscriptionVariables,
  APITypes.OnDeleteUserProgressSubscription
>;
export const onCreateUser = /* GraphQL */ `subscription OnCreateUser($filter: ModelSubscriptionUserFilterInput) {
  onCreateUser(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateUserSubscriptionVariables,
  APITypes.OnCreateUserSubscription
>;
export const onUpdateUser = /* GraphQL */ `subscription OnUpdateUser($filter: ModelSubscriptionUserFilterInput) {
  onUpdateUser(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateUserSubscriptionVariables,
  APITypes.OnUpdateUserSubscription
>;
export const onDeleteUser = /* GraphQL */ `subscription OnDeleteUser($filter: ModelSubscriptionUserFilterInput) {
  onDeleteUser(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteUserSubscriptionVariables,
  APITypes.OnDeleteUserSubscription
>;
export const onCreateUVA = /* GraphQL */ `subscription OnCreateUVA($filter: ModelSubscriptionUVAFilterInput) {
  onCreateUVA(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateUVASubscriptionVariables,
  APITypes.OnCreateUVASubscription
>;
export const onUpdateUVA = /* GraphQL */ `subscription OnUpdateUVA($filter: ModelSubscriptionUVAFilterInput) {
  onUpdateUVA(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateUVASubscriptionVariables,
  APITypes.OnUpdateUVASubscription
>;
export const onDeleteUVA = /* GraphQL */ `subscription OnDeleteUVA($filter: ModelSubscriptionUVAFilterInput) {
  onDeleteUVA(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteUVASubscriptionVariables,
  APITypes.OnDeleteUVASubscription
>;
