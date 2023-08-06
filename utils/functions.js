import { spawn, exec } from 'node:child_process'
import { promisify } from 'node:util'

/**
 * The object that define a script to be inserted inside the package.json.
 * @typedef { {name: string, cmd: string, packageName?: string} } scriptDefinition
 */

/**
 * Add a script inside package.json scripts object
 * @param {scriptDefinition} script Define it's `name`, the command (`cmd`) and the package name`pkgName` (if the project resides in some workspace)
 */
export async function setNpmScript({name, cmd, packageName = null }) {
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
    const childProcess = spawn(command, args);
    const result = {stdout: '', stderr: ''}

    childProcess.stdout.on('data', (data) => {
      result.stdout += data;
    });

    childProcess.stderr.on('data', (data) => {
      result.stderr += data;
    });

    childProcess.on('error', (err) => {
      reject(err);
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(`Process exited with code ${code}: ${result.stderr}`));
      }
    });
  });
}
