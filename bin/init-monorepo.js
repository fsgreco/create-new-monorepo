#! /usr/bin/env node
// @ts-check
import fs from 'node:fs/promises'
import { select, input, confirm } from '@inquirer/prompts'
import ora from 'ora'
import { checkBinary, createMainReadme, setNpmScript, spawnAsync } from '../utils/functions.js'
import {
	createPackageJson,
	initTokens,
	initFrontendOfChoice,
	initBackendOfChoice,
	genConfigFilesFromGistTemplates,
	initE2EBoilerplate,
} from '../helpers/scaffold-functions.js'
import { options, commands } from '../helpers/arguments.js'
import {
	inBlueBold,
	inGoldBold,
	inGreen,
	inGreenBold,
	inRedBold,
	printNewLine,
	printSeparator,
} from '../utils/prints.js'
import { showBunnySign } from 'bunny-sign'

if (!process.env.DEBUG) {
	await showBunnySign([
		`Hello there ${process.env.USER || 'friend'}`,
		`I heard you want to create a monorepo`,
		"Well, let's get it started...",
	])
}

// TODO if argument is --default or -d do not ask any question
// The first argument will be the project name. or --project or -p also
const chosenDir = options.project || commands[0]
let chosenBackend = typeof options.backend === 'string' ? options.backend : undefined
let chosenFrontend = typeof options.frontend === 'string' ? options.frontend : undefined
let choosesE2E = typeof options.e2e === 'boolean' ? options.e2e : undefined
let choosesTooling = typeof options.tooling === 'boolean' ? options.tooling : undefined

//console.debug({chosenDir, choosesDefault, chosenBackend, chosenFrontend})
//console.log('\n')

printNewLine()
// The first argument will be the project name. or --project or -p also
if (chosenDir && typeof chosenDir === 'string') {
	console.log(`Your project will be called: ${inBlueBold(chosenDir)} - creating directory...\n`)
	await fs.mkdir(chosenDir, { recursive: true })
	process.chdir(chosenDir)
}

let workspaces = {
	main: 'packages',
	secondary: 'utils',
}

let firstRound = await confirm({
	default: true,
	message: `Default workspaces will be ${inGoldBold(Object.values(workspaces))} 
	${chosenDir || '.'}
	├── ${inGoldBold(Object.values(workspaces)[0])}/
	│   ├── backend
	│   └── frontend
	├── ${inGoldBold(Object.values(workspaces)[1])}/
	│   └── tokens
	└── package.json

are you fine with them? y/n`,
})

if (firstRound === false) {
	const mainWorkspace = await input({
		message: 'Choose the name for the main workspace (e.g "apps" or "packages")',
		default: workspaces.main,
	})
	const secondaryWorkspace = await input({
		message: 'Choose the name for the secondary workspace (e.g. "libs", "utils", "helpers")',
		default: workspaces.secondary,
	})
	workspaces.main = mainWorkspace
	workspaces.secondary = secondaryWorkspace
	console.info(`Nice, this will be the structure: 
	.
	├── ${inBlueBold(workspaces.main)}/
	│   ├── backend
	│   └── frontend
	├── ${inBlueBold(workspaces.secondary)}/
	│   └── tokens
	└── package.json
	
Proceeding...`)
}

printNewLine()

// Choose your backend ['laravel', 'django']
let backends = ['laravel', 'django', 'fastify', 'fastify-ts', 'none']

// if backend was not chosen with a flag OR if was chosen but does not match the available backend choices, then:
if (!chosenBackend || (chosenBackend && !backends.includes(chosenBackend))) {
	chosenBackend = await select({
		message: 'Choose your backend:',
		choices: backends.map(value => ({ name: value, value })),
		default: 'fastify',
	})
}

if (chosenBackend === 'laravel') {
	let binaryExist = checkBinary('composer')
	if (!binaryExist) {
		console.error(inRedBold('Error: Please install php and composer to use Laravel.'))
		process.exit(1)
	}
}

if (chosenBackend === 'django') {
	let binaryExist = checkBinary('django-admin')
	if (!binaryExist) {
		console.error(inRedBold('Error: Please install Python and Django to proceed.'))
		process.exit(1)
	}
}

// Choose your frontend ['vanilla', 'react', 'vue', 'svelte', 'solid', 'quick']
let frontends = ['vanilla', 'react', 'react-ts', 'vue', 'svelte', 'solid', 'qwik', 'preact', 'lit', 'none']

if (!chosenFrontend || (chosenFrontend && !frontends.includes(chosenFrontend))) {
	chosenFrontend = await select({
		message: 'Choose your frontend:',
		choices: frontends.map(value => ({ name: value, value })),
		default: 'react',
	})
}

if (!choosesE2E) {
	choosesE2E = await confirm({
		message: 'Do you want to set an e2e package with Playwright boilerplate?',
		default: true,
	})
}

let e2eLanguage = 'js'
if (choosesE2E) {
	e2eLanguage = await select({
		message: 'Do you want to use Playwright with Javascript or Typescript?',
		choices: [
			{ name: 'js', value: 'js' },
			{ name: 'ts', value: 'ts' },
		],
		default: 'js',
	})
}

let helper = await confirm({
	message: 'Do you want light design-tokens for helper modules?',
	default: false,
})

if (!choosesTooling) {
	choosesTooling = await confirm({
		message: 'Do you want basic normalization tooling for linting and formatting (ESLint + Prettier)?',
		default: true,
	})
}

console.info('')

/** Creation Phase */

const genConfigFiles = genConfigFilesFromGistTemplates('a00a9e453c5aafa219829ad5d2eeaa74')

let spinner = ora()

