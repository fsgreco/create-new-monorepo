import chalk from "chalk"

const colors = new Map([
	['red', [216, 16, 16]],
  ['green', [142, 215, 0]],
	['blue', [0, 186, 255]],
  ['gold', [255, 204, 0]],
  ['mediumGray', [128, 128, 128]],
  ['darkGray', [90, 90, 90]],
])

export const inDarkGray = chalk.rgb(...colors.get('darkGray'))
export const inMediumGray = chalk.rgb(...colors.get('mediumGray'))
export const inRed =chalk.rgb(...colors.get('red'))
export const inRedBold = chalk.bold.rgb(...colors.get('red'))
export const inBlueBold = chalk.bold.rgb(...colors.get('blue'))
export const inGreenBold = chalk.bold.rgb(...colors.get('green'))
export const inGoldBold = chalk.bold.rgb(...colors.get('gold'))

export const checkmark = chalk.rgb(...colors.get('green'))('✓')


export const printSeparator = () => console.info(`\n=========================================\n`)

export const printNewLine = () => console.log(`\n`)

