"use strict";
var User = require('../models/user');
var express = require('express');

var router = express.Router();

router.get('/tracked-players', ensureAuthenticated, function(req, res) {
    var userId = req.user._json.steamid;

    User.GetTrackedPlayers(userId, (err, data) => {
        handleResponse(err, data, res);
    });
});

router.put('/tracked-players', ensureAuthenticated, function(req, res) {
    var userId = req.user._json.steamid;
    var trackedPlayer = JSON.parse(req.body.trackedPlayer);
    var isBanned = JSON.parse(req.body.isBanned);

    User.UpdateTrackedPlayer(userId, trackedPlayer, isBanned, (err, data) => {
        handleResponse(err, data, res);
    });
});


router.post('/tracked-players', ensureAuthenticated, function(req, res) {
    var userId = req.user._json.steamid;
    var trackedPlayer = req.body.trackedPlayer;
    var isBanned = req.body.isBanned;

    User.AddTrackedPlayer(userId, trackedPlayer, isBanned, (err, data) => {
        handleResponse(err, data, res);
    });
});

router.delete('/tracked-players', ensureAuthenticated, function(req, res) {
    var userId = req.user._json.steamid;
    var trackedPlayer = req.body.trackedPlayer;

    User.RemoveTrackedPlayer(userId, trackedPlayer, (err, data) => {
        handleResponse(err, data, res);
    });
});


router.get('/history', ensureAuthenticated, function(req, res) {
    var userId = req.user._json.steamid;

    User.GetHistory(userId, (err, data) => {
        handleResponse(err, data, res);
    });
});

router.post('/history', ensureAuthenticated, function(req, res) {
    var userId = req.user._json.steamid;
    var players = req.body.players;

    User.AddPlayersToHistory(userId, players, (err, data) => {
        handleResponse(err, data, res);
    });
});

router.put('/history', ensureAuthenticated, function(req, res) {
    var userId = req.user._json.steamid;
    var players = req.body.players;

    User.UpdateHistory(userId, players, (err, data) => {
        handleResponse(err, data, res);
    });
});


router.post('/player-info', ensureAuthenticated, function(req, res) {
    var userId = req.user._json.steamid;
    var playerIds = JSON.parse(req.body.players);

    User.GetInfos(userId, playerIds, (err, data) => {
        handleResponse(err, data, res);
    });
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


function handleResponse(err, data, res) {
    if (err) {
        if (err.status == 500 || err.status == undefined) {
            console.error(JSON.stringify(err));
            res.status(500, { error: 'INTERNAL SERVER ERROR' });
        } else {
            res.status(err.status, { error: err.data });
        }
        res.end();
    } else {
        res.end(JSON.stringify(data));
    }
}


module.exports = router;
