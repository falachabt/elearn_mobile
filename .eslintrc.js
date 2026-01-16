// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    'import/no-commonjs': ['error', { allowRequire: true }],
    'import/commonjs': ['error', { allowRequire: true }],
  },
};
