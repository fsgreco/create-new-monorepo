import { parseArgs } from 'node:util'
// import { printNewLine, printSeparator } from '../utils/prints.js'

const options = {
	project: { type: 'string', short: 'p' },
	help: { type: 'boolean', short: 'h' },
	frontend: { type: 'string', short: 'f' },
	backend: { type: 'string', short: 'b' },
	tooling: { type: 'boolean', short: 't' },
}
const { values, positionals } = parseArgs({ options, strict: false })

// this excludes the next node in the abstract syntax tree
// prettier-ignore
export { 
	values as options, 
	positionals as commands 
}
