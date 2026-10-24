// Code check: `npm run lint` (also run by the Tests workflow on every push). It catches
// real mistakes (misspelled or undefined names, unused variables, unreachable code),
// not formatting. Built files (index.html, preview/, _site/) aren't checked.

import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['preview/', '_site/', 'node_modules/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      // Behaviors share one signature (w, game, dt) even when they don't use every part.
      'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
    },
  },
  // Node scripts: the build, the sprite build and the tests.
  { files: ['*.mjs', 'sprites/**/*.js', 'tests/**/*.mjs'], languageOptions: { globals: { ...globals.node } } },
  // Code the tests run inside the page, where the harness defines window.T.
  { files: ['tests/**/*.mjs'], languageOptions: { globals: { T: 'readonly' } } },
  // Stamped in by build.mjs (src/version.js).
  { files: ['src/version.js'], languageOptions: { globals: { __VERSION__: 'readonly', __PREVIEW__: 'readonly' } } },
];
