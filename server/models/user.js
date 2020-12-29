"use strict";

var connection = require('../connection');
var Promise = require('bluebird');
var _ = require('lodash');

class User {
    static get limitTrackedPlayers() { return 100; };
    static get limitHistoryPlayers() { return 100; };

    static GetInfos(userId, playerIds, callback) {
        var history;
        var trackedplayer;

        var qsHistory = `SELECT idPlayer as id, lastSeenDate, timeSeen FROM \`history\` WHERE user = '${userId}' && idPlayer IN (${playerIds.join(',')})`;
        connection.query(qsHistory, (err, rows, fields) => {
            if (!err) {
                history = rows;

                var qsTrackedPlayer = `SELECT Count(*) as count, trackedPlayer as id FROM \`trackedplayer\` WHERE trackedPlayer IN  (${playerIds.join(',')}) GROUP BY trackedPlayer`
                connection.query(qsTrackedPlayer, (err, rows, fields) => {
                    if (!err) {
                        trackedplayer = rows;
                        callback(null, User._ProcessInfos(history, trackedplayer));
                    }
                    else
                        callback({ status: 500, data: 'Error while performing Query ' + qsTrackedPlayer + " : " + JSON.stringify(err) }, null);
                });
            }
            else
                callback({ status: 500, data: 'Error while performing Query ' + qsHistory + " : " + JSON.stringify(err) }, null);
        });
    }