try {
	spinner.start(
		`Scaffolding ${inGreenBold('main package.json')} - monorepo with ${Object.values(workspaces)} workspaces.`
	)
	await createPackageJson({ workspaces: Object.values(workspaces) })
	spinner.succeed(
		`Created ${inGreenBold('main package.json')} - monorepo with workspaces: ${inGoldBold(Object.values(workspaces))}.`
	)

	if (helper) {
		spinner.start(`Scaffolding Tokens package inside ${workspaces.secondary} workspace`)
		await initTokens(workspaces.secondary, 'tokens', '@fsg')
		spinner.succeed(`Created Tokens library.`)
	} else {
		await spawnAsync('touch', [workspaces.secondary + '/.gitkeep'])
	}

	if (choosesE2E) {
		spinner.start(`Scaffolding Playwright for E2E testing inside ${workspaces.secondary} workspace`)
		await initE2EBoilerplate(workspaces.secondary, 'e2e', e2eLanguage)
		spinner.succeed(`Created ${inGoldBold('playwright')} project (E2E testing)`)
	}

	if (chosenBackend !== 'none') {
		spinner.start(`Scaffolding ${chosenBackend} app inside ${workspaces.main} workspace`)
		await initBackendOfChoice({ workspace: workspaces.main, choice: chosenBackend })
		spinner.succeed(`Created ${inGreenBold(chosenBackend)} package.`)
	}

	if (chosenFrontend !== 'none') {
		spinner.start(`Scaffolding ${chosenFrontend} frontend inside ${workspaces.main} workspace`)
		await initFrontendOfChoice({ workspace: workspaces.main, template: chosenFrontend })
		spinner.succeed(`Created ${inGreenBold(chosenFrontend)} frontend package (with Vite).`)
	}

	let initInstructions = [chosenDir && `cd ${chosenDir}`]

	spinner.start('Setting general configuration files...')

	/** @type {import('../helpers/scaffold-functions.js').FileName[]} */
	let defaultConfigFiles = ['.gitignore', '.npmignore', '.editorconfig', '.gitattributes']
	if (choosesTooling) defaultConfigFiles.push('lefthook.yml')
	await genConfigFiles(defaultConfigFiles)

	spinner.succeed('Configuration files in place')

	// if (!(chosenFrontend === 'none' && chosenBackend === 'none')) {
	// 	// main scaffolding process is done. Do you want to install dependencies or you'll do it by hand
	// 	let installDeps = await confirm({ message: 'Do you want to install dependencies right away?' })
	// 	if (installDeps === true) {
	// 		spinner.start('Installing dependencies...')
	// 		await spawnAsync('npm', ['install'])
	// 		spinner.succeed(`Initialized project and installed dependencies.`)
	// 	} else { initInstructions.push(`npm install`) }
	// }

	spinner.start('Installing dependencies...')
	await spawnAsync('npm', ['install'])

	if (chosenFrontend && ['react', 'react-ts'].includes(chosenFrontend)) {
		await spawnAsync('npm', ['install', '-D', 'vitest', 'jsdom', '@testing-library/react', '-w', 'frontend'])

		await setNpmScript({ name: 'test', cmd: 'vitest', packageName: 'frontend' })
		await setNpmScript({ name: 'test:frontend', cmd: `npm test -w frontend` })
	}
	spinner.succeed(`Initialized project and installed dependencies.`)

	/** @type {import("../utils/functions.js").Choices} */
	let choices = {
		frontend: chosenFrontend === 'none' ? null : chosenFrontend,
		backend: chosenBackend === 'none' ? null : chosenBackend,
		helper: helper,
		tooling: choosesTooling,
		e2e: choosesE2E,
	}

	let startCmd = []
	if (choices.backend) startCmd.push('npm run start:backend')
	if (choices.frontend) startCmd.push('npm run start:frontend')
	if (startCmd.length > 0) await setNpmScript({ name: 'start', cmd: startCmd.join(' & ') })

	if (choosesTooling) {
		spinner.start('Installing linting and formatting tools...')

		const npmPackages = ['eslint@9', '@eslint/js@9', 'globals', 'eslint-config-prettier', 'prettier', 'lefthook']
		await spawnAsync('npm', ['install', '-D', ...npmPackages])

		spinner.succeed('Installed linting and formatting packages.')

		spinner.start('Setting up configuration and scripts...')

		await genConfigFiles(['.prettierrc.json', '.prettierignore', 'eslint.config.js'])

		await setNpmScript({ name: 'lint', cmd: 'eslint . --fix' })
		await setNpmScript({ name: 'normalize', cmd: "prettier --write '**/*.{js,ts,cjs,mjs,jsx,tsx}'" })
		await setNpmScript({ name: 'check', cmd: 'npm run normalize && npm run lint' })
		await setNpmScript({ name: 'setup:githooks', cmd: 'lefthook install' })

		spinner.succeed('Setup completed: npm scripts for linting and formatting in place.')
	}

	spinner.start('Creating main Readme file')
	await createMainReadme(workspaces, choices)
	spinner.succeed('Created main README file.')

	printSeparator()

	initInstructions.push('npm start')
	const instructions = initInstructions.filter(val => typeof val === 'string').join(' && ')
	spinner.succeed('Everything done.')
	console.info(`Now simply run ${inBlueBold(instructions)}.`)

	if (['react', 'react-ts'].includes(chosenFrontend)) {
		console.info(
			'\nTips:\n- Since you are using React, you could try my generator `nx-tool` to help you with boilerplate:'
		)
		console.info(inGreen('  npm i -D nx-tool'))
	}

	await showBunnySign([`Please read the README file at the root of the project.`, `Happy development 🚀`], {
		persist: true,
	})
} catch (error) {
	console.error(error)
	process.exit(1)
}

/* TODOS */

// TODO - add gitignore dinamically generated (WIP generator)
