module.exports = {
  extends: ['@metamask/eslint-config'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['@metamask/eslint-config-typescript'],
      rules: {
        // This allows importing the `Text` JSX component.
        '@typescript-eslint/no-shadow': [
          'error',
          {
            allow: ['Text'],
          },
        ],
      },
    },
    {
      files: ['*.test.ts', '*.test.tsx'],
      extends: ['@metamask/eslint-config-jest'],
      rules: {
        '@typescript-eslint/no-shadow': [
          'error',
          {
            allow: ['describe', 'it', 'expect'],
          },
        ],
      },
    },
  ],
  ignorePatterns: ['!.eslintrc.js', 'dist/'],
};

