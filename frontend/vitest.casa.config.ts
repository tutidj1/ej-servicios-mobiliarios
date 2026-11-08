import { defineConfig } from 'vitest/config';

// Test de privacidad de EJ Casa: corre contra el proyecto Supabase CASA (no el de EJ)
export default defineConfig({
  test: {
    include: ['tests/casa/**/*.casa.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
