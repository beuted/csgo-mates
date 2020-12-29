# CSGO-MATES-SERVER

Node server and client for csgo-mates.com
Now dead due to all steam API on users becoming unavailable for private profils after RGPD update 😥
I cleaned git history before open sourcing it to avoid leaking private keys :)

_Done in 2013, Redesigned in 2014, Dead in 2016, Definitly removed in 2020_

## Techno used

* `angular1`, `bootstrap`
* `express` for the routes (steam api wrapper, sql requests, etc)
* `passport-steam` for the OAuth connectiont to steam
* `csgo-node` to run a bot retreiving information from CSGO

## Running the server

* You need to have mysql installed with 2 DBS created one for the sessions and one for the application in generale (see `server/config.js`)
* Run `npm install`
* Edit `server/config.js` with a valid steam user & password (warning: the user must have the game csgo, the user will not be able to connect to csgo server from another location)
* Run `npm run start`
* The first time on you run the script on your IP an email will be sent to the user with an AuthCode, copy paste it in the console
* Access `http://localhost:3003` and enjoy ;)
