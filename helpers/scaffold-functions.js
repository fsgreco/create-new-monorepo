import { execAsync, setNpmScript, spawnAsync } from '../utils/functions.js'

/**
 * Create the main package.json
 * @param { {workspaces?: string[]}? } options 
 */
async function createPackageJson({ workspaces = ['packages', 'utils'] } = {}) {
	await spawnAsync('npm', ['init', '-y'])
	await spawnAsync('npm', ['pkg', 'delete', 'scripts.test', 'keywords', 'main'])
	await spawnAsync('npm', ['pkg', 'set', 'type=module'])
	await spawnAsync('npm', ['pkg', 'set', 'private=true', '--json'])
	for (let [indx, dir] of workspaces.entries() ) {
		await spawnAsync('npm', ['pkg', 'set', `workspaces[${indx}]=${dir}/*`])
		await spawnAsync('mkdir', [`${dir}`])
	}
}

async function initTokens( workspace = 'utils', packageName = 'tokens', scope = '') {
	let scopedName = scope ? `${scope}/${packageName}` : packageName
	let setTokensWorkspace = [
		`npm init -y -w ${workspace}/${packageName} --scope=${scope}`,
		`npm install -D style-dictionary -w ${scopedName}`,
		`npm exec style-dictionary init basic -w ${scopedName}`,
		`npm pkg delete scripts.test main keywords -w ${scopedName}`
	]
	for (let cmd of setTokensWorkspace) { 
		await execAsync(cmd) 
	}
	await setNpmScript({ name: 'build', cmd: 'style-dictionary build', packageName: scopedName }),
	await setNpmScript({ name: `build:${packageName}`, cmd: `npm run build -w ${scopedName}`})
}


let djangoInnerScripts = [
	{name: 'boot:startproject', cmd: 'django-admin startproject project .' },
	{name: 'boot:startapp', cmd: 'python manage.py startapp api' },
	{name: 'prepare', cmd: 'if [ ! -d \"project\" ]; then npm run boot:startproject && npm run boot:startapp; fi' },
	{name: 'migrate', cmd: 'python manage.py migrate' },
	{name: 'migrations', cmd: 'python manage.py makemigrations' },
	{name: 'dev', cmd: 'python manage.py runserver 8001' },
	{name: 'stop', cmd: 'pkill -f \'manage.py runserver 8001\''},
	{name: 'start', cmd: 'npm run stop > /dev/null 2>&1 ; npm run migrate && npm run dev' },
]
let laravelInnerScript = [
	{ name: 'boot:startapp', cmd:'composer create-project laravel/laravel api' },
	{ name: 'prepare', cmd: 'if [ ! -d \"api\" ]; then npm run boot:startapp ; fi' },
	{ name: 'stop', cmd: 'lsof -t -i tcp:8001 | xargs kill -9'},
	{ name: 'start', cmd: 'npm run stop > /dev/null 2>&1 ; cd api && php artisan serve --port=8001'}
]
let backendScripts = new Map([
	[ 'laravel', laravelInnerScript ],
	[ 'django', djangoInnerScripts ]
])

async function initBackendOfChoice( {workspace, choice = 'django', packageName = 'backend' } = {} ){

	let workspaceCmds = [
		`npm init -y -w ${workspace}/${packageName}`,
		`npm pkg delete scripts.test main keywords -w ${packageName}`,
	]
	for (let cmd of workspaceCmds) {
		await execAsync(cmd)
	}
	
	let innerScripts = backendScripts.get(choice)
	for ( let script of innerScripts ) {
		await setNpmScript({...script, packageName })
	}

	await setNpmScript({name: `start:${packageName}`, cmd: `npm start -w ${packageName}`})
}

async function initFrontendOfChoice( {workspace = 'packages', packageName = 'frontend', template = 'react'} = {}) {
	await execAsync(`cd ${workspace} && npm create vite@latest ${packageName} -- --template ${template}`,)
	await setNpmScript({name: `start:${packageName}`, cmd: `npm run dev -w ${packageName}` })
}

export {createPackageJson, initTokens, initBackendOfChoice, initFrontendOfChoice}