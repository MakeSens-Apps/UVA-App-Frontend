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
    GamificationEvents {
      nextToken
      startedAt
      __typename
    }
    AppUsageEvents {
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
    GamificationEvents {
      nextToken
      startedAt
      __typename
    }
    AppUsageEvents {
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
    GamificationEvents {
      nextToken
      startedAt
      __typename
    }
    AppUsageEvents {
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
  $owner: String
) {
  onCreateMeasurement(filter: $filter, owner: $owner) {
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
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateMeasurementSubscriptionVariables,
  APITypes.OnCreateMeasurementSubscription
>;
export const onUpdateMeasurement = /* GraphQL */ `subscription OnUpdateMeasurement(
  $filter: ModelSubscriptionMeasurementFilterInput
  $owner: String
) {
  onUpdateMeasurement(filter: $filter, owner: $owner) {
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
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateMeasurementSubscriptionVariables,
  APITypes.OnUpdateMeasurementSubscription
>;
export const onDeleteMeasurement = /* GraphQL */ `subscription OnDeleteMeasurement(
  $filter: ModelSubscriptionMeasurementFilterInput
  $owner: String
) {
  onDeleteMeasurement(filter: $filter, owner: $owner) {
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
    owner
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteMeasurementSubscriptionVariables,
  APITypes.OnDeleteMeasurementSubscription
>;
export const onCreateUserProgress = /* GraphQL */ `subscription OnCreateUserProgress(
  $filter: ModelSubscriptionUserProgressFilterInput
  $userID: String
) {
  onCreateUserProgress(filter: $filter, userID: $userID) {
    id
    ts
    Seed
    Streak
    Milestones
    SaveStreak
    completedTasks
    additionalInfo
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
  $userID: String
) {
  onUpdateUserProgress(filter: $filter, userID: $userID) {
    id
    ts
    Seed
    Streak
    Milestones
    SaveStreak
    completedTasks
    additionalInfo
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
  $userID: String
) {
  onDeleteUserProgress(filter: $filter, userID: $userID) {
    id
    ts
    Seed
    Streak
    Milestones
    SaveStreak
    completedTasks
    additionalInfo
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
export const onCreateGamificationEvent = /* GraphQL */ `subscription OnCreateGamificationEvent(
  $filter: ModelSubscriptionGamificationEventFilterInput
  $userID: String
) {
  onCreateGamificationEvent(filter: $filter, userID: $userID) {
    id
    userID
    racimoID
    eventType
    ts
    data
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateGamificationEventSubscriptionVariables,
  APITypes.OnCreateGamificationEventSubscription
>;
export const onUpdateGamificationEvent = /* GraphQL */ `subscription OnUpdateGamificationEvent(
  $filter: ModelSubscriptionGamificationEventFilterInput
  $userID: String
) {
  onUpdateGamificationEvent(filter: $filter, userID: $userID) {
    id
    userID
    racimoID
    eventType
    ts
    data
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateGamificationEventSubscriptionVariables,
  APITypes.OnUpdateGamificationEventSubscription
>;
export const onDeleteGamificationEvent = /* GraphQL */ `subscription OnDeleteGamificationEvent(
  $filter: ModelSubscriptionGamificationEventFilterInput
  $userID: String
) {
  onDeleteGamificationEvent(filter: $filter, userID: $userID) {
    id
    userID
    racimoID
    eventType
    ts
    data
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteGamificationEventSubscriptionVariables,
  APITypes.OnDeleteGamificationEventSubscription
>;
export const onCreateAppUsageEvent = /* GraphQL */ `subscription OnCreateAppUsageEvent(
  $filter: ModelSubscriptionAppUsageEventFilterInput
  $userID: String
) {
  onCreateAppUsageEvent(filter: $filter, userID: $userID) {
    id
    userID
    racimoID
    sessionID
    screenName
    ts
    action
    duration
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateAppUsageEventSubscriptionVariables,
  APITypes.OnCreateAppUsageEventSubscription
>;
export const onUpdateAppUsageEvent = /* GraphQL */ `subscription OnUpdateAppUsageEvent(
  $filter: ModelSubscriptionAppUsageEventFilterInput
  $userID: String
) {
  onUpdateAppUsageEvent(filter: $filter, userID: $userID) {
    id
    userID
    racimoID
    sessionID
    screenName
    ts
    action
    duration
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateAppUsageEventSubscriptionVariables,
  APITypes.OnUpdateAppUsageEventSubscription
>;
export const onDeleteAppUsageEvent = /* GraphQL */ `subscription OnDeleteAppUsageEvent(
  $filter: ModelSubscriptionAppUsageEventFilterInput
  $userID: String
) {
  onDeleteAppUsageEvent(filter: $filter, userID: $userID) {
    id
    userID
    racimoID
    sessionID
    screenName
    ts
    action
    duration
    createdAt
    updatedAt
    _version
    _deleted
    _lastChangedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteAppUsageEventSubscriptionVariables,
  APITypes.OnDeleteAppUsageEventSubscription
>;
export const onCreateUser = /* GraphQL */ `subscription OnCreateUser(
  $filter: ModelSubscriptionUserFilterInput
  $id: String
) {
  onCreateUser(filter: $filter, id: $id) {
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
    GamificationEvents {
      nextToken
      startedAt
      __typename
    }
    AppUsageEvents {
      nextToken
      startedAt
      __typename
    }
    uvaID
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
export const onUpdateUser = /* GraphQL */ `subscription OnUpdateUser(
  $filter: ModelSubscriptionUserFilterInput
  $id: String
) {
  onUpdateUser(filter: $filter, id: $id) {
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
    GamificationEvents {
      nextToken
      startedAt
      __typename
    }
    AppUsageEvents {
      nextToken
      startedAt
      __typename
    }
    uvaID
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
export const onDeleteUser = /* GraphQL */ `subscription OnDeleteUser(
  $filter: ModelSubscriptionUserFilterInput
  $id: String
) {
  onDeleteUser(filter: $filter, id: $id) {
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
    GamificationEvents {
      nextToken
      startedAt
      __typename
    }
    AppUsageEvents {
      nextToken
      startedAt
      __typename
    }
    uvaID
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
export const onCreateUVA = /* GraphQL */ `subscription OnCreateUVA(
  $filter: ModelSubscriptionUVAFilterInput
  $userID: String
) {
  onCreateUVA(filter: $filter, userID: $userID) {
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
      uvaID
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
export const onUpdateUVA = /* GraphQL */ `subscription OnUpdateUVA(
  $filter: ModelSubscriptionUVAFilterInput
  $userID: String
) {
  onUpdateUVA(filter: $filter, userID: $userID) {
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
      uvaID
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
export const onDeleteUVA = /* GraphQL */ `subscription OnDeleteUVA(
  $filter: ModelSubscriptionUVAFilterInput
  $userID: String
) {
  onDeleteUVA(filter: $filter, userID: $userID) {
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
      uvaID
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
