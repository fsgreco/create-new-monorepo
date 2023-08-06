# Create new monorepo
This project is a starter CLI for scaffold new monorepos in a simpler way. It follows the Rapid Application Development (RAD) philosophy.  

The resulting monorepo will be managed by `npm` but you can set any application you want (even with apps in PHP or Python).

## Usage

You don't need to install anything. 
Simply run this on your terminal and answer the questions: 
```sh
npm create new-monorepo
```

Then, after the scaffold simply run
```
npm start
```
It will launch the frontend and backend server.

## Notes: 
The project still lacks of any kind of validation (they will be set in the future). e.g. If you choose `django` or `laravel` as a backend service you will need to have installed the requirements (either `python` or `php` & `composer` in the device).