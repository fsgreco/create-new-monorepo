import { execAsync, setNpmScript, spawnAsync, getGistFromAPI } from '../utils/functions.js'

/**
 * Create the main package.json
 * @param { {workspaces?: string[]}? } options
 */
async function createPackageJson({ workspaces = ['packages', 'utils'] } = {}) {
	await spawnAsync('npm', ['init', '-y'])
	await spawnAsync('npm', ['pkg', 'delete', 'scripts.test', 'keywords', 'main'])
	await spawnAsync('npm', ['pkg', 'set', 'type=module'])
	await spawnAsync('npm', ['pkg', 'set', 'private=true', '--json'])
	for (let [indx, dir] of workspaces.entries()) {
		await spawnAsync('npm', ['pkg', 'set', `workspaces[${indx}]=${dir}/*`])
		await spawnAsync('mkdir', [`${dir}`])
	}
}

/** @typedef {'.editorconfig'|'.gitattributes'|'.gitignore'|'.npmignore'|'.prettierignore'|'.prettierrc.json'|'.prettierrc.json'|'eslint.config.js'|'lefthook.yml'} FileName */
/**
 * Fetches template files from a GitHub Gist and applies them to the project
 * @param {string} gistId - The ID of the GitHub Gist
 * @param {FileName[]} fileNames - Array of file names to fetch from the Gist
 * @returns {Promise<void>}
 */
async function genConfigFilesFromGistTemplates(gistId, fileNames = []) {
	const fs = await import('node:fs/promises')

	try {
		const gistData = await getGistFromAPI(gistId)

		// If no specific files requested, get all files from gist
		const filesToFetch = fileNames.length > 0 ? fileNames : Object.keys(gistData.files)

		// Download and write each file
		for (const fileName of filesToFetch) {
			if (gistData.files[fileName]) {
				const fileContent = gistData.files[fileName].content
				await fs.writeFile(fileName, fileContent)
				// console.log(`Created ${fileName} from gist template.`)
			}
		}
	} catch (error) {
		console.error(`Error: fetching templates from gist went wrong: ${error.message}`)
		//throw error
	}
}

async function initTokens(workspace = 'utils', packageName = 'tokens', scope = '') {
	let scopedName = scope ? `${scope}/${packageName}` : packageName
	let setTokensWorkspace = [
		`npm init -y -w ${workspace}/${packageName} --scope=${scope}`,
		`npm install -D style-dictionary -w ${scopedName}`,
		`npm exec style-dictionary init basic -w ${scopedName}`,
		`npm pkg delete scripts.test main keywords -w ${scopedName}`,
	]
	for (let cmd of setTokensWorkspace) {
		await execAsync(cmd)
	}
	await setNpmScript({ name: 'build', cmd: 'style-dictionary build', packageName: scopedName }),
		await setNpmScript({ name: `build:${packageName}`, cmd: `npm run build -w ${scopedName}` })
}

let djangoInnerScripts = [
	{ name: 'boot:startproject', cmd: 'django-admin startproject project .' },
	{ name: 'boot:startapp', cmd: 'python3 manage.py startapp api' },
	{ name: 'prepare', cmd: 'if [ ! -d \"project\" ]; then npm run boot:startproject && npm run boot:startapp; fi' },
	{ name: 'migrate', cmd: 'python3 manage.py migrate' },
	{ name: 'migrations', cmd: 'python3 manage.py makemigrations' },
	{ name: 'dev', cmd: 'python3 manage.py runserver 8001' },
	{ name: 'stop', cmd: "pkill -f 'manage.py runserver 8001'" },
	{ name: 'start', cmd: 'npm run stop > /dev/null 2>&1 ; npm run migrate && npm run dev' },
]
// TODO create laravel.scaffold to separate compose from innerScripts logic
let laravelInnerScript = [
	{ name: 'boot:startapp', cmd: 'composer create-project laravel/laravel api' },
	{ name: 'prepare', cmd: 'if [ ! -d \"api\" ]; then npm run boot:startapp ; fi' },
	{ name: 'stop', cmd: 'lsof -t -i tcp:8001 | xargs kill -9' },
	{ name: 'start', cmd: 'npm run stop > /dev/null 2>&1 ; cd api && php artisan serve --port=8001' },
]

let fastify = {
	scaffold: ['npx fastify-cli generate . --esm --integrate'],
	innerScripts: [
		// { name: 'prepare', cmd: 'if [ ! -d \"routes\" ]; then fastify generate . --integrate --esm && npm i ; fi' },
	], // fastify already creates an npm start script
}

let backendScripts = new Map([
	['laravel', laravelInnerScript],
	['django', djangoInnerScripts],
	['fastify', fastify.innerScripts],
])

async function initBackendOfChoice({ workspace, choice = 'django', packageName = 'backend' } = {}) {
	let workspaceCmds = [
		`npm init -y -w ${workspace}/${packageName}`,
		`npm pkg set type=module -w ${packageName}`,
		`npm pkg delete scripts.test main keywords -w ${packageName}`,
	]
	for (let cmd of workspaceCmds) {
		await execAsync(cmd)
	}

	if (choice === 'fastify') {
		for (let cmd of fastify.scaffold) {
			await execAsync(`cd ${workspace}/${packageName} && ${cmd}`)
		}
	}

	let innerScripts = backendScripts.get(choice)
	if (innerScripts) {
		for (let script of innerScripts) {
			await setNpmScript({ ...script, packageName })
		}
	} else {
		console.error(`\nCouldn't find scaffolding scripts for ${choice}, please notify this to mantainer.`)
	}

	await setNpmScript({ name: `start:${packageName}`, cmd: `npm start -w ${packageName}` })
}

async function initFrontendOfChoice({
	workspace = 'packages',
	packageName = 'frontend',
	template = 'react',
} = {}) {
	await execAsync(`cd ${workspace} && npm create vite@latest ${packageName} -- --template ${template}`)
	await setNpmScript({ name: `start:${packageName}`, cmd: `npm run dev -w ${packageName}` })
}

export {
	createPackageJson,
	genConfigFilesFromGistTemplates,
	initTokens,
	initBackendOfChoice,
	initFrontendOfChoice,
}
