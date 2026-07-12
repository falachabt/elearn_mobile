// https://docs.expo.dev/guides/using-eslint/
// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/no-commonjs': 'warn',
    'import/commonjs': 'warn',
    'import/order': 'warn',
  },
};
