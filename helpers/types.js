/**
 * @typedef {Object} GistFile
 * @property {string} filename - The name of the file
 * @property {string} type - The MIME type of the file (e.g., "text/plain")
 * @property {string} [language] - The programming language of the file
 * @property {string} raw_url - URL to the raw content of the file
 * @property {number} size - Size of the file in bytes
 * @property {boolean} truncated - Whether the file content is truncated
 * @property {string} content - The content of the file
 * @property {string} encoding - The encoding of the file (typically "utf-8")
 */

/**
 * @typedef {Object} GithubAPIResp
 * @property {string} url - The API URL of the gist
 * @property {string} forks_url - URL to the forks of the gist
 * @property {string} commits_url - URL to the commits of the gist
 * @property {string} id - The unique identifier of the gist
 * @property {string} node_id - The node identifier of the gist
 * @property {string} git_pull_url - Git URL to pull the gist
 * @property {string} git_push_url - Git URL to push to the gist
 * @property {string} html_url - URL to view the gist in a browser
 * @property {Object.<string, GistFile>} files - Map of filenames to file objects
 */

export {}
