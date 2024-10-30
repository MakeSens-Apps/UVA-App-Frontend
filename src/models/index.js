// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';

const { RACIMO, Measurement, UserProgress, User, UVA } = initSchema(schema);

export { RACIMO, Measurement, UserProgress, User, UVA };
