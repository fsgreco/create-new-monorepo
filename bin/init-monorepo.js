#! /usr/bin/env node
import inquirer from "inquirer"
import ora from 'ora'
import { setNpmScript, spawnAsync } from "../utils/functions.js"
import { createPackageJson, initTokens, initFrontendOfChoice, initBackendOfChoice } from "../helpers/scaffold-functions.js"


// TODO if argument is --default or -d do not ask any question
// TODO if argument is -w or --workspace-choice ask for workspaces 
// TODO if argument is -i or --interactive ask questions for every package
// TODO scegliere se installare e ultimare lo scaffolding o se fare solo scaffolding iniziale.


// TODO - add gitignore 
// USE chalk to add color to workspaces main and secondary 

// Add control to stablish if user has the binary and it works (check the exit status)
/* So first run the `command -v` and then also some unuseful command with > /dev/null 2>&1 , if result is not 0 then it's not ok

child_process.spawn('docker', ['info'])
	.on('exit', c => console.log('child exit code (spawn)', c))


	also check what happens if you use stdio 'inherit' with spawn it should output result on terminal, otherwise it will be silent.

	metti sta cosa del spawn nel how to - se gli dai un terzo argomento `{stdio: 'inherit'}` lui farà vedere l'output nel terminale (cioè nel processo sopra quindi quello primario):
	```js
	let cp = require('node:child_process')
	cp.spawn('docker', ['info' ], {stdio: 'inherit'})
	```

*/

// The first argument will be the project name. or --project or -p also


let workspaces = {
	main: 'apps',
	secondary: 'helpers'
}

let firstRound = [
	{ 
		type: 'confirm', 
		name: 'change_workspaces', 
		message: "Default workspaces will be " + Object.values(workspaces) +`
	.
	├── ${Object.values(workspaces)[0]}/
	│   ├── backend
	│   └── frontend
	├── ${Object.values(workspaces)[1]}/
	│   └── tokens
	└── package.json

are you fine with them? y/n`
	}]
let answers = await inquirer.prompt(firstRound)
if (answers.change_workspaces === false ) {
	let secondRound = await inquirer.prompt([
		{ message: 'Choose the name for the main workspace (e.g "apps" or "packages") ', name: 'main'},
		{ message: 'Choose the name for the secondary workspace (e.g. "libs", "utils", "helpers")', name: 'secondary'}
	])
	workspaces.main = secondRound.main
	workspaces.secondary = secondRound.secondary
	console.info(`Nice, this will be the structure: 
	.
	├── ${secondRound.main}/
	│   ├── backend
	│   └── frontend
	├── ${secondRound.secondary}/
	│   └── tokens
	└── package.json
	
Proceeding...\n`)
}

let spinner = ora()

try {

	spinner.start(`Scaffolding main package.json - monorepo with ${Object.values(workspaces)} workspaces.`)
	await createPackageJson({ workspaces: Object.values(workspaces) })
	spinner.succeed(`Created main package.json - monorepo with workspaces: ${Object.values(workspaces)}.`)

	spinner.start(`Scaffolding Tokens package inside ${workspaces.secondary} workspace`)
	await initTokens( workspaces.secondary, 'tokens', '@fsg')
	spinner.succeed(`Created Tokens library.`)

	// Choose your backend ['laravel', 'django']
	let backends = ['laravel', 'django']
	let backend = await inquirer.prompt({type: 'list', name: 'choice', message: 'Choose your backend:', choices: backends, default: 'django'})
	
	spinner.start(`Scaffolding ${backend.choice} app inside ${workspaces.main} workspace`)
	await initBackendOfChoice( {workspace: workspaces.main, choice: backend.choice } )
	spinner.succeed(`Created ${backend.choice} package.`)

	// Choose your frontend ['vanilla', 'react', 'vue', 'svelte', 'solid', 'quick']
	let frontends = ['vanilla', 'react', 'vue', 'svelte', 'solid', 'qwik', 'preact', 'lit']
	let frontend = await inquirer.prompt({type: 'list', name: 'choice', message: 'Choose your frontend:', choices: frontends, default: 'react'})
	
	spinner.start(`Scaffolding ${frontend.choice} frontend inside ${workspaces.main} workspace`)
	await initFrontendOfChoice( {workspace: workspaces.main, template: frontend.choice } )
	spinner.succeed(`Created ${frontend.choice} frontend package (with Vite).`)

	// main scaffolding process is done. Do you want to install depencencies or you'll do it by hand
	spinner.start('Installing dependencies...')
	await spawnAsync('npm', ['install'])
	await setNpmScript({ name: 'start', cmd: 'npm run start:backend & npm run start:frontend' })
	spinner.succeed('Initialized project and installed dependencies.')

	console.info(`Everything done. Now simply run 'npm start' and happy development 🚀`)

} catch (error) {
	console.error(error)
	process.exit(1)
}
