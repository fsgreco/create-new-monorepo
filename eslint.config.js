import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
export default defineConfig([
	globalIgnores(['.github/**', 'dist/**', 'public/**', '**/playwright-report']),
	{
		files: ['**/*.{js,mjs,cjs,ts,tsx}'],
		plugins: { js },
		extends: ['js/recommended', eslintConfigPrettier],
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			'no-unused-vars': 'warn',
			'no-useless-escape': 'off',
			'prefer-const': 'off',
		},
	},
])
