import Knex from 'knex';
import env from './utils/env.js';

export const knex = Knex({
  client: 'pg',
  connection: {
    host: env.PET_DB_HOST,
    port: env.PET_DB_PORT,
    user: env.PET_DB_USER,
    password: env.PET_DB_PASSWORD,
    database: env.PET_DB_NAME,
  },
});
