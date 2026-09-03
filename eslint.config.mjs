// eslint-config-next is pinned to next's version (15.5.23) and only ships the
// legacy eslintrc format, so FlatCompat is what bridges it into flat config.
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'public/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals'),
];
