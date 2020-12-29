app.controller("NavbarCtrl", ["$rootScope", "$scope", "$state", "smoothScroll", "searchService", "trackingService", "historyService",
    function ($rootScope, $scope, $state, smoothScroll, searchService, trackingService, historyService) {

    /// number of tracked players
    $scope.getNbTrackedPlayers = function() {
        return trackingService.nbTrackedPlayers;
    };

    ///number of spotted cheaters among tracked players
    $scope.getNbTrackedCheatersSpotted = function() {
        return trackingService.cheatersSpotted.length;
    };

    /// number of seen players (history)
    $scope.getNbHistoryPlayers = function() {
        return historyService.nbSeenPlayers;
    };

    ///number of spotted cheaters among history
    $scope.getNbHistoryCheatersSpotted = function() {
        return historyService.cheatersSpotted.length;
    };


    $scope.goToHome = function() {
        searchService.cancel();
        $state.go("home").finally(function() {
            var section = document.getElementById("main-section");
            smoothScroll(section);
        });
    };

    $scope.goToHelp = function() {
        var section = document.getElementById("help-section");
        smoothScroll(section);
    };

    $scope.goToFeatures = function() {
        searchService.cancel();
        $state.go("home").finally(function() {
            var section = document.getElementById("features-section");
            smoothScroll(section);
        });
    };

    $scope.goToAbout = function() {
        searchService.cancel();
        $state.go("home").finally(function() {
            var section = document.getElementById("about-section");
            smoothScroll(section);
        });
    };

    $scope.goToTracker = function() {
        if ($state.current.name !== "tracker") {
            searchService.cancel();
            $state.go("tracker", {steamIds: null});
        }
    };

    $scope.goToHistory = function() {
        if ($state.current.name !== "history") {
            searchService.cancel();
            $state.go("history", {steamIds: null});
        }
    };

    $scope.goToFriends = function() {
        if ($state.current.name !== "friends") {
            searchService.cancel();
            $state.go("friends", {steamids: null});
        }
    };
    $scope.goToProfile = function() {
        searchService.cancel();
        $state.go("home", { steamids: $rootScope.user.steamid });
    };

    $rootScope.goToPlayer = function(pid) {
        searchService.cancel();
        $state.go("home", { player : pid }).finally(function() {
            var section = document.getElementById("main-section");
            smoothScroll(section);
        });
    };
}]);
