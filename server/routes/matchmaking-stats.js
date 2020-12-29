"use strict";

var csgoClient = require('../csgo-client/csgo-client');
var express = require('express');

var router = express.Router();

router.get('/', function(req, res) {
    csgoClient.matchmakingStatsRequest().then(function(matchmakingStats) {
        res.end(JSON.stringify(matchmakingStats));
    }).catch(function (err) {
        res.status(500, { error: err });
    });
});

module.exports = router;
