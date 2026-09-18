/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'supabase/functions', 'scripts', 'run_migration.ts', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    // Kodebasen har ~370 `any` i dag. Warn (ikke error) så det kan ryddes gradvis
    // uten å blokkere bygget; nye `any` blir synlige i editoren.
    '@typescript-eslint/no-explicit-any': 'warn',

    // Manglende deps i useEffect/useCallback er en reell feilkilde – behold som warn
    // fra plugin:react-hooks/recommended til alle er gjennomgått.
    'react-hooks/exhaustive-deps': 'warn',

    // tsc har allerede noUnusedLocals/noUnusedParameters
    '@typescript-eslint/no-unused-vars': 'off',
  },
}
