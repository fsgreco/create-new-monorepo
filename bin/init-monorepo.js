#! /usr/bin/env node
import fs from 'node:fs/promises'
import inquirer from 'inquirer'
import ora from 'ora'
import { checkBinary, setNpmScript, spawnAsync } from '../utils/functions.js'
import {
	createPackageJson,
	initTokens,
	initFrontendOfChoice,
	initBackendOfChoice,
} from '../helpers/scaffold-functions.js'
import { options, commands } from '../helpers/arguments.js'
import {
	checkmark,
	inBlueBold,
	inGoldBold,
	inGreenBold,
	inRedBold,
	printNewLine,
	printSeparator,
} from '../utils/prints.js'

// TODO if argument is --default or -d do not ask any question
const choosesDefault = options.default
// The first argument will be the project name. or --project or -p also
const chosenDir = options.project || commands[0]
const chosenBackend = options.backend
const chosenFrontend = options.frontend

//console.debug({chosenDir, choosesDefault, chosenBackend, chosenFrontend})
//console.log('\n')

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
	
Proceeding...\n`)
}

printNewLine()

// Choose your backend ['laravel', 'django']
let backends = ['laravel', 'django', 'fastify', 'none']
let backend
if (chosenBackend && backends.includes(chosenBackend)) {
	backend = {}
	backend.choice = chosenBackend
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
if (chosenFrontend && frontends.includes(chosenFrontend)) {
	frontend = {}
	frontend.choice = chosenFrontend
} else {
	frontend = await inquirer.prompt({
		type: 'list',
		name: 'choice',
		message: 'Choose your frontend:',
		choices: frontends,
		default: 'react',
	})
}

let spinner = ora()

try {
	spinner.start(
		`Scaffolding ${inGreenBold('main package.json')} - monorepo with ${Object.values(workspaces)} workspaces.`
	)
	await createPackageJson({ workspaces: Object.values(workspaces) })
	spinner.succeed(
		`Created ${inGreenBold('main package.json')} - monorepo with workspaces: ${inGoldBold(Object.values(workspaces))}.`
	)

	spinner.start(`Scaffolding Tokens package inside ${workspaces.secondary} workspace`)
	await initTokens(workspaces.secondary, 'tokens', '@fsg')
	spinner.succeed(`Created Tokens library.\n`)

	if (backend.choice !== 'none') {
		spinner.start(`Scaffolding ${backend.choice} app inside ${workspaces.main} workspace`)
		await initBackendOfChoice({ workspace: workspaces.main, choice: backend.choice })
		spinner.succeed(`Created ${inGreenBold(backend.choice)} package.\n`)
	}

	if (frontend.choice !== 'none') {
		spinner.start(`Scaffolding ${frontend.choice} frontend inside ${workspaces.main} workspace`)
		await initFrontendOfChoice({ workspace: workspaces.main, template: frontend.choice })
		spinner.succeed(`Created ${inGreenBold(frontend.choice)} frontend package (with Vite).\n`)
	}

	let initInstructions = [chosenDir && `cd ${chosenDir}`]

	if (!(frontend.choice === 'none' && backend.choice === 'none')) {
		// main scaffolding process is done. Do you want to install dependencies or you'll do it by hand
		let installDeps = await inquirer.prompt({
			type: 'confirm',
			name: 'answer',
			message: 'Main scaffolding process is done.\nDo you want to install dependencies right away?',
		})

		initInstructions.push(!installDeps.answer && `npm install`)

		if (installDeps.answer === true) {
			spinner.start('Installing dependencies...')
			await spawnAsync('npm', ['install'])
			spinner.succeed(`Initialized project and installed dependencies.`)
		}

		// TODO create last main 'start' better (check and switch whenever be and fe are none )
		await setNpmScript({ name: 'start', cmd: 'npm run start:backend & npm run start:frontend' })
	}

	printSeparator()

	initInstructions.push('npm start')
	const instructions = initInstructions.filter(val => typeof val === 'string').join(' && ')
	console.info(`${checkmark} Everything done.\nNow simply run ${inBlueBold(instructions)}.\nHappy development 🚀`)
} catch (error) {
	console.error(error)
	process.exit(1)
}

/* TODOS */

// TODO - add gitignore
// TODO - generate readme file (customized according to what user choose)
