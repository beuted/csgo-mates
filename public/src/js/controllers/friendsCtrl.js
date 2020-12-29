app.controller("FriendsCtrl", ["$rootScope", "$scope", "$q", "$http", "searchService", "trackingService", "ngNotify",
    function ($rootScope, $scope, $q, $http, searchService, trackingService, ngNotify) {
    // change bg
    $rootScope.randomizeBg();

    // player displayed rows
    $scope.playerRows = [];

    $scope.loading = false;

    var broadcastSearch = function(list) {
        if (!$rootScope.user) {
            ngNotify.set("You have to be connected through steam to access your friend page", "error");
            return;
        }

        $scope.loading = true;
        // Search for players in 'list', don't match friends, handle new cheaters
        var res = searchService.computePlayerRows(list, false, false);

        res.then(function(playerRows) {
            ga('send', 'event', 'FriendSuccess', JSON.stringify({err: list, env: metadata.build}), "success");
            $scope.playerRows = playerRows;
        }, function(error) {
            ga('send', 'event', 'FriendFail', JSON.stringify({err: list, env: metadata.build}), "fail");
        }).finally(function() {
            $scope.loading = false;
        });
    }

    if ($rootScope.user) {
        $http.get("./api/steam-proxy/players/" + $rootScope.user.steamid + "/friend-list").then(
            function(response) {
                var listFriends = response.data.friendslist.friends;
                var listIds = _.pluck(listFriends, 'steamid');
                broadcastSearch(listIds);
            },
            function(error) {
                ngNotify.set("We could not access your friend list (Steam API might be down)", "error");
            }
        );
    }
}]);
