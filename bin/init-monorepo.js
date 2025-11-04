#! /usr/bin/env node
// @ts-check
import fs from 'node:fs/promises'
import inquirer from 'inquirer'
import ora from 'ora'
import { checkBinary, createMainReadme, setNpmScript, spawnAsync } from '../utils/functions.js'
import {
	createPackageJson,
	initTokens,
	initFrontendOfChoice,
	initBackendOfChoice,
	genConfigFilesFromGistTemplates,
} from '../helpers/scaffold-functions.js'
import { options, commands } from '../helpers/arguments.js'
import {
	checkmark,
	inBlueBold,
	inGoldBold,
	inGreen,
	inGreenBold,
	inRedBold,
	printNewLine,
	printSeparator,
} from '../utils/prints.js'
import { showBunnySign } from 'bunny-sign'

await showBunnySign([
	`Hello there ${process.env.USER || 'friend'}`,
	`I heard you want to create a monorepo`,
	"Well, let's get it started...",
])

// TODO if argument is --default or -d do not ask any question
const choosesDefault = options.default
// The first argument will be the project name. or --project or -p also
const chosenDir = options.project || commands[0]
const chosenBackend = options.backend
const chosenFrontend = options.frontend
const choosesTooling = options.tooling

//console.debug({chosenDir, choosesDefault, chosenBackend, chosenFrontend})
//console.log('\n')

printNewLine()
// The first argument will be the project name. or --project or -p also
if (chosenDir) {
	const directory = options.project || commands[0]
	console.log(`Your project will be called: ${inBlueBold(directory)} - creating directory...\n`)
	await fs.mkdir(directory, { recursive: true })
	process.chdir(directory)
}

let workspaces = {
	main: 'apps',
	secondary: 'helpers',
}

let firstRound = [
	{
		type: 'confirm',
		name: 'change_workspaces',
		message:
			'Default workspaces will be ' +
			inGoldBold(Object.values(workspaces)) +
			`
	${chosenDir || '.'}
	├── ${inGoldBold(Object.values(workspaces)[0])}/
	│   ├── backend
	│   └── frontend
	├── ${inGoldBold(Object.values(workspaces)[1])}/
	│   └── tokens
	└── package.json

are you fine with them? y/n`,
	},
]
let answers = await inquirer.prompt(firstRound)
if (answers.change_workspaces === false) {
	let secondRound = await inquirer.prompt([
		{ message: 'Choose the name for the main workspace (e.g "apps" or "packages") ', name: 'main' },
		{
			message: 'Choose the name for the secondary workspace (e.g. "libs", "utils", "helpers")',
			name: 'secondary',
		},
	])
	workspaces.main = secondRound.main
	workspaces.secondary = secondRound.secondary
	console.info(`Nice, this will be the structure: 
	.
	├── ${inBlueBold(secondRound.main)}/
	│   ├── backend
	│   └── frontend
	├── ${inBlueBold(secondRound.secondary)}/
	│   └── tokens
	└── package.json
	
Proceeding...`)
}

printNewLine()

// Choose your backend ['laravel', 'django']
let backends = ['laravel', 'django', 'fastify', 'none']
let backend
if (chosenBackend && backends.includes(chosenBackend)) {
	backend = {
		choice: chosenBackend,
	}
} else {
	backend = await inquirer.prompt({
		type: 'list',
		name: 'choice',
		message: 'Choose your backend:',
		choices: backends,
		default: 'django',
	})
}

if (backend.choice === 'laravel') {
	let binaryExist = checkBinary('composer')
	if (!binaryExist) {
		console.error(inRedBold('Error: Please install php and composer to use Laravel.'))
		process.exit(1)
	}
}

if (backend.choice === 'django') {
	let binaryExist = checkBinary('django-admin')
	if (!binaryExist) {
		console.error(inRedBold('Error: Please install Python and Django to proceed.'))
		process.exit(1)
	}
}

// Choose your frontend ['vanilla', 'react', 'vue', 'svelte', 'solid', 'quick']
let frontends = ['vanilla', 'react', 'react-ts', 'vue', 'svelte', 'solid', 'qwik', 'preact', 'lit', 'none']
let frontend
if (chosenFrontend && typeof chosenFrontend === 'string' && frontends.includes(chosenFrontend)) {
	frontend = {
		choice: chosenFrontend,
	}
} else {
	frontend = await inquirer.prompt({
		type: 'list',
		name: 'choice',
		message: 'Choose your frontend:',
		choices: frontends,
		default: 'react',
	})
}

