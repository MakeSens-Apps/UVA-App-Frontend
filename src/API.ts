/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateRACIMOInput = {
  id?: string | null;
  Name: string;
  LinkageCode: string;
  Configuration?: string | null;
  _version?: number | null;
};

export type ModelRACIMOConditionInput = {
  Name?: ModelStringInput | null;
  LinkageCode?: ModelStringInput | null;
  Configuration?: ModelStringInput | null;
  and?: Array<ModelRACIMOConditionInput | null> | null;
  or?: Array<ModelRACIMOConditionInput | null> | null;
  not?: ModelRACIMOConditionInput | null;
  _deleted?: ModelBooleanInput | null;
  createdAt?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelStringInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  size?: ModelSizeInput | null;
};

export enum ModelAttributeTypes {
  binary = 'binary',
  binarySet = 'binarySet',
  bool = 'bool',
  list = 'list',
  map = 'map',
  number = 'number',
  numberSet = 'numberSet',
  string = 'string',
  stringSet = 'stringSet',
  _null = '_null',
}

export type ModelSizeInput = {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  between?: Array<number | null> | null;
};

export type ModelBooleanInput = {
  ne?: boolean | null;
  eq?: boolean | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
};

export type RACIMO = {
  __typename: 'RACIMO';
  id: string;
  Name: string;
  LinkageCode: string;
  Configuration?: string | null;
  UVAs?: ModelUVAConnection | null;
  createdAt: string;
  updatedAt: string;
  _version: number;
  _deleted?: boolean | null;
  _lastChangedAt: number;
};

export type ModelUVAConnection = {
  __typename: 'ModelUVAConnection';
  items: Array<UVA | null>;
  nextToken?: string | null;
  startedAt?: number | null;
};

export type UVA = {
  __typename: 'UVA';
  id: string;
  latitude?: string | null;
  longitude?: string | null;
  altitude?: string | null;
  fields?: string | null;
  enabled?: boolean | null;
  createdAt?: string | null;
  userID: string;
  User: User;
  Measurements?: ModelMeasurementConnection | null;
  racimoID: string;
  updatedAt: string;
  _version: number;
  _deleted?: boolean | null;
  _lastChangedAt: number;
};

export type User = {
  __typename: 'User';
  id: string;
  Name: string;
  LastName: string;
  PhoneNumber: string;
  Email?: string | null;
  Rank?: string | null;
  UserProgresses?: ModelUserProgressConnection | null;
  UVA?: UVA | null;
  createdAt: string;
  updatedAt: string;
  _version: number;
  _deleted?: boolean | null;
  _lastChangedAt: number;
};

export type ModelUserProgressConnection = {
  __typename: 'ModelUserProgressConnection';
  items: Array<UserProgress | null>;
  nextToken?: string | null;
  startedAt?: number | null;
};

export type UserProgress = {
  __typename: 'UserProgress';
  id: string;
  ts: string;
  Seed?: number | null;
  Streak?: number | null;
  Milestones?: string | null;
  completedTasks?: number | null;
  userID: string;
  createdAt: string;
  updatedAt: string;
  _version: number;
  _deleted?: boolean | null;
  _lastChangedAt: number;
};

export type ModelMeasurementConnection = {
  __typename: 'ModelMeasurementConnection';
  items: Array<Measurement | null>;
  nextToken?: string | null;
  startedAt?: number | null;
};

export type Measurement = {
  __typename: 'Measurement';
  id: string;
  type: string;
  data?: string | null;
  logs?: string | null;
  ts: string;
  ts_sync?: string | null;
  uvaID: string;
  createdAt: string;
  updatedAt: string;
  _version: number;
  _deleted?: boolean | null;
  _lastChangedAt: number;
};

export type UpdateRACIMOInput = {
  id: string;
  Name?: string | null;
  LinkageCode?: string | null;
  Configuration?: string | null;
  _version?: number | null;
};

export type DeleteRACIMOInput = {
  id: string;
  _version?: number | null;
};

export type CreateMeasurementInput = {
  id?: string | null;
  type: string;
  data?: string | null;
  logs?: string | null;
  ts: string;
  ts_sync?: string | null;
  uvaID: string;
  _version?: number | null;
};

