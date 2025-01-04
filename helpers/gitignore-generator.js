import fs from 'fs'
import https from 'https'

// https://www.toptal.com/developers/gitignore/api/node,python
const url = new URL('https://www.toptal.com')

// TODO - this became a function with array params to apply on the path

let requestConfig = {
	hostname: url.hostname,
	path: '/developers/gitignore/api/node',
	port: 443,
	method: 'GET',
}

console.table(requestConfig)

const responseCallback = response => {
	response.setEncoding('utf8')
	let returnData = ''

	response.on('data', chunk => {
		returnData += chunk
	})

	response.on('end', () => {
		let parsedResponse = returnData.toString()
		fs.writeFileSync('.gitignore', parsedResponse)
	})

	response.on('error', error => {
		throw error
	})
}

/* MAKE THE REQUEST TO TOPTAL REST API, FETCH THE GITIGNORE CONTENT AND PARSE THE STRING */
const request = https.request(requestConfig, responseCallback)
request.end()
