import { defineCliConfig } from 'sanity/cli';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'qwwmf79r';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export default defineCliConfig({
  api: { projectId, dataset },
  typegen: {
    path: './sanity/**/*.{ts,tsx,js,jsx}',
    schema: './sanity.schema.json',
    generates: './sanity.types.ts',
    overloadClientMethods: true,
  },
});
