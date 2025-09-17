export default {
    root: true,
    env: {
        node: true,
        es2023: true,
        es6: true
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.base.json']
    },
    plugins: ['@typescript-eslint', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended'
    ],
    rules: {
        // Coding style - align with repository .clinerules
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
        'semi': ['error', 'never'],
        'comma-dangle': ['error', 'never'],
        'no-console': ['warn'],
        'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
        'prefer-const': ['error'],
        'arrow-parens': ['error', 'always'],
        // TypeScript specific
        '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-var-requires': 'error',
        // Prettier integration
        'prettier/prettier': ['error', {
            'singleQuote': true,
            'tabWidth': 4,
            'semi': false,
            'trailingComma': 'none'
        }]
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                // Allow explicit any in early scaffold
                '@typescript-eslint/no-explicit-any': 'off'
            }
        },
        {
            files: ['*.cjs', '*.js'],
            parserOptions: {
                sourceType: 'script'
            }
        }
    ]
}
