import { spawn, exec, spawnSync } from 'node:child_process'
import { promisify } from 'node:util'

/** @typedef {import("../helpers/types.js").GithubAPIResp} GithubApiResponse Response from Github */

/**
 * The object that define a script to be inserted inside the package.json.
 * @typedef { {name: string, cmd: string, packageName?: string} } scriptDefinition
 */

/**
 * Add a script inside package.json scripts object
 * @param {scriptDefinition} script Define it's `name`, the command (`cmd`) and the package name`pkgName` (if the project resides in some workspace)
 */
export async function setNpmScript({ name, cmd, packageName = null }) {
	let scriptAndWp = [`scripts.${name}=${cmd}`]
	if (packageName) scriptAndWp.push('-w', packageName)
	await spawnAsync('npm', ['pkg', 'set', ...scriptAndWp])
}

/**
 * Exec funtion but as a Promise - to be used with async/await functions
 */
export const execAsync = promisify(exec)

/**
 * Spawn function but as Promise - to be used with async/await functions
 * @param {string} command Main command for `spawn` function
 * @param {Array<string>} args Arguments for the `spawn` function
 * @returns Promise object { stdout, stderr } or Rejected error
 */
export function spawnAsync(command, args) {
	return new Promise((resolve, reject) => {
		const childProcess = spawn(command, args)
		const result = { stdout: '', stderr: '' }

		childProcess.stdout.on('data', data => {
			result.stdout += data
		})

		childProcess.stderr.on('data', data => {
			result.stderr += data
		})

		childProcess.on('error', err => {
			reject(err)
		})

		childProcess.on('close', code => {
			if (code === 0) {
				resolve(result)
			} else {
				reject(new Error(`Process exited with code ${code}: ${result.stderr}`))
			}
		})
	})
}

/**
 * MIT © Santiago Greco - Apr 5, 2023 - fsgreco@hey.com
 * Check if binary exist using `command -v` POSIX compliance function.
 * @param {string} bin the binary command as a string
 * @returns {boolean} `true` if is present, `false` if not.
 */
export function checkBinary(bin) {
	let binary = spawnSync('command', ['-v', bin], { shell: true })
	return !binary.status
}

/**
 * Get json data of gist from the official API
 * @param {string} gistID The ID of the Github Gist
 * @returns {Promise<GithubApiResponse>}
 */
export async function getGistFromAPI(gistID) {
	const gistApiUrl = `https://api.github.com/gists/${gistID}`
	const response = await fetch(gistApiUrl, { headers: { 'User-Agent': 'create-new-monorepo' } })
	if (!response.ok) {
		throw new Error(`Failed to fetch gist: ${response.status} ${response.statusText}`)
	}
	return response.json()
}

/**
 * Writes content to a file with the specified title.
 * @param {string} title - The title of the file to write.
 * @param {string} content - The content to write to the file.
 * @returns {Promise<void>} - A promise that resolves when the file is successfully written.
 */
async function writeFile(title, content) {
	import('node:fs/promises').then(fs => fs.writeFile(title, content))
}

/** @typedef {{ main:string, secondary: string }} Workspaces */
/** @typedef {{title:string,lines:Array<string>|string,h?:number}} Section */

/**
 * Compose sections of lines and titles into a single string for a markdown body content
 * @param {Array<Section>} sections
 * @returns
 */
function composeMarkdown(sections) {
	let body = sections
		?.map(({ title, lines, h = 2 }) => {
			let heading = !title ? '' : `${h ? '#'.repeat(h) : '##'} ${title}\n`
			let content = Array.isArray(lines) ? lines.join('\n') : typeof lines === 'string' ? `${lines}\n` : ''
			return `${heading}${content}`
		})
		?.join('\n')

	return body
}

/**
 * Created main readme file
 * @param {string?} mainTitle
 * @param {Workspaces} workspaces
 * @param {Array<Section>} sections
 * @returns
 */
export function createReadme(mainTitle = '', sections) {
	let mainSection = {
		title: mainTitle ?? 'About this project',
		h: 1,
		lines: [
			'✨ Thanks for using create-new-monorepo ✨\n',
			'This project is a fully standard non-opinionated Npm monorepo.',
			'Below you will find the main commands to manage it.\n',
			'In addition, since it relies on general npm workspaces API, you can refer to the [official Npm documentation][npm:workspaces].\n',
			'[npm:workspaces]: https://docs.npmjs.com/cli/v8/using-npm/workspaces\n',
		],
	}

	return composeMarkdown([mainSection, ...(sections ? sections : [])])
}

/** @typedef {{frontend: string|null;backend: string|null;helper: string|null;}} Choices */

// TODO this should be drastically improved - less hardcoded and general workspace map should be functional
/**
 * Creates the main Readme file
 * @param {{ main: string; secondary: string; }} workspaces
 * @param {Choices} choices
 */
export async function createMainReadme(workspaces, choices) {
	const generalWorkspaceSectionsMap = {
		backend: {
			title: 'Backend workspace',
			lines: ['To run your choiced backend space you can use:', '```bash\nnum run start:backend\n```'],
		},
		frontend: {
			title: 'Frontend workspace',
			lines: [
				'To run your choiced frontend space run',
				'```bash\nnpm run start:frontend\n```',
				'Check also [the workspace documentation][ws:frontend] for more information.\n',
				`[ws:frontend]: ./${workspaces.main}/README.md\n`,
			],
		},
		helper: {
			title: 'Design Tokens Helper',
			lines: [
				'This is a helper library to manage your design tokens.',
				'To build your tokens simply run',
				'```bash\nnpm run build:tokens\n```',
				'Check also [the design tokens documentation][ws:tokens] for more information.\n',
				`[ws:tokens]: ./${workspaces.secondary}/tokens/README.md\n`,
			],
		},
	}

	const sections = Object.entries(generalWorkspaceSectionsMap)
		.filter(([key]) => choices[key])
		.map(([_, val]) => val)

	// DEBUG
	// console.log({sections})

	writeFile('README.md', createReadme('Documentation', sections))
}

// DEBUG
// await writeFile('README2.md', createReadme('Aver que onda') )
