app.factory("trackingService", ["$http", "$q", function ($http, $q) {
    var trackingService = {};

    trackingService.cheatersSpotted = [];

    //TODO: tout est bugé ... requetes on un steam id vide
    var loadTrackerPlayers = function() {
        return $http({ method: 'GET', url: 'api/current-user/tracked-players' }).then(
            // success
            function(trackedPlayers) {
                if (!trackedPlayers.data) {
                    trackingService.nbTrackedPlayers = 0;
                    return [];
                }
                trackingService.nbTrackedPlayers = trackedPlayers.data.length;
                return trackedPlayers.data;
            // error
            }, function(error) {
                if (error.status === 401) {
                    console.warn("you have to login to access your tracked players");
                }
                trackingService.nbTrackedPlayers = 0;
                return [];
            });
    };

    // loads TrackedPlayers in cache
    var loadedTrackedPlayers = null;

    trackingService.nbTrackedPlayers = 0;

    trackingService.getTrackerPlayerIds = function() {
        return this.getTrackerPlayers().then(function(trackedPlayers) {
             return _.pluck(trackedPlayers, 'trackedPlayer');
        });
    };

    trackingService.getTrackerPlayers = function() {
        if (loadedTrackedPlayers === null) {
            loadedTrackedPlayers = loadTrackerPlayers().then(function(res) {
                return res;
            });
        }
        return loadedTrackedPlayers;
    };

    trackingService.getNumberOfTrackerPlayers = function() {
        return this.getTrackerPlayers().then(function(trackedPlayers) {
            if (trackedPlayers)
                return trackedPlayers.length || 0;
            else
                return 0;
        });
    };

    trackingService.addTrackedPlayer = function(id, isBanned) {
        var self = this;
        var body = { trackedPlayer: id, isBanned: isBanned ? 1 : 0 };

        return $http({
            method: 'POST',
            url: 'api/current-user/tracked-players',
            data: $.param(body),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then(function(trackedPlayer) {
            return self.getTrackerPlayers().then(function(trackedPlayers) {
                // add to cache
                trackedPlayers.push(trackedPlayer.data);
                trackingService.nbTrackedPlayers ++;
                return trackedPlayers.data;
            });
        });
    };

    trackingService.updateTrackedPlayer = function(id, isBanned) {
        var body = { trackedPlayer: id, isBanned: isBanned ? 1 : 0 };

        return this.getTrackerPlayers().then(function(trackedPlayers) {
            var idToUpdate = _.findIndex(trackedPlayers, function(item) { return item.trackedPlayer === id });
            if (isBanned == trackedPlayers[idToUpdate].isBanned)
                return;
            else {
                trackedPlayers[idToUpdate].isBanned = isBanned;
                return $http({
                    method: 'PUT',
                    url: 'api/current-user/tracked-players',
                    data: JSON.stringify(body)
                });
            }
        });
    };

    trackingService.removeTrackedPlayer = function(id) {
        var self = this;
        var body = { trackedPlayer: id };

        return $http({
            method: 'DELETE',
            url: 'api/current-user/tracked-players',
            data: $.param(body),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then(function() {
            return self.getTrackerPlayers().then(function(trackedPlayers) {
                // remove from cache
                var idToRemove = _.findIndex(trackedPlayers, function(item) { return item.trackedPlayer === id });
                if (idToRemove > -1 ) {
                    trackedPlayers.splice(idToRemove,1);
                    trackingService.nbTrackedPlayers --;
                }
            });
        });
    };

    // initialize
    trackingService.getTrackerPlayerIds();

    return trackingService;
}]);
