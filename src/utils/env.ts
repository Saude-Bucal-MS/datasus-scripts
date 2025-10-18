import z from 'zod';

export default z
  .object({
    PET_WORKDIR: z.string().default('./data'),
  })
  .parse(process.env);
