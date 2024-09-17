module.exports = {
  extends: ['../../.eslintrc.js'],

  ignorePatterns: ['!.eslintrc.js', 'dist/'],
};

overrides = {
  "files": ["**/*.ts", "**/*.tsx"],
  "extends": ["@metamask/eslint-config-typescript"],
  "rules": {
    // This allows importing the `Text` JSX component.
    "@typescript-eslint/no-shadow": [
      "error",
      {
        "allow": ["Text"],
      },
    ],
  },
}