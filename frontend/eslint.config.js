import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			// SvelteKit uses goto() from $app/navigation — this rule targets plain Svelte, not SvelteKit.
			'svelte/no-navigation-without-resolve': 'off',
			// Our Map/Set usages are either local vars inside $derived (rebuilt each call) or
			// fully reassigned rather than mutated in-place, so SvelteMap/SvelteSet add no value.
			'svelte/prefer-svelte-reactivity': 'off'
		}
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/']
	}
);
