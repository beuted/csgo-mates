app.controller("ResultCtrl", ["$rootScope", "$scope", "$q", "ngNotify", "searchService", "trackingService", "historyService",
               function ($rootScope, $scope, $q, ngNotify, searchService, trackingService, historyService) {
    // player display rows
    $scope.playerRows = [];

    $scope.loading = false;

    var broadcastSearch = function(list) {
        $scope.loading = true;
        // Search for players in 'list', don't match friends, handle new cheaters
        var res = searchService.computePlayerRows(list, true, false);

        res.then(function(playerRows) {
            ga('send', 'event', 'SearchSuccess', JSON.stringify({err: list, env: metadata.build}), "success");
            $scope.playerRows = playerRows;
            if ($rootScope.user)
                updateHistory();
            $scope.$emit('searchDone', $scope.playerRows);
        }, function(error) {
            ga('send', 'event', 'SearchFail', JSON.stringify({err: list, env: metadata.build}), "fail");
        }).finally(function() {
            $scope.loading = false;
        });
    };

    $scope.$on('listPlayersChanged', function(e) {
        var playerIds = $scope.listPlayers;
        broadcastSearch(playerIds);
    });

    $scope.setTrackedPlayer = function(id) {
        if (!$rootScope.user) {
            ngNotify.set('You need to connect to remove people to your suspect list', {
                type: 'error'
            });
            return;
        }

        var playerRow = _.findWhere($scope.playerRows, {id: id});
        if ((playerRow.vacStatus.numberOfVACBans !== null && playerRow.vacStatus.numberOfGameBans !== null)
            || playerRow.info.visibility === 1 /* private profil */) {

            // if profil is private banned = false
            var banned = false;
            if (playerRow.info.visibility !== 1) {
                banned = playerRow.vacStatus.numberOfVACBans > 0 || playerRow.vacStatus.numberOfGameBans > 0;
            }

            trackingService.addTrackedPlayer(id, banned).then(
                function() {
                    _.findWhere($scope.playerRows, {id: id}).watched = true;
                },
                function(error) {
                    if (error.status === 403) {
                        ngNotify.set('Limit of suspected player reached, please remove suspsected players before adding new.', {
                            type: 'error'
                        });
                    } else {
                        console.error('ERROR: User is trying to addTrackedPlayer' + JSON.stringify(error));
                    }
                });
        }
    };

    $scope.removeTrackedPlayer = function(id) {
        if (!$rootScope.user) {
            ngNotify.set('You need to connect to remove people to your suspect list', {
                type: 'error'
            });
            return;
        }

        trackingService.removeTrackedPlayer(id).then(
            function() {
                _.findWhere($scope.playerRows, {id: id}).watched = false;
            },
            function(error) {
                console.warn('User is trying to removeTrackedPlayer while not logged in');
            });
    };

    var updateHistory = function() {
        var seenPlayers = [];
        if (!$scope.playerRows || !$scope.playerRows.length)
            return;

        for (var i = 0; i < $scope.playerRows.length; i++) {
            // the player has an id not null
            if (angular.isDefined($scope.playerRows[i].id) && $scope.playerRows[i].id !== null
                // && his vac status is defined
                && angular.isDefined($scope.playerRows[i].vacStatus.numberOfVACBans) && $scope.playerRows[i].vacStatus.numberOfVACBans !== null
                && angular.isDefined($scope.playerRows[i].vacStatus.numberOfGameBans) && $scope.playerRows[i].vacStatus.numberOfGameBans !== null
                // && he has csgo
                && $scope.playerRows[i].hasCsgo === true
                // && it's not the current player
                && $rootScope.user && $rootScope.user.steamid != $scope.playerRows[i].id)
            {
                seenPlayers.push({id: $scope.playerRows[i].id, isBanned: ($scope.playerRows[i].vacStatus.numberOfVACBans > 0 || $scope.playerRows[i].vacStatus.numberOfGameBans > 0) ? 1 : 0});
            }
        }
        historyService.addSeenPlayers(seenPlayers);
    }
}]);