export type ModelMeasurementConditionInput = {
  type?: ModelStringInput | null;
  data?: ModelStringInput | null;
  logs?: ModelStringInput | null;
  ts?: ModelStringInput | null;
  ts_sync?: ModelStringInput | null;
  uvaID?: ModelIDInput | null;
  and?: Array<ModelMeasurementConditionInput | null> | null;
  or?: Array<ModelMeasurementConditionInput | null> | null;
  not?: ModelMeasurementConditionInput | null;
  _deleted?: ModelBooleanInput | null;
  createdAt?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelIDInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  size?: ModelSizeInput | null;
};

export type UpdateMeasurementInput = {
  id: string;
  type?: string | null;
  data?: string | null;
  logs?: string | null;
  ts?: string | null;
  ts_sync?: string | null;
  uvaID?: string | null;
  _version?: number | null;
};

export type DeleteMeasurementInput = {
  id: string;
  _version?: number | null;
};

export type CreateUserProgressInput = {
  id?: string | null;
  ts: string;
  Seed?: number | null;
  Streak?: number | null;
  Milestones?: string | null;
  completedTasks?: number | null;
  userID: string;
  _version?: number | null;
};

export type ModelUserProgressConditionInput = {
  ts?: ModelStringInput | null;
  Seed?: ModelIntInput | null;
  Streak?: ModelIntInput | null;
  Milestones?: ModelStringInput | null;
  completedTasks?: ModelIntInput | null;
  userID?: ModelIDInput | null;
  and?: Array<ModelUserProgressConditionInput | null> | null;
  or?: Array<ModelUserProgressConditionInput | null> | null;
  not?: ModelUserProgressConditionInput | null;
  _deleted?: ModelBooleanInput | null;
  createdAt?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelIntInput = {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  between?: Array<number | null> | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
};

export type UpdateUserProgressInput = {
  id: string;
  ts?: string | null;
  Seed?: number | null;
  Streak?: number | null;
  Milestones?: string | null;
  completedTasks?: number | null;
  userID?: string | null;
  _version?: number | null;
};

export type DeleteUserProgressInput = {
  id: string;
  _version?: number | null;
};

export type CreateUserInput = {
  id?: string | null;
  Name: string;
  LastName: string;
  PhoneNumber: string;
  Email?: string | null;
  Rank?: string | null;
  _version?: number | null;
};

export type ModelUserConditionInput = {
  Name?: ModelStringInput | null;
  LastName?: ModelStringInput | null;
  PhoneNumber?: ModelStringInput | null;
  Email?: ModelStringInput | null;
  Rank?: ModelStringInput | null;
  and?: Array<ModelUserConditionInput | null> | null;
  or?: Array<ModelUserConditionInput | null> | null;
  not?: ModelUserConditionInput | null;
  _deleted?: ModelBooleanInput | null;
  createdAt?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type UpdateUserInput = {
  id: string;
  Name?: string | null;
  LastName?: string | null;
  PhoneNumber?: string | null;
  Email?: string | null;
  Rank?: string | null;
  _version?: number | null;
};

export type DeleteUserInput = {
  id: string;
  _version?: number | null;
};

export type CreateUVAInput = {
  id?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  altitude?: string | null;
  fields?: string | null;
  enabled?: boolean | null;
  createdAt?: string | null;
  userID: string;
  racimoID: string;
  _version?: number | null;
};

export type ModelUVAConditionInput = {
  latitude?: ModelStringInput | null;
  longitude?: ModelStringInput | null;
  altitude?: ModelStringInput | null;
  fields?: ModelStringInput | null;
  enabled?: ModelBooleanInput | null;
  createdAt?: ModelStringInput | null;
  userID?: ModelIDInput | null;
  racimoID?: ModelIDInput | null;
  and?: Array<ModelUVAConditionInput | null> | null;
  or?: Array<ModelUVAConditionInput | null> | null;
  not?: ModelUVAConditionInput | null;
  _deleted?: ModelBooleanInput | null;
  updatedAt?: ModelStringInput | null;
};

export type UpdateUVAInput = {
  id: string;
  latitude?: string | null;
  longitude?: string | null;
  altitude?: string | null;
  fields?: string | null;
  enabled?: boolean | null;
  createdAt?: string | null;
  userID?: string | null;
  racimoID?: string | null;
  _version?: number | null;
};

export type DeleteUVAInput = {
  id: string;
  _version?: number | null;
};

export type ModelRACIMOFilterInput = {
  id?: ModelIDInput | null;
  Name?: ModelStringInput | null;
  LinkageCode?: ModelStringInput | null;
  Configuration?: ModelStringInput | null;
  createdAt?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
  and?: Array<ModelRACIMOFilterInput | null> | null;
  or?: Array<ModelRACIMOFilterInput | null> | null;
  not?: ModelRACIMOFilterInput | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelRACIMOConnection = {
  __typename: 'ModelRACIMOConnection';
  items: Array<RACIMO | null>;
  nextToken?: string | null;
  startedAt?: number | null;
};

export type ModelMeasurementFilterInput = {
  id?: ModelIDInput | null;
  type?: ModelStringInput | null;
  data?: ModelStringInput | null;
  logs?: ModelStringInput | null;
  ts?: ModelStringInput | null;
  ts_sync?: ModelStringInput | null;
  uvaID?: ModelIDInput | null;
  createdAt?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
  and?: Array<ModelMeasurementFilterInput | null> | null;
  or?: Array<ModelMeasurementFilterInput | null> | null;
  not?: ModelMeasurementFilterInput | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelStringKeyConditionInput = {
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
};

export enum ModelSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type ModelUserProgressFilterInput = {
  id?: ModelIDInput | null;
  ts?: ModelStringInput | null;
  Seed?: ModelIntInput | null;
  Streak?: ModelIntInput | null;
  Milestones?: ModelStringInput | null;
  completedTasks?: ModelIntInput | null;
  userID?: ModelIDInput | null;
  createdAt?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
  and?: Array<ModelUserProgressFilterInput | null> | null;
  or?: Array<ModelUserProgressFilterInput | null> | null;
  not?: ModelUserProgressFilterInput | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelUserFilterInput = {
  id?: ModelIDInput | null;
  Name?: ModelStringInput | null;
  LastName?: ModelStringInput | null;
  PhoneNumber?: ModelStringInput | null;
  Email?: ModelStringInput | null;
  Rank?: ModelStringInput | null;
  createdAt?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
  and?: Array<ModelUserFilterInput | null> | null;
  or?: Array<ModelUserFilterInput | null> | null;
  not?: ModelUserFilterInput | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelUserConnection = {
  __typename: 'ModelUserConnection';
  items: Array<User | null>;
  nextToken?: string | null;
  startedAt?: number | null;
};

export type ModelUVAFilterInput = {
  id?: ModelIDInput | null;
  latitude?: ModelStringInput | null;
  longitude?: ModelStringInput | null;
  altitude?: ModelStringInput | null;
  fields?: ModelStringInput | null;
  enabled?: ModelBooleanInput | null;
  createdAt?: ModelStringInput | null;
  userID?: ModelIDInput | null;
  racimoID?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
  and?: Array<ModelUVAFilterInput | null> | null;
  or?: Array<ModelUVAFilterInput | null> | null;
  not?: ModelUVAFilterInput | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelSubscriptionRACIMOFilterInput = {
  id?: ModelSubscriptionIDInput | null;
  Name?: ModelSubscriptionStringInput | null;
  LinkageCode?: ModelSubscriptionStringInput | null;
  Configuration?: ModelSubscriptionStringInput | null;
  createdAt?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionRACIMOFilterInput | null> | null;
  or?: Array<ModelSubscriptionRACIMOFilterInput | null> | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelSubscriptionIDInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  in?: Array<string | null> | null;
  notIn?: Array<string | null> | null;
};

export type ModelSubscriptionStringInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  in?: Array<string | null> | null;
  notIn?: Array<string | null> | null;
};

export type ModelSubscriptionMeasurementFilterInput = {
  id?: ModelSubscriptionIDInput | null;
  type?: ModelSubscriptionStringInput | null;
  data?: ModelSubscriptionStringInput | null;
  logs?: ModelSubscriptionStringInput | null;
  ts?: ModelSubscriptionStringInput | null;
  ts_sync?: ModelSubscriptionStringInput | null;
  uvaID?: ModelSubscriptionIDInput | null;
  createdAt?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionMeasurementFilterInput | null> | null;
  or?: Array<ModelSubscriptionMeasurementFilterInput | null> | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelSubscriptionUserProgressFilterInput = {
  id?: ModelSubscriptionIDInput | null;
  ts?: ModelSubscriptionStringInput | null;
  Seed?: ModelSubscriptionIntInput | null;
  Streak?: ModelSubscriptionIntInput | null;
  Milestones?: ModelSubscriptionStringInput | null;
  completedTasks?: ModelSubscriptionIntInput | null;
  userID?: ModelSubscriptionIDInput | null;
  createdAt?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionUserProgressFilterInput | null> | null;
  or?: Array<ModelSubscriptionUserProgressFilterInput | null> | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelSubscriptionIntInput = {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  between?: Array<number | null> | null;
  in?: Array<number | null> | null;
  notIn?: Array<number | null> | null;
};

export type ModelSubscriptionUserFilterInput = {
  id?: ModelSubscriptionIDInput | null;
  Name?: ModelSubscriptionStringInput | null;
  LastName?: ModelSubscriptionStringInput | null;
  PhoneNumber?: ModelSubscriptionStringInput | null;
  Email?: ModelSubscriptionStringInput | null;
  Rank?: ModelSubscriptionStringInput | null;
  createdAt?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionUserFilterInput | null> | null;
  or?: Array<ModelSubscriptionUserFilterInput | null> | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelSubscriptionUVAFilterInput = {
  id?: ModelSubscriptionIDInput | null;
  latitude?: ModelSubscriptionStringInput | null;
  longitude?: ModelSubscriptionStringInput | null;
  altitude?: ModelSubscriptionStringInput | null;
  fields?: ModelSubscriptionStringInput | null;
  enabled?: ModelSubscriptionBooleanInput | null;
  createdAt?: ModelSubscriptionStringInput | null;
  userID?: ModelSubscriptionIDInput | null;
  racimoID?: ModelSubscriptionIDInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionUVAFilterInput | null> | null;
  or?: Array<ModelSubscriptionUVAFilterInput | null> | null;
  _deleted?: ModelBooleanInput | null;
};

export type ModelSubscriptionBooleanInput = {
  ne?: boolean | null;
  eq?: boolean | null;
};

export type CreateRACIMOMutationVariables = {
  input: CreateRACIMOInput;
  condition?: ModelRACIMOConditionInput | null;
};

export type CreateRACIMOMutation = {
  createRACIMO?: {
    __typename: 'RACIMO';
    id: string;
    Name: string;
    LinkageCode: string;
    Configuration?: string | null;
    UVAs?: {
      __typename: 'ModelUVAConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type UpdateRACIMOMutationVariables = {
  input: UpdateRACIMOInput;
  condition?: ModelRACIMOConditionInput | null;
};

export type UpdateRACIMOMutation = {
  updateRACIMO?: {
    __typename: 'RACIMO';
    id: string;
    Name: string;
    LinkageCode: string;
    Configuration?: string | null;
    UVAs?: {
      __typename: 'ModelUVAConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type DeleteRACIMOMutationVariables = {
  input: DeleteRACIMOInput;
  condition?: ModelRACIMOConditionInput | null;
};

export type DeleteRACIMOMutation = {
  deleteRACIMO?: {
    __typename: 'RACIMO';
    id: string;
    Name: string;
    LinkageCode: string;
    Configuration?: string | null;
    UVAs?: {
      __typename: 'ModelUVAConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type CreateMeasurementMutationVariables = {
  input: CreateMeasurementInput;
  condition?: ModelMeasurementConditionInput | null;
};

export type CreateMeasurementMutation = {
  createMeasurement?: {
    __typename: 'Measurement';
    id: string;
    type: string;
    data?: string | null;
    logs?: string | null;
    ts: string;
    ts_sync?: string | null;
    uvaID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type UpdateMeasurementMutationVariables = {
  input: UpdateMeasurementInput;
  condition?: ModelMeasurementConditionInput | null;
};

export type UpdateMeasurementMutation = {
  updateMeasurement?: {
    __typename: 'Measurement';
    id: string;
    type: string;
    data?: string | null;
    logs?: string | null;
    ts: string;
    ts_sync?: string | null;
    uvaID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type DeleteMeasurementMutationVariables = {
  input: DeleteMeasurementInput;
  condition?: ModelMeasurementConditionInput | null;
};

export type DeleteMeasurementMutation = {
  deleteMeasurement?: {
    __typename: 'Measurement';
    id: string;
    type: string;
    data?: string | null;
    logs?: string | null;
    ts: string;
    ts_sync?: string | null;
    uvaID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type CreateUserProgressMutationVariables = {
  input: CreateUserProgressInput;
  condition?: ModelUserProgressConditionInput | null;
};

export type CreateUserProgressMutation = {
  createUserProgress?: {
    __typename: 'UserProgress';
    id: string;
    ts: string;
    Seed?: number | null;
    Streak?: number | null;
    Milestones?: string | null;
    completedTasks?: number | null;
    userID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type UpdateUserProgressMutationVariables = {
  input: UpdateUserProgressInput;
  condition?: ModelUserProgressConditionInput | null;
};

export type UpdateUserProgressMutation = {
  updateUserProgress?: {
    __typename: 'UserProgress';
    id: string;
    ts: string;
    Seed?: number | null;
    Streak?: number | null;
    Milestones?: string | null;
    completedTasks?: number | null;
    userID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type DeleteUserProgressMutationVariables = {
  input: DeleteUserProgressInput;
  condition?: ModelUserProgressConditionInput | null;
};

export type DeleteUserProgressMutation = {
  deleteUserProgress?: {
    __typename: 'UserProgress';
    id: string;
    ts: string;
    Seed?: number | null;
    Streak?: number | null;
    Milestones?: string | null;
    completedTasks?: number | null;
    userID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type CreateUserMutationVariables = {
  input: CreateUserInput;
  condition?: ModelUserConditionInput | null;
};

export type CreateUserMutation = {
  createUser?: {
    __typename: 'User';
    id: string;
    Name: string;
    LastName: string;
    PhoneNumber: string;
    Email?: string | null;
    Rank?: string | null;
    UserProgresses?: {
      __typename: 'ModelUserProgressConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    UVA?: {
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type UpdateUserMutationVariables = {
  input: UpdateUserInput;
  condition?: ModelUserConditionInput | null;
};

export type UpdateUserMutation = {
  updateUser?: {
    __typename: 'User';
    id: string;
    Name: string;
    LastName: string;
    PhoneNumber: string;
    Email?: string | null;
    Rank?: string | null;
    UserProgresses?: {
      __typename: 'ModelUserProgressConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    UVA?: {
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type DeleteUserMutationVariables = {
  input: DeleteUserInput;
  condition?: ModelUserConditionInput | null;
};

export type DeleteUserMutation = {
  deleteUser?: {
    __typename: 'User';
    id: string;
    Name: string;
    LastName: string;
    PhoneNumber: string;
    Email?: string | null;
    Rank?: string | null;
    UserProgresses?: {
      __typename: 'ModelUserProgressConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    UVA?: {
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type CreateUVAMutationVariables = {
  input: CreateUVAInput;
  condition?: ModelUVAConditionInput | null;
};

export type CreateUVAMutation = {
  createUVA?: {
    __typename: 'UVA';
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    altitude?: string | null;
    fields?: string | null;
    enabled?: boolean | null;
    createdAt?: string | null;
    userID: string;
    User: {
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    };
    Measurements?: {
      __typename: 'ModelMeasurementConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    racimoID: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type UpdateUVAMutationVariables = {
  input: UpdateUVAInput;
  condition?: ModelUVAConditionInput | null;
};

export type UpdateUVAMutation = {
  updateUVA?: {
    __typename: 'UVA';
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    altitude?: string | null;
    fields?: string | null;
    enabled?: boolean | null;
    createdAt?: string | null;
    userID: string;
    User: {
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    };
    Measurements?: {
      __typename: 'ModelMeasurementConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    racimoID: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type DeleteUVAMutationVariables = {
  input: DeleteUVAInput;
  condition?: ModelUVAConditionInput | null;
};

export type DeleteUVAMutation = {
  deleteUVA?: {
    __typename: 'UVA';
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    altitude?: string | null;
    fields?: string | null;
    enabled?: boolean | null;
    createdAt?: string | null;
    userID: string;
    User: {
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    };
    Measurements?: {
      __typename: 'ModelMeasurementConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    racimoID: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type GetMoonPhaseQueryVariables = {
  year: number;
  month: number;
};

export type GetMoonPhaseQuery = {
  getMoonPhase?: string | null;
};

export type GetRACIMOQueryVariables = {
  id: string;
};

export type GetRACIMOQuery = {
  getRACIMO?: {
    __typename: 'RACIMO';
    id: string;
    Name: string;
    LinkageCode: string;
    Configuration?: string | null;
    UVAs?: {
      __typename: 'ModelUVAConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type ListRACIMOSQueryVariables = {
  filter?: ModelRACIMOFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListRACIMOSQuery = {
  listRACIMOS?: {
    __typename: 'ModelRACIMOConnection';
    items: Array<{
      __typename: 'RACIMO';
      id: string;
      Name: string;
      LinkageCode: string;
      Configuration?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type SyncRACIMOSQueryVariables = {
  filter?: ModelRACIMOFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
  lastSync?: number | null;
};

export type SyncRACIMOSQuery = {
  syncRACIMOS?: {
    __typename: 'ModelRACIMOConnection';
    items: Array<{
      __typename: 'RACIMO';
      id: string;
      Name: string;
      LinkageCode: string;
      Configuration?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type GetMeasurementQueryVariables = {
  id: string;
};

export type GetMeasurementQuery = {
  getMeasurement?: {
    __typename: 'Measurement';
    id: string;
    type: string;
    data?: string | null;
    logs?: string | null;
    ts: string;
    ts_sync?: string | null;
    uvaID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type ListMeasurementsQueryVariables = {
  filter?: ModelMeasurementFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListMeasurementsQuery = {
  listMeasurements?: {
    __typename: 'ModelMeasurementConnection';
    items: Array<{
      __typename: 'Measurement';
      id: string;
      type: string;
      data?: string | null;
      logs?: string | null;
      ts: string;
      ts_sync?: string | null;
      uvaID: string;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type SyncMeasurementsQueryVariables = {
  filter?: ModelMeasurementFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
  lastSync?: number | null;
};

export type SyncMeasurementsQuery = {
  syncMeasurements?: {
    __typename: 'ModelMeasurementConnection';
    items: Array<{
      __typename: 'Measurement';
      id: string;
      type: string;
      data?: string | null;
      logs?: string | null;
      ts: string;
      ts_sync?: string | null;
      uvaID: string;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type MeasurementsByUvaIDAndTsQueryVariables = {
  uvaID: string;
  ts?: ModelStringKeyConditionInput | null;
  sortDirection?: ModelSortDirection | null;
  filter?: ModelMeasurementFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type MeasurementsByUvaIDAndTsQuery = {
  measurementsByUvaIDAndTs?: {
    __typename: 'ModelMeasurementConnection';
    items: Array<{
      __typename: 'Measurement';
      id: string;
      type: string;
      data?: string | null;
      logs?: string | null;
      ts: string;
      ts_sync?: string | null;
      uvaID: string;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type GetUserProgressQueryVariables = {
  id: string;
};

export type GetUserProgressQuery = {
  getUserProgress?: {
    __typename: 'UserProgress';
    id: string;
    ts: string;
    Seed?: number | null;
    Streak?: number | null;
    Milestones?: string | null;
    completedTasks?: number | null;
    userID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type ListUserProgressesQueryVariables = {
  filter?: ModelUserProgressFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListUserProgressesQuery = {
  listUserProgresses?: {
    __typename: 'ModelUserProgressConnection';
    items: Array<{
      __typename: 'UserProgress';
      id: string;
      ts: string;
      Seed?: number | null;
      Streak?: number | null;
      Milestones?: string | null;
      completedTasks?: number | null;
      userID: string;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type SyncUserProgressesQueryVariables = {
  filter?: ModelUserProgressFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
  lastSync?: number | null;
};

export type SyncUserProgressesQuery = {
  syncUserProgresses?: {
    __typename: 'ModelUserProgressConnection';
    items: Array<{
      __typename: 'UserProgress';
      id: string;
      ts: string;
      Seed?: number | null;
      Streak?: number | null;
      Milestones?: string | null;
      completedTasks?: number | null;
      userID: string;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type UserProgressesByUserIDAndTsQueryVariables = {
  userID: string;
  ts?: ModelStringKeyConditionInput | null;
  sortDirection?: ModelSortDirection | null;
  filter?: ModelUserProgressFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type UserProgressesByUserIDAndTsQuery = {
  userProgressesByUserIDAndTs?: {
    __typename: 'ModelUserProgressConnection';
    items: Array<{
      __typename: 'UserProgress';
      id: string;
      ts: string;
      Seed?: number | null;
      Streak?: number | null;
      Milestones?: string | null;
      completedTasks?: number | null;
      userID: string;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type GetUserQueryVariables = {
  id: string;
};

export type GetUserQuery = {
  getUser?: {
    __typename: 'User';
    id: string;
    Name: string;
    LastName: string;
    PhoneNumber: string;
    Email?: string | null;
    Rank?: string | null;
    UserProgresses?: {
      __typename: 'ModelUserProgressConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    UVA?: {
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type ListUsersQueryVariables = {
  filter?: ModelUserFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListUsersQuery = {
  listUsers?: {
    __typename: 'ModelUserConnection';
    items: Array<{
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type SyncUsersQueryVariables = {
  filter?: ModelUserFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
  lastSync?: number | null;
};

export type SyncUsersQuery = {
  syncUsers?: {
    __typename: 'ModelUserConnection';
    items: Array<{
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type GetUVAQueryVariables = {
  id: string;
};

export type GetUVAQuery = {
  getUVA?: {
    __typename: 'UVA';
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    altitude?: string | null;
    fields?: string | null;
    enabled?: boolean | null;
    createdAt?: string | null;
    userID: string;
    User: {
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    };
    Measurements?: {
      __typename: 'ModelMeasurementConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    racimoID: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type ListUVASQueryVariables = {
  filter?: ModelUVAFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListUVASQuery = {
  listUVAS?: {
    __typename: 'ModelUVAConnection';
    items: Array<{
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type SyncUVASQueryVariables = {
  filter?: ModelUVAFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
  lastSync?: number | null;
};

export type SyncUVASQuery = {
  syncUVAS?: {
    __typename: 'ModelUVAConnection';
    items: Array<{
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type UVAbyUserIDQueryVariables = {
  userID: string;
  sortDirection?: ModelSortDirection | null;
  filter?: ModelUVAFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type UVAbyUserIDQuery = {
  UVAbyUserID?: {
    __typename: 'ModelUVAConnection';
    items: Array<{
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type UVAsByRacimoIDQueryVariables = {
  racimoID: string;
  createdAt?: ModelStringKeyConditionInput | null;
  sortDirection?: ModelSortDirection | null;
  filter?: ModelUVAFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type UVAsByRacimoIDQuery = {
  UVAsByRacimoID?: {
    __typename: 'ModelUVAConnection';
    items: Array<{
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null>;
    nextToken?: string | null;
    startedAt?: number | null;
  } | null;
};

export type OnCreateRACIMOSubscriptionVariables = {
  filter?: ModelSubscriptionRACIMOFilterInput | null;
};

export type OnCreateRACIMOSubscription = {
  onCreateRACIMO?: {
    __typename: 'RACIMO';
    id: string;
    Name: string;
    LinkageCode: string;
    Configuration?: string | null;
    UVAs?: {
      __typename: 'ModelUVAConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnUpdateRACIMOSubscriptionVariables = {
  filter?: ModelSubscriptionRACIMOFilterInput | null;
};

export type OnUpdateRACIMOSubscription = {
  onUpdateRACIMO?: {
    __typename: 'RACIMO';
    id: string;
    Name: string;
    LinkageCode: string;
    Configuration?: string | null;
    UVAs?: {
      __typename: 'ModelUVAConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnDeleteRACIMOSubscriptionVariables = {
  filter?: ModelSubscriptionRACIMOFilterInput | null;
};

export type OnDeleteRACIMOSubscription = {
  onDeleteRACIMO?: {
    __typename: 'RACIMO';
    id: string;
    Name: string;
    LinkageCode: string;
    Configuration?: string | null;
    UVAs?: {
      __typename: 'ModelUVAConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnCreateMeasurementSubscriptionVariables = {
  filter?: ModelSubscriptionMeasurementFilterInput | null;
};

export type OnCreateMeasurementSubscription = {
  onCreateMeasurement?: {
    __typename: 'Measurement';
    id: string;
    type: string;
    data?: string | null;
    logs?: string | null;
    ts: string;
    ts_sync?: string | null;
    uvaID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnUpdateMeasurementSubscriptionVariables = {
  filter?: ModelSubscriptionMeasurementFilterInput | null;
};

export type OnUpdateMeasurementSubscription = {
  onUpdateMeasurement?: {
    __typename: 'Measurement';
    id: string;
    type: string;
    data?: string | null;
    logs?: string | null;
    ts: string;
    ts_sync?: string | null;
    uvaID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnDeleteMeasurementSubscriptionVariables = {
  filter?: ModelSubscriptionMeasurementFilterInput | null;
};

export type OnDeleteMeasurementSubscription = {
  onDeleteMeasurement?: {
    __typename: 'Measurement';
    id: string;
    type: string;
    data?: string | null;
    logs?: string | null;
    ts: string;
    ts_sync?: string | null;
    uvaID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnCreateUserProgressSubscriptionVariables = {
  filter?: ModelSubscriptionUserProgressFilterInput | null;
};

export type OnCreateUserProgressSubscription = {
  onCreateUserProgress?: {
    __typename: 'UserProgress';
    id: string;
    ts: string;
    Seed?: number | null;
    Streak?: number | null;
    Milestones?: string | null;
    completedTasks?: number | null;
    userID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnUpdateUserProgressSubscriptionVariables = {
  filter?: ModelSubscriptionUserProgressFilterInput | null;
};

export type OnUpdateUserProgressSubscription = {
  onUpdateUserProgress?: {
    __typename: 'UserProgress';
    id: string;
    ts: string;
    Seed?: number | null;
    Streak?: number | null;
    Milestones?: string | null;
    completedTasks?: number | null;
    userID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnDeleteUserProgressSubscriptionVariables = {
  filter?: ModelSubscriptionUserProgressFilterInput | null;
};

export type OnDeleteUserProgressSubscription = {
  onDeleteUserProgress?: {
    __typename: 'UserProgress';
    id: string;
    ts: string;
    Seed?: number | null;
    Streak?: number | null;
    Milestones?: string | null;
    completedTasks?: number | null;
    userID: string;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnCreateUserSubscriptionVariables = {
  filter?: ModelSubscriptionUserFilterInput | null;
};

export type OnCreateUserSubscription = {
  onCreateUser?: {
    __typename: 'User';
    id: string;
    Name: string;
    LastName: string;
    PhoneNumber: string;
    Email?: string | null;
    Rank?: string | null;
    UserProgresses?: {
      __typename: 'ModelUserProgressConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    UVA?: {
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnUpdateUserSubscriptionVariables = {
  filter?: ModelSubscriptionUserFilterInput | null;
};

export type OnUpdateUserSubscription = {
  onUpdateUser?: {
    __typename: 'User';
    id: string;
    Name: string;
    LastName: string;
    PhoneNumber: string;
    Email?: string | null;
    Rank?: string | null;
    UserProgresses?: {
      __typename: 'ModelUserProgressConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    UVA?: {
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnDeleteUserSubscriptionVariables = {
  filter?: ModelSubscriptionUserFilterInput | null;
};

export type OnDeleteUserSubscription = {
  onDeleteUser?: {
    __typename: 'User';
    id: string;
    Name: string;
    LastName: string;
    PhoneNumber: string;
    Email?: string | null;
    Rank?: string | null;
    UserProgresses?: {
      __typename: 'ModelUserProgressConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    UVA?: {
      __typename: 'UVA';
      id: string;
      latitude?: string | null;
      longitude?: string | null;
      altitude?: string | null;
      fields?: string | null;
      enabled?: boolean | null;
      createdAt?: string | null;
      userID: string;
      racimoID: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    } | null;
    createdAt: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnCreateUVASubscriptionVariables = {
  filter?: ModelSubscriptionUVAFilterInput | null;
};

export type OnCreateUVASubscription = {
  onCreateUVA?: {
    __typename: 'UVA';
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    altitude?: string | null;
    fields?: string | null;
    enabled?: boolean | null;
    createdAt?: string | null;
    userID: string;
    User: {
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    };
    Measurements?: {
      __typename: 'ModelMeasurementConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    racimoID: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnUpdateUVASubscriptionVariables = {
  filter?: ModelSubscriptionUVAFilterInput | null;
};

export type OnUpdateUVASubscription = {
  onUpdateUVA?: {
    __typename: 'UVA';
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    altitude?: string | null;
    fields?: string | null;
    enabled?: boolean | null;
    createdAt?: string | null;
    userID: string;
    User: {
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    };
    Measurements?: {
      __typename: 'ModelMeasurementConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    racimoID: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};

export type OnDeleteUVASubscriptionVariables = {
  filter?: ModelSubscriptionUVAFilterInput | null;
};

export type OnDeleteUVASubscription = {
  onDeleteUVA?: {
    __typename: 'UVA';
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    altitude?: string | null;
    fields?: string | null;
    enabled?: boolean | null;
    createdAt?: string | null;
    userID: string;
    User: {
      __typename: 'User';
      id: string;
      Name: string;
      LastName: string;
      PhoneNumber: string;
      Email?: string | null;
      Rank?: string | null;
      createdAt: string;
      updatedAt: string;
      _version: number;
      _deleted?: boolean | null;
      _lastChangedAt: number;
    };
    Measurements?: {
      __typename: 'ModelMeasurementConnection';
      nextToken?: string | null;
      startedAt?: number | null;
    } | null;
    racimoID: string;
    updatedAt: string;
    _version: number;
    _deleted?: boolean | null;
    _lastChangedAt: number;
  } | null;
};
