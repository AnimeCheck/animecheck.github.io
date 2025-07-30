# Anime Check
> By Rixuel

Search anime, check characters, and view top voice actor main role characters. 

API by Jikan.

## Features
- Search anime
- Check Top 50 characters
- Check Voice Actors Top 10 main role characters
- Save characters
- Privacy blur option
- Import/Export json data

## Cypress E2E testing notes
`npm install` if you have the package.json

`npm install cypress --save-dev` if you don't

To open Cypress UI:
`npx cypress open`

Have to run `http-server` (for example) to open the web page.

To run all tests from the command line without opening the UI:
`npx cypress run`

If your tests are inside a folder like cypress/e2e or cypress/integration, you can specify:
`npx cypress run --spec "cypress/e2e/**/*.cy.js"`


