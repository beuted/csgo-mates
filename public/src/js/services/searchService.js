app.factory('searchService', ['$rootScope', '$q', '$http', '$timeout', 'ngNotify', 'trackingService', 'historyService', 'steamIdService', 'playerInfoDbService',
            function ($rootScope, $q, $http, $timeout, ngNotify, trackingService, historyService, steamIdService, playerInfoDbService) {
    var searchService = {};
    var retryLimit = 3;

    searchService.canceled = false;

    searchService.cancel = function() {
        searchService.canceled = true;
        // httpRetry.cancelAll();
    };

    searchService.fillEmptyPlayerRows = function(playerIds) {
        var playerRowsResult = [];

        for (var i = 0; i < playerIds.length; i++) {
            playerRowsResult.push({
                id: playerIds[i],
                hasCsgo: true,
                info: {
                    name: null,
                    profileUrl: null,
                    urlAvatar: null,
                    group: -1,
                    countryFlag: null,
                    visibility: null
                },
                kdr: null,
                winPercentage: null,
                hsPercentage: null,
                favWeapon: null,
                hoursPlayed: null,
                lastMatch: {
                    roundsTotal: null,
                    roundsWon: null,
                    killDeath: null,
                    favWeapon: null,
                    accuracy: null
                },
                vacStatus: {
                    numberOfVACBans: null,
                    numberOfGameBans: null,
                    daysSinceLastBan: null
                },
                history: {
                    lastSeenDate: null,
                    timeSeen: null
                },
                suspicionStatus: {
                    suspicionScore: 0,
                    suspicionPros: [],
                    suspicionCons: [],
                    suspicionMiddle: [],
                    suspicionCount: 0
                },
                watched: false
            });
        }
        return playerRowsResult;
    };

    searchService.processWatchedPlayers = function(playerRows) {
        var playersWithWatchInfo = $q.defer();
        trackingService.getTrackerPlayers()
        .then(function(trackedPlayers) {
            for (var i = 0; i < playerRows.length; i++) {
                var trackedPlayer = _.find(trackedPlayers, function(player) {return player.trackedPlayer === playerRows[i].id});
                playerRows[i].watched = !!trackedPlayer;
            }
            playersWithWatchInfo.resolve(playerRows);
        }, function(error) {
             playersWithWatchInfo.reject('We could not access CSGO-MATES database, please contact support');
        });

        return playersWithWatchInfo;
    };

    searchService.processPlayersSuspicons = function(_playerRows) {
        for (var i = 0; i < _playerRows.length; i++) {
            // private profile
            if (_playerRows[i].info.visibility == 1) {
                _playerRows[i].suspicionStatus.suspicionMiddle.push('Private profile');
                // count the account digits
                var nbOfDigits = steamIdService.steamId64To32(_playerRows[i].id).length;
                if (nbOfDigits >= 9) {
                    _playerRows[i].suspicionStatus.suspicionCons.push(nbOfDigits + ' digits account id (new account)');
                    _playerRows[i].suspicionStatus.suspicionScore = -5;
                } else if (nbOfDigits <= 7) {
                    _playerRows[i].suspicionStatus.suspicionPros.push(nbOfDigits + ' digits account id (old account)');
                    _playerRows[i].suspicionStatus.suspicionScore = +3;
                } else {
                    _playerRows[i].suspicionStatus.suspicionScore = -3;
                }
            // public profile
            } else {
                _playerRows[i].suspicionStatus.suspicionPros.push('Public profile');

                // count the played hours
                if (_playerRows[i].hoursPlayed !== null) {
                    if (_playerRows[i].hoursPlayed <= 50) {
                        _playerRows[i].suspicionStatus.suspicionCons.push('Time in game: ' + _playerRows[i].hoursPlayed + 'h');
                        _playerRows[i].suspicionStatus.suspicionScore -= 5;
                    } else if (_playerRows[i].hoursPlayed <= 150) {
                        _playerRows[i].suspicionStatus.suspicionMiddle.push('Time in game: ' + _playerRows[i].hoursPlayed + 'h');
                        _playerRows[i].suspicionStatus.suspicionScore -= 1;
                    } else if (_playerRows[i].hoursPlayed >= 300) {
                        _playerRows[i].suspicionStatus.suspicionPros.push('Time in game: ' + _playerRows[i].hoursPlayed + 'h');
                        _playerRows[i].suspicionStatus.suspicionScore += 5;
                    }
                }

                // track too high kdr
                if (_playerRows[i].kdr > 3) {
                    _playerRows[i].suspicionStatus.suspicionCons.push('Very high kill death ratio of ' + _playerRows[i].kdr);
                    _playerRows[i].suspicionStatus.suspicionScore -= 3;
                }
            }

            // vac bans
            if (_playerRows[i].vacStatus.numberOfVACBans) {
                _playerRows[i].suspicionStatus.suspicionCons.push('VacBanned ' + _playerRows[i].vacStatus.numberOfVACBans + ' time(s)');
                _playerRows[i].suspicionStatus.suspicionScore -= 3;
            }

            // game bans
            if (_playerRows[i].vacStatus.numberOfGameBans) {
                _playerRows[i].suspicionStatus.suspicionCons.push('GameBanned ' + _playerRows[i].vacStatus.numberOfGameBans + ' time(s)');
                _playerRows[i].suspicionStatus.suspicionScore -= 3;
            }

            // if he has a ban, compute time before previous ban
            if (_playerRows[i].vacStatus.numberOfVACBans || _playerRows[i].vacStatus.numberOfGameBans) {
                if (_playerRows[i].vacStatus.daysSinceLastBan < 365) {
                    _playerRows[i].suspicionStatus.suspicionCons.push(_playerRows[i].vacStatus.daysSinceLastBan + ' days since last ban');
                    _playerRows[i].suspicionStatus.suspicionScore -= 3;
                } else if (_playerRows[i].vacStatus.daysSinceLastBan < 365*2) {
                    _playerRows[i].suspicionStatus.suspicionMiddle.push(_playerRows[i].vacStatus.daysSinceLastBan + ' days since last ban');
                } else {
                    _playerRows[i].suspicionStatus.suspicionPros.push(_playerRows[i].vacStatus.daysSinceLastBan + ' days since last ban');
                    _playerRows[i].suspicionStatus.suspicionScore += 2;
                }
            }
        }
        return _playerRows;
    };

    searchService.processPlayersDbInfo = function(_playerRows) {
        var playerDbInfoDefer = $q.defer();
        var _playerIds = _.pluck(_playerRows, 'id');

        if (!$rootScope.user) {
            playerDbInfoDefer.resolve(_playerRows);
            return playerDbInfoDefer;
        }

        playerInfoDbService.get(_playerIds)
            .then(
                function(playerInfoDbs) {
                    for (var i = 0; i < _playerRows.length; i++) {
                        // find the matching player in request :
                        for (var j = 0; j < playerInfoDbs.length; j++) {
                            if (playerInfoDbs[j].id == _playerRows[i].id) {
                                _playerRows[i].history.lastSeenDate =
                                    (playerInfoDbs[j].lastSeenDate === null)
                                        ? null
                                        : moment(playerInfoDbs[j].lastSeenDate, 'YYYY-MM-DD hh:mm:ss').fromNow();
                                _playerRows[i].history.timeSeen = playerInfoDbs[j].timeSeen;
                                _playerRows[i].suspicionStatus.suspicionCount = playerInfoDbs[j].count;
                                break;
                            }
                        }
                    }
                    playerDbInfoDefer.resolve(_playerRows);
                },
                function(error) {
                    playerDbInfoDefer.reject('We could not access CSGO-MATES database, please contact support');
                    ga('send', 'event', 'InternalFail', {err: {playerIds: _playerIds, error: error}, env: metadata.build}, "failGetPlayerDbInfoStandard");
                        ngNotify.errorOccured = true;
                        ngNotify.set('<i class="fa fa-exclamation-triangle"></i> Oops, one player you searched for does not exist <i class="fa fa-exclamation-triangle"></i>', 'error');
                });

        return playerDbInfoDefer;
    }

    searchService.processPlayerSummary = function(_playerRows) {
        var playerSumDefer = $q.defer();
        var _playerIds = _.pluck(_playerRows, "id");

        $http.get("./api/steam-proxy/players/" + _playerIds.join(',') + "/summary").then(
            function(jsonPlayer) {
                for (var i = 0; i < _playerRows.length; i++) {
                    // find the matching player in request :
                    var found = false;
                    for (var j = 0; j < jsonPlayer.data.response.players.length; j++) {
                        if (jsonPlayer.data.response.players[j].steamid == _playerRows[i].id) {
                            computePlayersSummary(_playerRows[i], jsonPlayer.data.response.players[j]);
                            found = true;
                            break;
                        }
                    }
                    // if the playerid was not found in the server response he does not exist
                    if(!found) {
                        ga('send', 'event', 'InternalFail', {err: {playerIds: _playerRows[i].id, jsonPlayer: jsonPlayer}, env: metadata.build}, "failPlayerNotInPlayerSummaryRequest");
                        ngNotify.errorOccured = true;
                        ngNotify.set("<i class='fa fa-exclamation-triangle'></i> Oops, one player you searched for does not exist <i class='fa fa-exclamation-triangle'></i>", "error");
                    }
                }
                playerSumDefer.resolve(_playerRows);
            },
            function(error) {
                ngNotify.dismiss();
                if (error !== 'cancel') {
                    ga('send', 'event', 'SteamFail', JSON.stringify({err: error ? error.data : null, env: metadata.build}), "processPlayerSummaryFailedDespiteRetries");
                    ngNotify.set("<i class='fa fa-exclamation-triangle'></i> Oops, we didn't managed to contact steam servers, please try again later <i class='fa fa-exclamation-triangle'></i>", "error");
                }
                playerSumDefer.reject('We could not retrieve Gabe data');
            });

        return playerSumDefer;
    };

    searchService.processPlayerVacStatus = function(_playerRows) {
        var vacbanDefer = $q.defer();
        var _playerIds = _.pluck(_playerRows, 'id');

        $http.get('./api/steam-proxy/players/' + _playerIds.join(',') + '/bans').then(
            function(jsonPlayersVacStatus) {
                var playerRowsCopy = _playerRows; //TODO: why don't I need a closure here :s ?
                for (var i = 0; i < _playerRows.length; i++) {
                    var found = false;
                    for (var j = 0; j < jsonPlayersVacStatus.data.players.length; j++) {
                        if (jsonPlayersVacStatus.data.players[j].SteamId == _playerRows[i].id) {
                            computePlayersVacStatus(playerRowsCopy[i], jsonPlayersVacStatus.data.players[j]);
                            found = true;
                            break;
                        }
                    }
                    // if the playerid was not found in the server response he does not exist
                    if(!found) {
                        ga('send', 'event', 'InternalFail', JSON.stringify({err: {playerIds: _playerIds[i], jsonPlayersVacStatus: jsonPlayersVacStatus}, env: metadata.build}), 'failPlayerNotInVacBansRequest');
                        ngNotify.errorOccured = true;
                        ngNotify.set('<i class="fa fa-exclamation-triangle"></i> Oops, one player you searched for does not exist <i class="fa fa-exclamation-triangle"></i>', 'error');
                    }
                }
                vacbanDefer.resolve(playerRowsCopy);
            },
            function(error) {
                ngNotify.dismiss();
                if (error !== 'cancel') {
                    ga('send', 'event', 'SteamFail', JSON.stringify({err: error ? error.data : null ? error.data : null ? error.data : null , env: metadata.build}), "processPlayerVacStatusFailedDespiteRetries");

                    ngNotify.set('<i class="fa fa-exclamation-triangle"></i> Oops, we didn\'t managed to contact steam servers, please try again later <i class="fa fa-exclamation-triangle"></i>', 'error');
                }
                vacbanDefer.reject('We could not process VAC statuses');
            });

        return vacbanDefer;
    };

    searchService.processFriendLists = function(_playerRows) {
        var allFriendListDefer = $q.defer();

        // map of players with firendList resolved plus linking list
        var friendListResolved = [];
        var playerLinkList = [];
        for (var i = 0; i < _playerRows.length; i++) {
            friendListResolved.push(false);
            playerLinkList.push({ id: _playerRows[i].id, group: -1, done: 0, listFriends: [] });
        }

        var processFriendLinkList = function(playerLinkList) {
            var actualGroup = 0;
            var sameGroupList = [];
            var groupRelationList = [];

            for (var i = 0; i < playerLinkList.length; i++) {
                if (playerLinkList[i].done == 0) {
                    playerLinkList[i].group = actualGroup;
                    playerLinkList[i].done = 1;
                    addFriendsInGame(playerLinkList[i].listFriends, playerLinkList, sameGroupList);
                    // browse friends and add peole to the list to lookup
                    for (var j = 0; j < sameGroupList.length; j++) {
                        if (playerLinkList[sameGroupList[j]].done == 0 ) {
                            playerLinkList[sameGroupList[j]].group = actualGroup;
                            playerLinkList[sameGroupList[j]].done = 1;
                            addFriendsInGame(playerLinkList[i].listFriends, playerLinkList, sameGroupList);
                        } else {
                            // Cas where two groups needs to be merged
                            if (playerLinkList[sameGroupList[j]].group != actualGroup) {
                                groupRelationList.push({g1: playerLinkList[sameGroupList[j]].group, g2: actualGroup});
                            }
                        }
                    }

                    sameGroupList = [];
                    actualGroup++;
                }
            }

            // Merge the groups
            for (var i = 0; i < groupRelationList.length; i++) {
                var g1 = groupRelationList[i].g1;
                var g2 = groupRelationList[i].g2;
                if (g1 != g2) {
                    //update the playerLinkList
                    for (var j = 0; j < playerLinkList.length; j++) {
                        if (playerLinkList[j].group == g1) {
                            playerLinkList[j].group =  g2
                        }
                    }

                    // update the groupRelationList
                    for (var k = 0; k < groupRelationList.length; k++) {
                        if (groupRelationList[k].g1 == g1) {
                            groupRelationList[k].g1 = g2;
                        }
                        if (groupRelationList[k].g2 == g1) {
                            groupRelationList[k].g2 = g2;
                        }
                    }
                }
            }
        };

        var checkIfAllFriendListPromisesResolved = function() {
            // Check if all the promises are resolved
            var done = true;
            for (var i = 0; i < _playerRows.length; i++) {
                if (!friendListResolved[i]) {
                    done = false;
                    break;
                }
            }
            if (done) {
                //TODO that should go in a function
                processFriendLinkList(playerLinkList);

                // add color to players
                for (var i = 0; i < _playerRows.length; i++) {
                    _playerRows[i].info.group = playerLinkList[i].group;
                }
                // sort players by group (apply same transofrmation to playerIds)
                var playerRowOrdered = _.sortBy(_playerRows, function(row) {
                    return row.info.group;
                });
                for (var i = 0; i < playerRowOrdered.length; i++) {
                    _playerRows[i] = playerRowOrdered[i];
                }

                allFriendListDefer.resolve(_playerRows);
            }
        };

        // -- Iterate through the list of player id and Link the friends together --
        for (var i = 0; i < _playerRows.length; i++) {
            // Pass the parameter "i" to the done functions
            (function(index) {
                if (_playerRows[index].info.visibility != 1) {
                    $http.get('./api/steam-proxy/players/' + _playerRows[index].id + '/friend-list').then(
                        function(response) {
                            var friendListObject = response.data;

                            if (!$.isEmptyObject(friendListObject) && !angular.isUndefined(friendListObject.friendslist)) {
                                var rawListFriend = friendListObject.friendslist.friends;
                                for (var j = 0; j < rawListFriend.length; j++) {
                                    playerLinkList[index].listFriends.push(rawListFriend[j].steamid);
                                }
                            }
                            friendListResolved[index] = true;
                            checkIfAllFriendListPromisesResolved();
                        },
                        function(error) {
                            ngNotify.dismiss();
                            if (error !== 'cancel') {
                                ga('send', 'event', 'SteamFail', JSON.stringify({err: error ? error.data : null, env: metadata.build}), 'checkIfAllFriendListPromisesResolvedFailedDespiteRetries');
                                ngNotify.set('<i class="fa fa-exclamation-triangle"></i> Oops, we didn\'t manage to contact steam servers, please try again later <i class="fa fa-exclamation-triangle"></i>', 'error');
                            }
                            friendListResolved[index] = true;
                            checkIfAllFriendListPromisesResolved();
                        });
                } else {
                    friendListResolved[index] = true;
                    checkIfAllFriendListPromisesResolved();
                }
            })(i);
        }

        return allFriendListDefer;
    };

    searchService.processPlayerStats = function(_playerRows) {
        var allPlayerStatsDefer = $q.defer();

        // init
        var playerStatsResolved = [];
        for (var i = 0; i < _playerRows.length; i++) {
            playerStatsResolved.push($q.defer());
        }

        //-- Process Players csgo stats --
        for (var i = 0; i < _playerRows.length; i++) {
            (function(index) {
                // if player visibility is private don't send request (would get a 500 (Internal Server Error))
                if (_playerRows[index].info.visibility != 1) {
                    $http.get('./api/steam-proxy/players/' + _playerRows[index].id + '/csgo-stats').then(
                        function(jsonPlayerStat) {
                            if (jsonPlayerStat.data.playerstats && _playerRows[index]) {
                                computePlayersCsgoStats(_playerRows[index], jsonPlayerStat.data.playerstats.stats);
                            } else {
                                // avoid adding this user to history
                                _playerRows[index].hasCsgo = false;
                            }
                            playerStatsResolved[index].resolve(_playerRows[index]);
                        },
                        function(error) {
                            // TODO: remove this fix when steamapi is working again
                            // try http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=xxxxxxxxxxxxxxxxx&steamids=76561198009480410
                            // communityvisibilitystate should be 1
                            _playerRows[index].info.visibility = 3;
                            playerStatsResolved[index].resolve(_playerRows[index]);
                            _playerRows[index].suspicionStatus.suspicionMiddle.push('Private profile');

                            // ngNotify.dismiss();
                            // if (error !== "cancel") {
                            //     ga('send', 'event', 'SteamFail', JSON.stringify({err: error ? error.data : null, env: metadata.build}), "processPlayerStatsFailedDespiteRetries");
                            //     ngNotify.set("<i class='fa fa-exclamation-triangle'></i> Oops, we didn't manage to contact steam servers, please try again later <i class='fa fa-exclamation-triangle'></i>", "error");
                            // }
                            // playerStatsResolved[index].reject("Unable to contact steam");
                        });
                } else {
                    playerStatsResolved[index].resolve(_playerRows[index]);
                }
            })(i);
        }
        var allPlayerStatsDefer = $q.defer();
        $q.all(_.map(playerStatsResolved, function(defer){ return defer.promise; })).then(
            function(res){
                allPlayerStatsDefer.resolve(res);
            },
            function(err) {
                allPlayerStatsDefer.reject('We could not process players stats');
            });
        return allPlayerStatsDefer;
    };

    searchService.removePlayersWithoutCsgo = function(_playerRows) {
        return _.filter(_playerRows, function(player) { return player.hasCsgo; });
    };

    searchService.handleNewCheaters = function(_playerRows) {
        if (historyService.cheatersSpotted.length > 0) {
            // update the UI accordingly (new cheaters in red)
            for (var i = 0; i < historyService.cheatersSpotted.length; i++) {
                var row = _.findWhere(_playerRows, {id: historyService.cheatersSpotted[i]});
                if (row)
                    row.focused = true;
            }

            // update the db so that this players won't show up next connexion TODO: persist for 1 day ?
            var cheatersSpotted = _.map(historyService.cheatersSpotted, function(id) {
               return {id: id, isBanned: 1};
            });
            historyService.updateSeenPlayers(cheatersSpotted);
        }
    };

    searchService.computePlayerRows = function(playerIds, computeFriends, handleNewCheaters) {
        if (playerIds.length <= 0) {
           return $q.when([]);
        }

        var playerRowComputedDefer = $q.defer();
        searchService.canceled = false;

        // -- Fill the list of rows with dummy data --
        var playerRows = searchService.fillEmptyPlayerRows(playerIds);

        // -- Fill the watched fields of player rows --
        ngNotify.setSpin('Getting players you are watching');
        var res = searchService.processWatchedPlayers(playerRows).promise
            .then(function(playersWithWatchInfo) {
                if (searchService.canceled) { return $q.reject('canceled'); }
                ngNotify.setSpin('Processing Gabe data');
                return searchService.processPlayerSummary(playersWithWatchInfo).promise;
            }, function(error) {
                return $q.reject(error);
            })
            .then(function(playersWithSummaryInfo) {
                if (searchService.canceled) { return $q.reject('canceled'); }
                ngNotify.setSpin('Finding cheaters');
                return searchService.processPlayerVacStatus(playersWithSummaryInfo).promise;
            }, function(error) {
                return $q.reject(error);
            })
            .then(function(playersWithVacStatusInfo) {
                if (searchService.canceled) { return $q.reject('canceled'); }
                if (computeFriends === true) {
                    //ngNotify.setSpin('Matching m8\'s');
                    return searchService.processFriendLists(playersWithVacStatusInfo).promise;
                } else {
                    return playersWithVacStatusInfo;
                }
            }, function(error) {
                return $q.reject(error);
            })
            .then(function(playersWithFriendsInfo) {
                if (searchService.canceled) { return $q.reject('canceled'); }
                ngNotify.setSpin('Collecting skillZ');
                return searchService.processPlayerStats(playersWithFriendsInfo).promise;
            }, function(error) {
                return $q.reject(error);
            })
            .then(function(playersWithStatsInfo) {
                if (searchService.canceled) { return $q.reject('canceled'); }
                ngNotify.setSpin('Adding moar data');
                return searchService.processPlayersDbInfo(playersWithStatsInfo).promise;
            }, function(error) {
                return $q.reject(error);
            })
            .then(function(playersWithDbInfo) {
                if (searchService.canceled) { return $q.reject('canceled'); }
                //ngNotify.setSpin('Suspecting peoples');
                var playersWithSuspicionInfo = searchService.processPlayersSuspicons(playersWithDbInfo);
                return searchService.removePlayersWithoutCsgo(playersWithSuspicionInfo);
            }, function(error) {
                return $q.reject(error);
            })
            .then(function(playersFinal) {
                if (searchService.canceled) { return $q.reject('canceled'); }
                if (handleNewCheaters)
                    searchService.handleNewCheaters(playersFinal);
                ngNotify.set('Done!', { type: 'classic', sticky: false });
                return playersFinal;
            }, function(error) {
                //Mad logic to show error
                if (error !== 'canceled')
                    ngNotify.set('Error: ' + error, 'error');

                return [];
            });

        return res;
    };

    // UTILITIES

    var addFriendsInGame = function(friendList, playerLinkList, sameGroupList) {
        for(var i = 0; i < friendList.length; i++) {
            for(var j = 0; j < playerLinkList.length; j++) {
                if (friendList[i] == playerLinkList[j].id) {
                    sameGroupList.push(j);
                }
            }
        }
    }

    var computePlayersSummary = function(playerRow, playerSummary) {
        // Acc visibility 1 = private, 2 = ?, 3 = public
        if(!(typeof playerSummary.communityvisibilitystate === 'undefined')) {
            playerRow.info.visibility = playerSummary.communityvisibilitystate;
        }

        // Account age
        if(!(typeof playerSummary.timecreated === 'undefined')) {
            var currentTime = Math.round(new Date().getTime() / 1000);
            var accountAge = ((currentTime - playerSummary.timecreated) / 31536000).toFixed(1);
        }

        // Country flag
        if(!(typeof playerSummary.loccountrycode === 'undefined')) {
            playerRow.info.countryFlag = "http://cdn.steamcommunity.com/public/images/countryflags/"
                + playerSummary.loccountrycode.toLowerCase() + ".gif";
        }

        // Url of the player avatar
        playerRow.info.urlAvatar = playerSummary.avatarmedium;

        // Nick of the player
        playerRow.info.name = playerSummary.personaname;

        // Url to his steam profile
        playerRow.info.profileUrl = playerSummary.profileurl;
    }

    var computePlayersVacStatus = function (playerRow, playerVacStatus) {
        playerRow.vacStatus.numberOfVACBans = playerVacStatus.NumberOfVACBans;
        playerRow.vacStatus.numberOfGameBans = playerVacStatus.NumberOfGameBans;
        playerRow.vacStatus.daysSinceLastBan = playerVacStatus.DaysSinceLastBan
    }

    var computePlayersCsgoStats = function (playerRow, playerStats) {
        var total_kills = _.findWhere(playerStats, {name: "total_kills"});
        var total_deaths = _.findWhere(playerStats, {name: "total_deaths"});
        var total_matches_won = _.findWhere(playerStats, {name: "total_matches_won"});
        var total_matches_played = _.findWhere(playerStats, {name: "total_matches_played"});
        var total_kills_headshot = _.findWhere(playerStats, {name: "total_kills_headshot"});
        var total_shots_hit = _.findWhere(playerStats, {name: "total_shots_hit"});
        var total_shots_fired = _.findWhere(playerStats, {name: "total_shots_fired"});
        var total_wins_pistolround = _.findWhere(playerStats, {name: "total_wins_pistolround"});
        var total_time_played = _.findWhere(playerStats, {name: "total_time_played"});
        var last_match_favweapon_id = _.findWhere(playerStats, {name: "last_match_favweapon_id"});
        var last_match_favweapon_shots = _.findWhere(playerStats, {name: "last_match_favweapon_shots"});
        var last_match_favweapon_hits = _.findWhere(playerStats, {name: "last_match_favweapon_hits"});
        var last_match_kills = _.findWhere(playerStats, {name: "last_match_kills"});
        var last_match_deaths = _.findWhere(playerStats, {name: "last_match_deaths"});
        var last_match_wins = _.findWhere(playerStats, {name: "last_match_wins"});
        var last_match_ct_wins = _.findWhere(playerStats, {name: "last_match_ct_wins"});
        var last_match_t_wins = _.findWhere(playerStats, {name: "last_match_t_wins"});

        var max_kill = 0;
        var fav_weapon = "none";
        for (var i = 0; i < ListWeapons.length; i++) {
            var total_kill_curr = _.findWhere(playerStats, {name: "total_kills_" + ListWeapons[i]});
            if ( !(typeof total_kill_curr === 'undefined') && total_kill_curr.value > max_kill) {
                max_kill = total_kill_curr.value;
                fav_weapon = ListWeapons[i];
            }
        }
        playerRow.favWeapon = "img/weapons/" + fav_weapon + ".png";

        if(!(typeof total_kills === 'undefined' || typeof total_deaths === 'undefined')) {
            playerRow.kdr = (total_kills.value / total_deaths.value).toFixed(2);
        }

        if(!(typeof total_matches_won === 'undefined' || typeof total_matches_played === 'undefined')) {
            if (total_matches_played.value != 0) {
                playerRow.winPercentage = ((total_matches_won.value / total_matches_played.value)*100).toFixed(1);
            }
        }

        if(!(typeof total_kills_headshot === 'undefined' || typeof total_kills === 'undefined')) {
            playerRow.hsPercentage = ((total_kills_headshot.value / total_kills.value)*100).toFixed(1);
        }

        /*if(!(typeof total_shots_hit === 'undefined' || typeof total_shots_fired === 'undefined')) {
            playerRow.accuracy = ((total_shots_hit.value / total_shots_fired.value)*100).toFixed(1);
        }*/

        /*if(!(typeof total_wins_pistolround === 'undefined' || typeof total_matches_played === 'undefined')) {
            playerRow.prWinPerc = ((total_wins_pistolround.value / total_matches_played.value)*100).toFixed(1);
        }*/

        if(!(typeof total_time_played === 'undefined')) {
            playerRow.hoursPlayed = (total_time_played.value / 3600).toFixed(0);
        }

        if(!(typeof last_match_favweapon_id === 'undefined')) {
            playerRow.lastMatch.favWeapon = ListWeapons[last_match_favweapon_id.value];
        }

        if(!(typeof last_match_kills === 'undefined' || typeof last_match_deaths === 'undefined')) {
            playerRow.lastMatch.killDeath = last_match_kills.value + "/" + last_match_deaths.value;
        }

        if(!(typeof last_match_wins === 'undefined')) {
            playerRow.lastMatch.roundsWon = last_match_wins.value;
        }

        if(!(typeof last_match_t_wins === 'undefined' || typeof last_match_ct_wins === 'undefined')) {
            playerRow.lastMatch.roundsTotal = last_match_t_wins.value + last_match_ct_wins.value;
        }

        if(!(typeof last_match_favweapon_shots === 'undefined' || typeof last_match_favweapon_hits === 'undefined')) {
            if (last_match_favweapon_shots.value > 0) {
                playerRow.lastMatch.accuracy = ((last_match_favweapon_hits.value / last_match_favweapon_shots.value)*100).toFixed(1);
            } else {
                playerRow.lastMatch.accuracy = "0";
            }
        }
    }

    /*                              *******************                                 */
    /********************************     HELPERS     ***********************************/
    /*                              *******************                                 */
    /// list of all weapons
    var ListWeapons = [
        "none","deagle","elite","fiveseven","glock","p228","usp","ak47","aug","awp","famas","g3sg1","galil","galilar","m249","m3","m4a1",
        "mac10","mp5navy","p90","scout","sg550","sg552","tmp","ump45","xm1014","bizon","mag7","negev","sawedoff","tec9","taser","hkp2000",
        "mp7","mp9","nova","p250","scar17","scar20","sg556","ssg08","knifegg","knife","flashbang","hegrenade","smokegrenade","molotov",
        "decoy","incgrenade","c4"
    ];

    return searchService;
}]);
