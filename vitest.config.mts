import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // next.config.ts loads *.svg through @svgr/webpack in Turbopack.
      // Vitest can't use that rule, so every svg import becomes a stub component.
      { find: /^.+\.svg$/, replacement: `${root}test/stubs/svg.tsx` },
      // Next resolves `server-only` itself. Vitest needs an empty module.
      {
        find: /^server-only$/,
        replacement: `${root}test/stubs/server-only.ts`,
      },
      { find: /^@\//, replacement: root },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', '.netlify/**'],
  },
});
