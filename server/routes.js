"use strict";

var user = require('./routes/user');
var match = require('./routes/match');
var steamServer = require('./routes/steam-proxy');
var matchmakingStats = require('./routes/matchmaking-stats');
var steamAuth = require('./routes/steam-auth');

module.exports = function(app) {
    app.use('/api/current-user', user);
    app.use('/api/matches', match);
    app.use('/api/steam-proxy', steamServer);
    app.use('/api/matchmaking-stats', matchmakingStats);
    app.use('/api/auth/steam', steamAuth);
};
