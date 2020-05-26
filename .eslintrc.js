module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        semi: ['error', 'always'],
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/no-unused-vars': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-explicit-any': 0,
    }
};