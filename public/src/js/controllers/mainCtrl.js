app.controller("MainCtrl", ["$rootScope", "$scope", "$q", "$state", "$stateParams", "$http", "$animate", "$timeout", "smoothScroll", "ngNotify", "matchService",
               function ($rootScope, $scope, $q, $state, $stateParams, $http, $animate, $timeout, smoothScroll, ngNotify, matchService) {
    var resultSection = document.getElementById("result-section");

    // change bg
    $rootScope.randomizeBg();

    /// Text typed in the textarea
    $scope.searchQuery;

    /// used forsearch button state
    $scope.searchOnGoing = false;

    /// List of the players currently searched
    $scope.listPlayers = [];

    /// Current map
    $scope.currentMap = "";

    /// Current score
    $scope.currentScore = [0,0];

    /// Current score
    $scope.currentTime = 0;

    /// searched Player
    $scope.player = null;

    /// searched PlayerId
    $scope.playerId = null;

    $animate.enabled(true);

    var broadcastSearch = function(playerId) {
        $scope.listPlayers = [];
        $scope.playerId = playerId;
        $scope.player = null;
        $scope.currentMap = "";
        $scope.currentScore = [0,0];
        $scope.currentTime = 0;

        ngNotify.set('Retrieving match <i class="fa fa-circle-o-notch fa-spin"></i>', {
            type: 'classic',
            sticky: false
        });

        matchService.get(playerId).then(function(match) {
            if (match && match.listPlayers && match.listPlayers.length) {
                // Raise an error if there is not exactly 10 people in the game
                if (match.listPlayers.length !== 10) {
                    ga('send', 'event', 'InternalFail', JSON.stringify({err: match.listPlayers, env: metadata.build}), 'not10peopleInGame');
                }

                // Invert players in it's the second half
                if (match.team_scores && match.team_scores[0] + match.team_scores[1] > 15) {
                    match.listPlayers = match.listPlayers.reverse();
                    match.team_scores = match.team_scores.reverse();
                }


                if ($scope.searchQuery) {
                    ga('send', 'event', 'SearchSuccess', JSON.stringify({err: $scope.searchQuery, env: metadata.build}), "gameFoundFromSearch");
                } else {
                    ga('send', 'event', 'SearchSuccess', JSON.stringify({err: match.listPlayers, env: metadata.build}), "gameFoundForUrl");
                }
                $scope.listPlayers = match.listPlayers;
                $scope.searchOnGoing = true;

                $rootScope.selectBg(match.map);
                $scope.currentMap = match.map;
                $scope.currentScore = match.team_scores;
                $scope.currentTime = moment.duration(match.time, 'seconds').humanize();

                $timeout(function() {
                    $scope.$broadcast('listPlayersChanged');
                    smoothScroll(resultSection);
                });
            } else if (match) {
                // show an error if we couldn't access node server
                ga('send', 'event', 'SearchSuccess', JSON.stringify({err: $scope.searchQuery, env: metadata.build}), 'gameNotFoundPlayerFound');
                if (!match) {
                    ngNotify.set('Sorry we could not access steam steam API, try again later', 'error');
                    ga('send', 'event', 'InternalFail', JSON.stringify({err: $scope.searchQuery, env: metadata.build}), 'matchCantBeRetrieved');
                }

                // still start a research with only the current player to display profile
                $scope.listPlayers = [playerId];
                $scope.searchOnGoing = true;

                $timeout(function() {
                    $scope.$broadcast('listPlayersChanged');
                    smoothScroll(resultSection);
                });
            } else {
                ngNotify.set('Sorry we could not resolve players in your game, please contact the support', 'error');
                ga('send', 'event', 'InternalFail', JSON.stringify({err: $scope.searchQuery, env: metadata.build}), 'matchCantBeRetrieved');
            }

        }).catch(function(err) {
            ngNotify.set('Sorry we could not resolve players in your game, please contact the support', 'error');
            ga('send', 'event', 'InternalFail', JSON.stringify({err: $scope.searchQuery, env: metadata.build}), 'matchCantBeRetrieved');
        });
    }

    $scope.$on('searchDone', function(evt, playerRows) {
        $scope.searchOnGoing = false;
        var searchedPlayer = _.find(playerRows, function(player) { return player.id === $scope.playerId});
        if (searchedPlayer && searchedPlayer.hasCsgo) {
            $scope.player = searchedPlayer;
            searchedPlayer.searched = true;
        }
    });

    // when click on search button broadcast search
    $scope.showResult = function() {
        ngNotify.errorOccured = false;
        getPlayerId($scope.searchQuery).then(function(playerId) {
            if (playerId !== null) {
                broadcastSearch(playerId);
                $state.go('home', { player: playerId }, { notify: false });
            }
        });
    };

    // when click on 'find my current game' button broadcast search with my account id
    $scope.showMyCurrentMatch = function() {
        ngNotify.errorOccured = false;
        broadcastSearch($rootScope.user.steamid);
        $state.go('home', { player: $rootScope.user.steamid }, { notify: false });
    };

    // Show an example of result
    $scope.showExample = function() {
        var fakePlayerIdList = [
            '76561198009480410',
            '76561198162339363',
            '76561198179361806',
            '76561198137437131',
            '76561198173471367',
            '76561198059378663',
            '76561197960314295',
            '76561197965671516',
            '76561198014771815',
            '76561198044213273'
        ];

        $scope.listPlayers = fakePlayerIdList;
        $scope.playerId = '76561198009480410';
        $scope.currentMap = "de_dust2";
        $scope.currentScore = [12,10];
        $scope.currentTime = '23 minutes';

        $scope.searchOnGoing = true;
        $timeout(function() {
            $scope.$broadcast('listPlayersChanged');
            smoothScroll(resultSection);
        });
    };

    // Get the player Id based on the text typed
    var getPlayerId = function(textSearched) {
        /// steamId (32bits)to Community Id(64bits)
        var steamIdToCommunityId = function(steamId) { //TODO use service!
            var steamIDBase = 7960265728; //76561197960265728
            var startId = '7656119'
            var steamIDParts = steamId.split(':');
            var communityID = steamIDParts[2] * 2;
            if (steamIDParts[1] == '1') {
                communityID = communityID + 1;
            }
            communityID = communityID + steamIDBase;
            return startId + communityID;
        }

        var deferred = $q.defer();
        var textSearchedProcessed = textSearched;
        textSearchedProcessed = $.trim(textSearchedProcessed);

        if (!textSearchedProcessed)
            return null;


        var textSearchedSplit = textSearchedProcessed.split(':');
        // Check if link to profile (old way) steamcommunity.com/profiles/76561197989267164
        if (textSearchedProcessed.indexOf("steamcommunity.com/profiles/") >= 0) {
            var id = textSearchedProcessed.split("steamcommunity.com/profiles/");
            deferred.resolve(id[1].substring(0,17)); //TODO: might not work in 2000 years !
            return deferred.promise;
        // Check if steam Id http://steamcommunity.com/id/michalkontonr32
        } else if (textSearchedProcessed.indexOf("steamcommunity.com/id/") >= 0) {
            var nick = textSearchedProcessed.split("steamcommunity.com/id/")[1];
            if (nick.substr(0, nick.indexOf('/')) !== "")
                nick = nick.substr(0, nick.indexOf('/'));

            nickToId(nick).then(
                function(id) {
                    deferred.resolve(id);
                }, function(error) {
                    ngNotify.errorOccured = true;
                    ngNotify.set("The nickname you searched for is not associated with any steamId", "error");
                });
            return deferred.promise;

        // Check if steam Id 76561197989267164
        } else if (!isNaN(textSearchedProcessed) && textSearchedProcessed.length == 17) {
            deferred.resolve(textSearchedProcessed);
            return deferred.promise;

        // Check if STEAM_1:0:14500718
        } else if (textSearchedSplit[0] == "STEAM_1" || textSearchedSplit[0] == "STEAM_0") {
            deferred.resolve(steamIdToCommunityId(textSearchedProcessed));
            return deferred.promise;
        }

        ngNotify.set("Sorry we didn't understand the player you searched for, try the help section", "error");
        deferred.resolve(null);
        return deferred.promise;
    }

    var nickToId = function(name) {
        var deferred = $q.defer();
        $http.get("./api/steam-proxy/players/id-from-name/" + name).then(
            function(json) {
                deferred.resolve(json.data);
            },
            function(error) {
                deferred.reject(error);
            }
        );

        return deferred.promise;
    };

    // broadcast search if steamIds in url matchs
    var playerid = $stateParams.player;
    // TODO: might not work in 2000 years !
    if (playerid && playerid=="demo") {
        $scope.showExample();
    } else if (playerid && !isNaN(playerid) && playerid.length === 17) {
        broadcastSearch(playerid);
    }
}])
