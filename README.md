# Create new monorepo
This project is a starter CLI for scaffold new monorepos in a simpler way. It follows the Rapid Application Development (RAD) philosophy.  

The resulting monorepo will be managed by `npm` but you can set any application you want (even with apps in PHP or Python).  


## Usage

**You don't need to install anything**.  
Simply run this command on your terminal and answer the questions: 
```sh
npm create new-monorepo <project-name>
```

Then, after the scaffold simply run:
```sh
npm start
```
It will launch the frontend and backend server.

![Screenshot Demo](screenshot-demo.png)

## Available options

You can pass options preceeded by `--` to avoid interactivity: 
```sh
npm create new-monorepo <project-name> -- -b django -f react
```
This will create a `django` app under `/backend` and a `react` app under `/frontend` directory.

The available options are:

|   Command      | shorthand |                                                             example                                                    |
|:--------------:|:---------:|------------------------------------------------------------------------------------------------------------------------|
|  --project     |     -p    | `npm create new-monorepo -- -p my-project`  <br>Alternatively use an argument:<br>`npm create new-monorepo my-project` |
| --frontend     |     -f    | `npm create new-monorepo my-project -- -f react`                                                                       |
|  --backend     |     -b    | `npm create new-monorepo my-project -- -b django`                                                                      |
| --tooling      |     -t    | `npm create new-monorepo my-project -- -t` (skips prompt, enables linting and formating)                        |

### Available templates:
At the moment this are the available templates: 

| Frontend                                                                      |
|-------------------------------------------------------------------------------|
| `vanilla`, `react`, `vue`, `svelte`, `solid`, `qwik`, `preact`, `lit`, `none` |

| Backend                                                                       |
|-------------------------------------------------------------------------------|
| `laravel`, `django`, `fastify`, `none`                                        |

## Linting and Formatting

During setup, you'll be asked if you want basic linting and formatting tools. If you answer **yes** (or use `--tooling`), the CLI will:

- Install **ESLint**, **Prettier**, and **Lefthook** as dev dependencies
- Generate configuration files (`.prettierrc.json`, `.prettierignore`, `eslint.config.js`, `lefthook.yml`)
- Add npm scripts: `normalize`, `lint`, `check`, and `setup:githooks`

### Enabling Git Hooks

Lefthook is a helper that will automatically format and lint your code before each commit.

It will be installed as devDependency.  
In case you do not use `npm`, to enable the git hooks (pre-commit linting/formatting), run:

```sh
npm run setup:githooks
```
Note: this will work only if you initialize the project with `git`. Also, if you use `npm` then the hooks will be enabled automatically whenever you run `npm install` (since `lefthook` has a built in `postbuild` command in its package.json).


## Notes: 

If you choose `django` or `laravel` as a backend service you will need to have installed the requirements (either `django-admin` or php `composer` in the device). This CLI will check if they are installed and exit with an error explanation if not. Due to this checking process (that uses POSIX-compliant system) this CLI will not work on Windows at the moment (in the future proper compatibility will be implemented).
