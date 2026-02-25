import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        rules: {
            'no-console': 'off',
            'prefer-const': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-unused-expressions': 'warn',
            '@typescript-eslint/no-this-alias': 'warn',
        },
    },
    {
        ignores: ['docs/**', 'docs.src/**', 'node_modules/**'],
    },
);
