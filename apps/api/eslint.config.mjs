// @ts-check
import nestConfig from '@base/config/eslint/nest';
import globals from 'globals';

export default [
  {
    ignores: ['eslint.config.mjs'],
  },
  ...nestConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
