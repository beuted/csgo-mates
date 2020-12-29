"use strict";

var express = require('express');
var request = require('requestretry');
var xml2js = require('xml2js');
var router = express.Router();
var _ = require('lodash');

var config = require('../config')

const steamRequestConfig = {
    maxAttempts: 5,   // try 5 times
    retryDelay: 1000, //  wait for 1s before trying again
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError
}

router.get('/server-status', (req, res) => {
    var reqConfig = _.assign(steamRequestConfig, { url: `http://${config.steamApiHost}/ICSGOServers_730/GetGameServersStatus/v1/?key=${config.steamApiKey}` });
    request(reqConfig).pipe(res);
});

router.get('/players/:playerIds/summary', (req, res) => {
    var reqConfig = _.assign(steamRequestConfig, { url: `http://${config.steamApiHost}/ISteamUser/GetPlayerSummaries/v0002/?key=${config.steamApiKey}&steamids=${req.params.playerIds}` });
    request(reqConfig).pipe(res);
});

router.get('/players/:playerId(\\d+)/friend-list', (req, res) => {
    var reqConfig = _.assign(steamRequestConfig, { url: `http://${config.steamApiHost}/ISteamUser/GetFriendList/v0001/?key=${config.steamApiKey}&steamid=${req.params.playerId}` });
    request(reqConfig).pipe(res);
});

router.get('/players/:playerId(\\d+)/csgo-stats', (req, res) => {
    var reqConfig = _.assign(steamRequestConfig, { url: `http://${config.steamApiHost}/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key=${config.steamApiKey}&steamid=${req.params.playerId}` });
    request(reqConfig).pipe(res);
});

router.get('/players/:playerIds/bans', (req, res) => {
    var reqConfig = _.assign(steamRequestConfig, { url: `http://${config.steamApiHost}/ISteamUser/GetPlayerBans/v1?appid=730&key=${config.steamApiKey}&steamids=${req.params.playerIds}` });
    request(reqConfig).pipe(res);
});

router.get('/players/id-from-name/:playerName', (req, res) => {
    var reqConfig = _.assign(steamRequestConfig, { url: `http://${config.steamCommunityHost}/id/${req.params.playerName}/?xml=1"`});

    request(reqConfig, (error, response, body) => {
        xml2js.parseString(body, (error, result) => {
            res.end(_.get(result, ['profile','steamID64','0'], null));
        });
    });
});

module.exports = router;