let helper = await inquirer.prompt({
	type: 'confirm',
	name: 'answer',
	message: 'Do you want light design-tokens for helper modules?',
})

let tooling = { answer: false }
if (choosesTooling && typeof choosesTooling === 'boolean') {
	tooling.answer = choosesTooling
} else {
	tooling = await inquirer.prompt({
		type: 'confirm',
		name: 'answer',
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

	if (helper.answer) {
		spinner.start(`Scaffolding Tokens package inside ${workspaces.secondary} workspace`)
		await initTokens(workspaces.secondary, 'tokens', '@fsg')
		spinner.succeed(`Created Tokens library.`)
	} else {
		await spawnAsync('touch', [workspaces.secondary + '/.gitkeep'])
	}

	if (backend.choice !== 'none') {
		spinner.start(`Scaffolding ${backend.choice} app inside ${workspaces.main} workspace`)
		await initBackendOfChoice({ workspace: workspaces.main, choice: backend.choice })
		spinner.succeed(`Created ${inGreenBold(backend.choice)} package.`)
	}

	if (frontend.choice !== 'none') {
		spinner.start(`Scaffolding ${frontend.choice} frontend inside ${workspaces.main} workspace`)
		await initFrontendOfChoice({ workspace: workspaces.main, template: frontend.choice })

		if (['react', 'react-ts'].includes(frontend.choice)) {
			await spawnAsync('npm', ['install', '-w', 'frontend', '-D', 'jsdom', '@testing-library/react'])

			// TODO tips at the end (after npm start suggestion)
			//console.log("You are using React, in case you need help with boilerplate give a try to `nx-tool`")
		}

		spinner.succeed(`Created ${inGreenBold(frontend.choice)} frontend package (with Vite).`)
	}

	let initInstructions = [chosenDir && `cd ${chosenDir}`]

	spinner.start('Setting general configuration files...')

	/** @type {import('../helpers/scaffold-functions.js').FileName[]} */
	let defaultConfigFiles = ['.gitignore', '.npmignore', '.editorconfig', '.gitattributes']
	if (tooling.answer) defaultConfigFiles.push('lefthook.yml')
	await genConfigFiles(defaultConfigFiles)

	spinner.succeed('Configuration files in place')

	// if (!(frontend.choice === 'none' && backend.choice === 'none')) {
	// 	// main scaffolding process is done. Do you want to install dependencies or you'll do it by hand
	// 	let installDeps = await inquirer.prompt({
	// 		type: 'confirm',
	// 		name: 'answer',
	// 		message: 'Do you want to install dependencies right away?',
	// 	})

	// 	if (installDeps.answer === true) {
	// 		spinner.start('Installing dependencies...')
	// 		await spawnAsync('npm', ['install'])
	// 		spinner.succeed(`Initialized project and installed dependencies.`)
	// 	} else { initInstructions.push(`npm install`) }

	// }

	spinner.start('Installing dependencies...')
	await spawnAsync('npm', ['install'])
	spinner.succeed(`Initialized project and installed dependencies.`)

	// TODO move this choices up to be more central, so you can use it also above:

	/** @type {import("../utils/functions.js").Choices} */
	let choices = {
		frontend: frontend.choice === 'none' ? null : frontend.choice,
		backend: backend.choice === 'none' ? null : backend.choice,
		helper: helper.answer,
		tooling: tooling.answer,
	}

	let startCmd = []
	if (choices.backend) startCmd.push('npm run start:backend')
	if (choices.frontend) startCmd.push('npm run start:frontend')
	if (startCmd.length > 0) await setNpmScript({ name: 'start', cmd: startCmd.join(' & ') })

	if (tooling.answer) {
		spinner.start('Installing linting and formatting tools...')

		const npmPackages = ['eslint', '@eslint/js', 'globals', 'eslint-config-prettier', 'prettier', 'lefthook']
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

	if (['react', 'react-ts'].includes(frontend.choice)) {
		console.info(
			'\nTips:\n- Since you are using React, you could try my generator `nx-tool` to help you with boilerplate:'
		)
		console.info(inGreen('  npm i -D nx-tool'))
	}

	await showBunnySign(
		[
			`Please read the docs at the root of the project.`,
			`The Readme file contain some basic instructions for the packages of your choice.`,
			`Happy development 🚀`,
		],
		{ persist: true }
	)
} catch (error) {
	console.error(error)
	process.exit(1)
}

/* TODOS */

// TODO - add gitignore dinamically generated (WIP generator)
