app.controller('TrackerCtrl', ['$rootScope', '$scope', '$q', 'searchService', 'trackingService', 'ngNotify',
    function ($rootScope, $scope, $q, searchService, trackingService, ngNotify) {
    // change bg
    $rootScope.randomizeBg();

    // player displayed rows
    $scope.playerRows = [];

    ///number of cheater spotted
    $scope.nbCheaterSpotted = trackingService.cheatersSpotted.length;

    $scope.loading = false;

    var broadcastSearch = function(list) {
        if (!$rootScope.user) {
            ngNotify.set('You have to be connected through steam to access your suspected-player list', 'error');
            return;
        }

        $scope.loading = true;
        // Search for players in 'list', don't match friends, handle new cheaters
        var res = searchService.computePlayerRows(list, false, true);

        res.then(function(playerRows) {
            ga('send', 'event', 'TrackerSuccess', JSON.stringify({err: list, env: metadata.build}), 'success');
            $scope.playerRows = playerRows;
            for (var i = 0; i < playerRows.length; i++) {
                var isBanned = playerRows[i].vacStatus.numberOfVACBans > 0 || playerRows[i].vacStatus.numberOfGameBans > 0;
                trackingService.updateTrackedPlayer(playerRows[i].id, isBanned);
            }
        }, function(error) {
            ga('send', 'event', 'TrackerFail', JSON.stringify({err: list, env: metadata.build}), 'fail');
        }).finally(function() {
            $scope.loading = false;
        });
    }

    trackingService.getTrackerPlayerIds().then(function(ids) {
        broadcastSearch(ids);
    });

}]);
