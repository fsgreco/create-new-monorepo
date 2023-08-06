import { parseArgs } from "node:util"

const options = { 
  all: { type: "boolean", short: "a"},
  help: { type: "boolean", short: "h" } 
}
const { values, positionals } = parseArgs({options, strict: false })

export { 
	values as options, 
	positionals as commands
}