    static GetTrackedPlayers(userId, callback) {
        var qs = `SELECT * FROM \`trackedplayer\` WHERE user = '${userId}' LIMIT ${User.limitTrackedPlayers}`;
        connection.query(qs, (err, rows, fields) => {
            if (!err)
                callback(null, rows);
            else
                callback({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) }, null);
        });
    }

    static AddTrackedPlayer(userId, trackedPlayer, isBanned, callback) {
        var qs = `SELECT COUNT(*) FROM \`trackedplayer\` WHERE user = '${userId}' && trackedPlayer = '${trackedPlayer}'`;
        connection.query(qs, (err, rows, fields) => {
            if (!err) {
                if (rows.length == 0) {
                    callback({ status: 409, data: 'Player already tracked' }, null);
                    return;
                }
                var qs = `SELECT COUNT(*) as count FROM \`trackedplayer\` WHERE user = '${userId}'`;
                connection.query(qs, (err, rows, fields) => {
                    if (!err) {
                        if(rows[0].count >= User.limitTrackedPlayers) {
                            callback({ status: 403, data: 'limit of trackedPlayers reached for this account' }, null);
                            return;
                        }
                        var qs = `INSERT INTO trackedplayer(user, trackedPlayer, isBanned) VALUES( '${userId}', '${trackedPlayer}', ${isBanned})`;
                        connection.query(qs, (err, rows, fields) => {
                            if (!err)
                                callback(null, { user: userId, trackedPlayer: trackedPlayer, isBanned: isBanned });
                            else
                                callback({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) }, null);
                        });
                    } else {
                        callback({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) }, null);
                    }
                });
            } else {
                callback({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) }, null);
            }
        });
    }

    static RemoveTrackedPlayer(userId, trackedPlayer, callback) {
        var qs = `DELETE FROM \`trackedplayer\` WHERE user = '${userId}' && trackedPlayer = ${trackedPlayer}`;
        connection.query(qs, (err, rows, fields) => {
            if (!err)
                callback(null, rows);
            else
                callback({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) }, null);
        });
    }

    static UpdateTrackedPlayer(userId, trackedPlayer, isBanned, callback) {
        var qs = `UPDATE \`trackedplayer\` SET isBanned = ${isBanned} WHERE user = '${userId}' AND trackedPlayer = ${trackedPlayer}`;
        connection.query(qs, (err, rows, fields) => {
            if (!err)
                callback(null, rows);
            else
                callback({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) }, null);
        });
    }

    static GetHistory(userId, callback) {
        var qs = `SELECT * FROM \`history\` WHERE user = '${userId}' ORDER BY lastSeenDate DESC LIMIT ${User.limitHistoryPlayers}`;
        connection.query(qs, (err, rows, fields) => {
            if (!err)
                callback(null, rows);
            else
                callback({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) }, null);
        });
    }

    static AddPlayersToHistory(userId, players, callback) {
        if (!players || players.length == undefined)
            callback({ status: 400, data: 'data wrongly formated: ' + JSON.stringify(players) }, null);

        var insertOrUpdatePlayerPromise = function(userId, player) {
            return new Promise(function(resolve, reject) {
                var qs = `SELECT COUNT(*) as count FROM \`history\` WHERE user = '${userId}' && idPlayer = '${player.id}'`;
                connection.query(qs, (err, rows, fields) => {
                    if (!err) {
                        if (rows[0].count > 0) {
                            var qs = `UPDATE \`history\` SET timeSeen = timeSeen+1, lastSeenDate = NOW() WHERE user = '${userId}' && idPlayer = '${player.id}'`;
                            connection.query(qs, (err, rows, fields) => {
                                if (!err) {
                                    resolve({
                                        idPlayer: player.id,
                                        user: userId,
                                        lastSeenDate: Date.now(),
                                        timeSeen: -1, //return -1 if the row hasbeen incremented
                                        isBanned: null
                                    });
                                } else {
                                    reject({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) });
                                }
                            });
                        } else {
                            var qs = `INSERT INTO history(user, idPlayer, lastSeenDate, timeSeen, isBanned) VALUES('${userId}', '${player.id}', NOW(), 1, '${player.isBanned}')`;
                            connection.query(qs, (err, rows, fields) => {
                                if (!err) {
                                    resolve({
                                        idPlayer: player.id,
                                        user: userId,
                                        lastSeenDate: Date.now(),
                                        timeSeen: 1, //return -1 if the row hasbeen incremented
                                        isBanned: player.isBanned
                                    });
                                } else {
                                    reject({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) });
                                }
                            });
                        }
                    } else {
                        reject({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) });
                    }
                });
            });
        }

        var playerPromises = [];
        //Try to see if couple user/idPlayer already exist if so, increment timeSeen and update lastSeenDate
        for (var i = 0; i < players.length; i++) {
            if (players[i].id === undefined || players[i].isBanned === undefined) {
                callback({ status: 400, data: 'data wrongly formated: ' + JSON.stringify(players) }, null);
                return;
            }

            playerPromises.push(insertOrUpdatePlayerPromise(userId, players[i]));
        }

        Promise.each(playerPromises, p => p, { concurrency: 1 }).then(
            (historyPlayers) => {
                // check if the max amont of row is exeeded if so remove X row so that the total is 100
                var qs2 = `SELECT COUNT(*) as count FROM \`history\` WHERE user = '${userId}'`;
                connection.query(qs2, (err, rows, fields) => {
                    if (!err) {
                        if (rows[0].count > User.limitHistoryPlayers) {
                            var qs = `DELETE FROM \`history\` WHERE user = '${userId}' ORDER BY lastSeenDate ASC LIMIT ${User.limitHistoryPlayers}`
                            connection.query(qs, (err, rows, fields) => {
                                if (!err)
                                    callback(null, historyPlayers);
                                else
                                    callback({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) }, null);
                            });
                        } else {
                            callback(null, historyPlayers);
                        }
                    } else {
                        callback({ status: 500, data: 'Error while performing Query ' + qs2 + " : " + JSON.stringify(err) }, null);
                    }
                });
            },
            (err) => {
                callback(err, null);
            });
    }

    static UpdateHistory(userId, players, callback) {
        if (!players || players.length == undefined)
            callback({ status: 400, data: 'data wrongly formated: ' + JSON.stringify(players) }, null);

        var updatePlayerPromise = function(userId, player) {
            return new Promise(function(resolve, reject) {
                var qs = `UPDATE \`history\` SET isBanned = ${player.isBanned} WHERE user = ${userId} && idPlayer = ${player.id}`;
                connection.query(qs, (err, rows, fields) => {
                    if (!err)
                        resolve({
                            idPlayer: player.id,
                            user: userId,
                            lastSeenDate: Date.now(),
                            isBanned: player.isBanned
                        });
                    else
                        reject({ status: 500, data: 'Error while performing Query ' + qs + " : " + JSON.stringify(err) });
                });
            });
        }

        var updatePromises = [];
        for (var i =0; i < players.length; i++) {
            if (players[i].id === undefined || players[i].isBanned === undefined) {
                callback({ status: 400, data: 'data wrongly formated: ' + JSON.stringify(players) }, null);
                return;
            }
            updatePromises.push(updatePlayerPromise(userId, players[i]))
        }

        Promise.each(updatePromises, p => p, { concurrency: 1 }).then(
            (res) => callback(null, res),
            (err) => callback(err, null)
        );
    }

    static _ProcessInfos(history, trackedplayer) {
        return _.map(history, (item) => {
            return _.extend(item, _.findWhere(trackedplayer, { id: item.id }));
        });
    }
}

module.exports = User;
