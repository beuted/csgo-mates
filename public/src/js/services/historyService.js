app.factory("historyService", ["$http", function ($http) {
    var historyService = {};

    historyService.cheatersSpotted = [];

    //TODO: tout est buggué ... requetes ont steam id vide
    var loadSeenPlayers = function() {
        return $http({ method: 'GET', url: 'api/current-user/history' }).then(
            // success
            function(historyPlayers) {
                if (!historyPlayers.data) {
                    historyService.nbSeenPlayers = 0;
                    return [];
                }
                historyService.nbSeenPlayers = historyPlayers.data.length;
                return historyPlayers.data;
            // error
            }, function(error) {
                if (error.status === 401) {
                    console.warn("you have to login to access your history")
                }
                historyService.nbSeenPlayers = 0;
                return [];
            });
    };

    // loads SeenPlayers in cache
    var loadedSeenPlayers = null;

    historyService.nbSeenPlayers = 0;

    historyService.getSeenPlayers = function() {
        if (loadedSeenPlayers === null) {
            loadedSeenPlayers = loadSeenPlayers().then(function(res) {
                return res;
            });
        }
        return loadedSeenPlayers;
    };

    historyService.getSeenPlayerIds = function() {
        return this.getSeenPlayers().then(function(historyPlayers) {
             return _.pluck(historyPlayers, 'idPlayer');
        });
    };

    historyService.getNumberOfSeenPlayers = function() {
        return this.getSeenPlayers().then(function(historyPlayers) {
            if (historyPlayers)
                return historyPlayers.length || 0;
            else
                return 0;
        });
    };

    historyService.addSeenPlayers = function(players) {
        if (!players || !players.length)
            return;
        var self = this;
        var body = { players: players };
        return $http({
            method: 'POST',
            url: 'api/current-user/history',
            data: $.param(body),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then(function(newHistoryPlayers) {
            return self.getSeenPlayers().then(function(historyPlayers) {
                // add/update to cache each history player affected
                for (var i = 0; i < newHistoryPlayers.data.length; i++) {
                    var newHistoryPlayer = newHistoryPlayers.data[i];
                    if (newHistoryPlayer.timeSeen === -1) { // only the time Seen have been incremented & the lastSeenDate updated
                        var idToUpdate = _.findIndex(historyPlayers, function(item) { return item.idPlayer === newHistoryPlayer.idPlayer });
                        historyPlayers[idToUpdate].timeSeen ++;
                        historyPlayers[idToUpdate].lastSeenDate = newHistoryPlayer.lastSeenDate;
                    } else { // a new player have been added ot the history
                        historyPlayers.push(newHistoryPlayers.data[i]);
                        historyService.nbSeenPlayers ++;
                    }
                }
                return historyPlayers.data;
            });
        });
    };

    historyService.updateSeenPlayers = function(players) {
        var self = this;
        var body = { players: players };
        return $http({
            method: 'PUT',
            url: 'api/current-user/history',
            data: JSON.stringify(body)
        }).then(function(newHistoryPlayers) {
            return self.getSeenPlayers().then(function(historyPlayers) {
                // add/update to cache each history player affected
                for (var i = 0; i < newHistoryPlayers.data.length; i++) {
                    var newHistoryPlayer = newHistoryPlayers.data[i];
                    var idToUpdate = _.findIndex(historyPlayers, function(item) { return item.idPlayer === newHistoryPlayer.idPlayer });
                    historyPlayers[idToUpdate].timeSeen ++;
                }
                return historyPlayers.data;
            });
        });
    };

    return historyService;
}]);
