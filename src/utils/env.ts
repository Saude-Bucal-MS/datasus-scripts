import z from 'zod';

export default z
  .object({
    PET_WORKDIR: z.string().default('./data'),
    PET_SCHEMA: z.string().default('siasus_data'),
    PET_DB_HOST: z.string().default('localhost'),
    PET_DB_PORT: z.coerce.number().default(5432),
    PET_DB_USER: z.string().default('postgres'),
    PET_DB_PASSWORD: z.string().default('password'),
    PET_DB_NAME: z.string().default('datasus'),
  })
  .parse(process.env);
