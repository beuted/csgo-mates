"use strict";

var express = require('express');
var passport = require('passport');
var router = express.Router();

// GET /auth/steam
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Steam authentication will involve redirecting
//   the user to steamcommunity.com.  After authenticating, Steam will redirect the
//   user back to this application at /auth/steam/return
router.get('/',
    passport.authenticate('steam', { failureRedirect: '/' }),
    function(req, res) {
        res.redirect('/');
    });

// GET /auth/steam/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
router.get('/return',
    function(req, res, next){
        req.url = req.originalUrl; next();
    },
    passport.authenticate('steam', { failureRedirect: '/' }),
    function(req, res) {
        res.redirect('/');
    });

router.get('/user', ensureAuthenticated, function(req, res) {
    res.end(JSON.stringify(req.user._json));
});

router.get('/logout', ensureAuthenticated, function(req, res) {
    req.session.destroy();
    req.logout();
    res.redirect('/');
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.status(401);
    res.end();
}

module.exports = router;
