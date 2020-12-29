app.controller("HistoryCtrl", ["$rootScope", "$scope", "$q", "searchService", "historyService", "trackingService", "ngNotify",
    function ($rootScope, $scope, $q, searchService, historyService, trackingService, ngNotify) {
    // change bg
    $rootScope.randomizeBg();

    // player displayed rows
    $scope.playerRows = [];

    /// number of cheater spotted
    $scope.nbCheaterSpotted = historyService.cheatersSpotted.length;

    $scope.loading = false;

    var broadcastSearch = function(list) {
        if (!$rootScope.user) {
            ngNotify.set("You have to be connected through steam to access your history", "error");
            return;
        }

        $scope.loading = true;
        // Search for players in 'list', don't match friends, handle new cheaters
        var res = searchService.computePlayerRows(list, false, true);

        res.then(function(playerRows) {
            ga('send', 'event', 'HistorySuccess', JSON.stringify({err: list, env: metadata.build}), "success");
            $scope.playerRows = playerRows;
        }, function(error) {
            ga('send', 'event', 'HistoryFail', JSON.stringify({err: list, env: metadata.build}), "fail");
        }).finally(function() {
            $scope.loading = false;
        });
    }

    historyService.getSeenPlayerIds().then(function(ids) {
        broadcastSearch(ids);
    });

}]);
