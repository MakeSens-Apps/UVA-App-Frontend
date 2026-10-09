// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';

const {
  RACIMO,
  Measurement,
  UserProgress,
  GamificationEvent,
  AppUsageEvent,
  User,
  UVA,
} = initSchema(schema);

export {
  RACIMO,
  Measurement,
  UserProgress,
  GamificationEvent,
  AppUsageEvent,
  User,
  UVA,
};
