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

/** @typedef {'.editorconfig'|'.gitattributes'|'.gitignore'|'.npmignore'|'.prettierignore'|'.prettierrc.json'|'.prettierrc.json'|'eslint.config.js'|'lefthook.yml'} FileName Array of file names to fetch from the Gist */
/**
 * Fetches template files from a GitHub Gist and applies them to the project
 * @param {string} gistId - The ID of the GitHub Gist
 * @returns {(fileNames: Array<FileName>) => Promise<void>}
 */
const genConfigFilesFromGistTemplates =
	gistId =>
	async (fileNames = []) => {
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

async function initE2EBoilerplate(workspace = 'utils', packageName = 'e2e') {
	let playwright = {
		scaffold: [
			`npm init playwright@latest -w ${workspace}/${packageName} -- --lang=js --quiet --browser chromium`,
		],
		innerScripts: [
			{ name: 'test:all', cmd: 'npx playwright test' },
			{ name: 'test:all:ui', cmd: 'npx playwright test --ui' },
			{ name: 'report', cmd: 'npx playwright show-report' },
		],
	}

	for (let cmd of playwright.scaffold) {
		await execAsync(cmd)
	}

	for (let script of playwright.innerScripts) {
		await setNpmScript({ ...script, packageName })
	}

	let mainWorkspaceScripts = [
		{ name: 'test', cmd: `npm run test:all -w ${packageName}` },
		{ name: 'test:ui', cmd: `npm run test:all:ui -w ${packageName}` },
		{ name: 'test:report', cmd: `npm run report -w ${packageName}` },
	]
	for (let script of mainWorkspaceScripts) {
		await setNpmScript(script)
	}

	// CUSTOM BOILERPLATE
	const fs = await import('node:fs/promises')
	const fixtureFolder = `${workspace}/${packageName}/fixtures`
	let fixtureContent = `
	import { test as base, expect } from '@playwright/test'
	import { HomePage } from '../models/page.home.model'\n
	export const test = base.extend({
		page: async ({ page }, use, testInfo) => {
			/* BEFORE */
			await use(page)
			/* AFTER */
			testInfo.annotations.push({type:'Message', description: 'End test.' + Date.now()})
		},
		homePage: async ({ page }, use) => {
			const home = new HomePage(page)
			await home.goto()
			await use(home)
		},
	})`
	await spawnAsync('mkdir', ['-p', fixtureFolder])
	await fs.writeFile(`${fixtureFolder}/fixtures.custom.js`, fixtureContent)

	const modelsFolder = `${workspace}/${packageName}/models`
	let homepageContent = `
	export class HomePage {
		reloadBtn
		constructor(page) {
			this.createNewRuleButton = this.page.getByTestId('button-reload')
		}
		async goto() {
			let url = new URL('', ${process.env.E2E_FRONTEND || 'localhost:4200'})
			await this.page.goto(url.href)
		}
		async reloadPage() {
			await this.reloadBtn.click()
		}
	}`
	await spawnAsync('mkdir', ['-p', modelsFolder])
	await fs.writeFile(`${modelsFolder}/page.home.model.js`, homepageContent)
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
	initE2EBoilerplate,
	initBackendOfChoice,
	initFrontendOfChoice,
}
