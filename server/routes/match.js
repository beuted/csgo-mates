"use strict";

var csgoClient = require('../csgo-client/csgo-client');
var express = require('express');
var _ = require('lodash');
var util = require('util');

var router = express.Router();

router.get('/:playerId(\\d+)', (req, res) => {
    var playerId = req.params.playerId; //"76561198053991737";

    var matchPromise = csgoClient.requestLiveGameForUser(playerId);

    matchPromise.then(function(userGame) {
        res.end(JSON.stringify(responseToMatch(userGame)));
    }).catch(function (err) {
        console.error('Error getting live game for user: ' + playerId + ', err: ' + JSON.stringify(err));
        res.status(500, { error: 'INTERNAL SERVER ERROR' });
        res.end();
    });
});

var responseToMatch = function(data) {
    var res = {
        listPlayers: [],
        map: null,
        game_type: null,
        team_scores: [null, null],
        time: 0
    }

    if (data.matches && data.matches[0]) {
        if (data.matches[0].roundstats_legacy) {
            if (data.matches[0].roundstats_legacy.reservation) {
                if (data.matches[0].roundstats_legacy.reservation.account_ids
                    && data.matches[0].roundstats_legacy.reservation.account_ids.length) {

                    res.listPlayers = data.matches[0].roundstats_legacy.reservation.account_ids;
                    res.listPlayers = _.map(res.listPlayers, id => '' + csgoClient.toSteamID(id));
                }
                if (data.matches[0].roundstats_legacy.reservation.game_type) {
                    res.game_type = data.matches[0].roundstats_legacy.reservation.game_type;
                }
            }
            if (data.matches[0].roundstats_legacy.team_scores
                && data.matches[0].roundstats_legacy.team_scores.length === 2) {
                res.team_scores = data.matches[0].roundstats_legacy.team_scores;
            }
        }
        if (data.matches[0].watchablematchinfo
            && data.matches[0].watchablematchinfo.game_map) {
            res.map = data.matches[0].watchablematchinfo.game_map;
        }
        if (data.matches[0].watchablematchinfo && data.matches[0].watchablematchinfo.tv_time) {
            res.time = data.matches[0].watchablematchinfo.tv_time;
        }
    }
    return res;
}

module.exports = router;
