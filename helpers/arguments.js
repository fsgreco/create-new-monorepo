import { parseArgs } from 'node:util'
import { printNewLine, printSeparator } from '../utils/prints.js'

const options = {
	project: { type: 'string', short: 'p' },
	help: { type: 'boolean', short: 'h' },
	frontend: { type: 'string', short: 'f' },
	backend: { type: 'string', short: 'b' },
}
const { values, positionals } = parseArgs({ options, strict: false })

export { values as options, positionals as commands }
