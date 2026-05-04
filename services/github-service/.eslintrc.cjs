/* eslint-env node */
/** GitHub webhook service — Node + Jest. */
module.exports = {
  env: { node: true, es2022: true, jest: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules/'],
  rules: {
    'no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
};
