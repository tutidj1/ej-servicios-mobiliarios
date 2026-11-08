import { configDefaults, defineConfig } from 'vitest/config';

// `npm test` no toca la red: el test de privacidad de EJ Casa corre aparte (`npm run casa:test`)
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, 'tests/casa/**'] },
});
