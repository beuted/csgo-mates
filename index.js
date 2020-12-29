var express = require('express');
var bodyParser = require('body-parser');
var compression = require('compression');
var session = require('express-session');
var passport = require('passport');
var SteamStrategy = require('passport-steam').Strategy;
var mysql = require('mysql');
var SessionStore = require('express-mysql-session');
var config = require('./server/config');

var app = express();
var port = process.env.PORT || config.websitePort;


//passport config
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});


// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new SteamStrategy({
    returnURL: `${config.websiteUrl}/api/auth/steam/return`,
    realm: `${config.websiteUrl}/`,
    apiKey: config.steamApiKey,
    stateless: true
  },
  (identifier, profile, done) => {
    // asynchronous verification, for effect...
    process.nextTick(function () {

      // To keep the example simple, the user's Steam profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Steam account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));


//-------middlewares-------

app.use(compression());

var sessionStore = new SessionStore({
    host: 'localhost',
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: 'sessions'
});
app.use(session({
    secret: config.sessionSecret,
    store: sessionStore,
    name: 'steamSession',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// to support JSON-encoded bodies
app.use(bodyParser.json());
// to support URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); 

//--------------------------


// serve static files
app.use(express.static('public/bin'));

// declare routes
var routes = require('./server/routes.js')(app);

app.use(function (error, request, response, next) {
    console.error(error.stack);
    response.status(400).send(error.message);
});

app.listen(port, function() {
    console.log('csgo-mates-server is running at localhost:' + port);
});