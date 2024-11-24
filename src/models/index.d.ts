import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled, AsyncCollection, AsyncItem } from "@aws-amplify/datastore";





type EagerRACIMO = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<RACIMO, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly Name: string;
  readonly LinkageCode: string;
  readonly Configuration?: string | null;
  readonly UVAs?: (UVA | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyRACIMO = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<RACIMO, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly Name: string;
  readonly LinkageCode: string;
  readonly Configuration?: string | null;
  readonly UVAs: AsyncCollection<UVA>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type RACIMO = LazyLoading extends LazyLoadingDisabled ? EagerRACIMO : LazyRACIMO

export declare const RACIMO: (new (init: ModelInit<RACIMO>) => RACIMO) & {
  copyOf(source: RACIMO, mutator: (draft: MutableModel<RACIMO>) => MutableModel<RACIMO> | void): RACIMO;
}

type EagerMeasurement = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Measurement, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly type: string;
  readonly data?: string | null;
  readonly logs?: string | null;
  readonly ts: string;
  readonly task?: string | null;
  readonly uvaID: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyMeasurement = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Measurement, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly type: string;
  readonly data?: string | null;
  readonly logs?: string | null;
  readonly ts: string;
  readonly task?: string | null;
  readonly uvaID: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Measurement = LazyLoading extends LazyLoadingDisabled ? EagerMeasurement : LazyMeasurement

export declare const Measurement: (new (init: ModelInit<Measurement>) => Measurement) & {
  copyOf(source: Measurement, mutator: (draft: MutableModel<Measurement>) => MutableModel<Measurement> | void): Measurement;
}

type EagerUserProgress = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserProgress, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly ts: string;
  readonly Seed?: number | null;
  readonly Streak?: number | null;
  readonly Milestones?: string | null;
  readonly completedTasks?: number | null;
  readonly userID: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserProgress = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserProgress, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly ts: string;
  readonly Seed?: number | null;
  readonly Streak?: number | null;
  readonly Milestones?: string | null;
  readonly completedTasks?: number | null;
  readonly userID: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserProgress = LazyLoading extends LazyLoadingDisabled ? EagerUserProgress : LazyUserProgress

export declare const UserProgress: (new (init: ModelInit<UserProgress>) => UserProgress) & {
  copyOf(source: UserProgress, mutator: (draft: MutableModel<UserProgress>) => MutableModel<UserProgress> | void): UserProgress;
}

type EagerUser = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<User, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly Name: string;
  readonly LastName: string;
  readonly PhoneNumber: string;
  readonly Email?: string | null;
  readonly Rank?: string | null;
  readonly UserProgresses?: (UserProgress | null)[] | null;
  readonly uvaID?: string | null;
  readonly UVA?: UVA | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUser = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<User, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly Name: string;
  readonly LastName: string;
  readonly PhoneNumber: string;
  readonly Email?: string | null;
  readonly Rank?: string | null;
  readonly UserProgresses: AsyncCollection<UserProgress>;
  readonly uvaID?: string | null;
  readonly UVA: AsyncItem<UVA | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type User = LazyLoading extends LazyLoadingDisabled ? EagerUser : LazyUser

export declare const User: (new (init: ModelInit<User>) => User) & {
  copyOf(source: User, mutator: (draft: MutableModel<User>) => MutableModel<User> | void): User;
}

type EagerUVA = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UVA, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly latitude?: string | null;
  readonly longitude?: string | null;
  readonly altitude?: string | null;
  readonly fields?: string | null;
  readonly enabled?: boolean | null;
  readonly createdAt?: string | null;
  readonly userID: string;
  readonly User: User;
  readonly Measurements?: (Measurement | null)[] | null;
  readonly racimoID: string;
  readonly updatedAt?: string | null;
}

type LazyUVA = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UVA, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly latitude?: string | null;
  readonly longitude?: string | null;
  readonly altitude?: string | null;
  readonly fields?: string | null;
  readonly enabled?: boolean | null;
  readonly createdAt?: string | null;
  readonly userID: string;
  readonly User: AsyncItem<User>;
  readonly Measurements: AsyncCollection<Measurement>;
  readonly racimoID: string;
  readonly updatedAt?: string | null;
}

export declare type UVA = LazyLoading extends LazyLoadingDisabled ? EagerUVA : LazyUVA

export declare const UVA: (new (init: ModelInit<UVA>) => UVA) & {
  copyOf(source: UVA, mutator: (draft: MutableModel<UVA>) => MutableModel<UVA> | void): UVA;
}