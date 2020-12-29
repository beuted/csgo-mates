"use strict";

var Steam = require('steam');
var util = require('util');
var fs = require('fs');
var csgo = require('csgo');
var bot = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(bot);
var steamFriends = new Steam.SteamFriends(bot);
var steamGC = new Steam.SteamGameCoordinator(bot, 730);
var CSGO = new csgo.CSGOClient(steamUser, steamGC, false);
var readlineSync = require('readline-sync');
var crypto = require('crypto');
var Promise = require('bluebird');
var config = require('../config');
var _ = require('lodash');


// Constants
var SEC_BETWEEN_CONSUME = 1;
var SEC_BETWEEN_CLEAN = 10;
var SEC_MATCH_REQUEST_ALLOWED = 10;

// Caches
var csgoClient = {};
var ready = false;
var matchmakingStats = null;

var matchsConsumerHashMap = {};

var username = config.username;
var password = config.password;
var authCode = "";//readlineSync.question('AuthCode: ');

function MakeSha(bytes) {
    var hash = crypto.createHash('sha1');
    hash.update(bytes);
    return hash.digest();
}

var onSteamLogOn = function onSteamLogOn(response){
    if (response.eresult == Steam.EResult.OK) {
        util.log('Logged in!');
    } else {
        console.error('[STEAM] ERROR - Logon failed');
        if (response.eresult == Steam.EResult.InvalidPassword) {
            console.error('Reason: invalid password');
        } else if (response.eresult == Steam.EResult.AlreadyLoggedInElsewhere) {
            console.error('Reason: already logged in elsewhere');
        } else if (response.eresult == Steam.EResult.AccountLogonDenied) {
            console.error('Reason: logon denied - steam guard needed');
        } else {
            console.error('Reason: unknown: ' + JSON.stringify(response));
        }
        process.exit();
    }

    steamFriends.setPersonaState(Steam.EPersonaState.Busy);
    util.log('Logged on.');

    util.log('Current SteamID64: ' + bot.steamID);
    util.log('Account ID: ' + CSGO.ToAccountID(bot.steamID));

    CSGO.launch();

    CSGO.on('ready', function() {
        ready = true;
        util.log('node-csgo ready.');

        CSGO.on('matchList', function(matchResponse) {
            var steamId = CSGO.ToSteamID(matchResponse.accountid);
            if (matchsConsumerHashMap[steamId]) {
                matchsConsumerHashMap[steamId].match.resolve(matchResponse);
                delete matchsConsumerHashMap[steamId];
            }
        });

        CSGO.on('matchmakingStatsData', function(matchmakingStatsResponse) {
            if (matchmakingStats)
                matchmakingStats.resolve(matchmakingStatsResponse);
        });
    });

    CSGO.on('unready', function onUnready(){
        util.log('node-csgo unready.');
    });

    CSGO.on('unhandled', function(kMsg) {
        util.log('UNHANDLED MESSAGE ' + kMsg);
    });
};

var onSteamSentry = function onSteamSentry(sentry) {
    util.log('Received sentry.');
    fs.writeFileSync('server/csgo-client/sentry', sentry);
};

var onSteamServers = function onSteamServers(servers) {
    util.log('Received servers.');
    fs.writeFile('server/csgo-client/servers.json', JSON.stringify(servers, null, 2));
}

var logOnDetails = {
    'account_name': username,
    'password': password
};

steamUser.on('updateMachineAuth', function(response, callback){
    fs.writeFileSync('server/csgo-client/sentry', response.bytes);
    callback({ sha_file: MakeSha(response.bytes) });
});

//TODO: use bluebird correctly this is not q ...
csgoClient.requestLiveGameForUser = function(playerId) {
    if (!ready)
        return Promise.resolve({});

    var existingMatchEnriched = matchsConsumerHashMap[playerId];

    if (typeof existingMatchEnriched === 'undefined') {
        var newMatchEnriched = { match: Promise.defer(), dateSentToGC: null };
        matchsConsumerHashMap[playerId] = newMatchEnriched;
        return newMatchEnriched.match.promise;
    } else {
        return existingMatchEnriched.match.promise;
    }
}

csgoClient.matchmakingStatsRequest = function() {
    if (!ready)
        return Promise.resolve({});
    matchmakingStats = Promise.defer(); //TODO: use bluebird correctly this is not q ...
    CSGO.matchmakingStatsRequest();
    return matchmakingStats.promise;
}

csgoClient.toSteamID = function(accid) {
    return CSGO.ToSteamID(accid);
}


var runEveryXSeconds = function(callback, x) {
    // run every second
    callback();

    setTimeout(function() {
        runEveryXSeconds(callback, x);
    }, x * 1000);
};

var cleanOldMatches = function() {
    var newMatchsConsumerHashMap = {};

    _.each(matchsConsumerHashMap, function(matchEnriched, i) {
        var limitDate = new Date(Date.now() - SEC_MATCH_REQUEST_ALLOWED * 1000);

        if (matchEnriched && matchEnriched.dateSentToGC && matchEnriched.dateSentToGC < limitDate) {
            matchEnriched.match.resolve({});
        } else {
            newMatchsConsumerHashMap[i] = matchEnriched;
        }
    });

    matchsConsumerHashMap = newMatchsConsumerHashMap;
}

var consumeOldestMatch = function() {
    var matchEnrichedNotHandledKey = _.findKey(matchsConsumerHashMap, "dateSentToGC", null);
    if (typeof matchEnrichedNotHandledKey !== 'undefined') {
        matchsConsumerHashMap[matchEnrichedNotHandledKey].dateSentToGC = Date.now();
        CSGO.requestLiveGameForUser(CSGO.ToAccountID(matchEnrichedNotHandledKey));
    }
}

var DEBUG_process_match = function() {
    console.log('[DEBUG] Processing match for debug and outputing to file');
    var p = csgoClient.requestLiveGameForUser('76561198053991737');
    p.then(function(res) {
        fs.appendFile('server/csgo-client/debugfile', JSON.stringify(res, null, 2) + '\n\n');
    });
}

var init = function() {
    if (authCode !== '') {
        logOnDetails.auth_code = authCode;
    }
    var sentry = fs.readFileSync('server/csgo-client/sentry');
    if (sentry.length) {
        logOnDetails.sha_sentryfile = MakeSha(sentry);
    }

    bot.connect();

    bot.on('logOnResponse', onSteamLogOn)
        .on('sentry', onSteamSentry)
        .on('servers', onSteamServers)
        .on('connected', function(){
            steamUser.logOn(logOnDetails);
        });

    runEveryXSeconds(consumeOldestMatch, SEC_BETWEEN_CONSUME);
    runEveryXSeconds(cleanOldMatches, SEC_BETWEEN_CLEAN);

    //runEveryXSeconds(DEBUG_process_match, 5);
}

init();

module.exports = csgoClient;
