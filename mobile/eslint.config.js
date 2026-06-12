const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['node_modules/', 'android/', 'ios/', 'dist/', '.expo/'],
  },
  // Jest setup files and test helpers: allow Jest globals
  {
    files: ['src/__tests__/jest.setup.js', 'src/__tests__/**/*.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  // Copied generated model files: suppress redeclaration warnings (pattern from Amplify codegen)
  {
    files: ['src/data/models/index.d.ts'],
    rules: {
      '@typescript-eslint/no-redeclare': 'off',
      'import/no-duplicates': 'off',
    },
  },
]);
