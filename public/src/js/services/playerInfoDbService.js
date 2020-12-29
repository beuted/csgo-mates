app.factory("playerInfoDbService", ["$http", function ($http) {
    var playerInfoDbService = {};

    playerInfoDbService.get = function(players) {
        var body = { players: JSON.stringify(players) };
    	return $http({
            method: 'POST',
            url: 'api/current-user/player-info',
            data: $.param(body),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        })
        .then(function(playerInfoDbs) {
			return playerInfoDbs.data;
        });
    };

    return playerInfoDbService;
}]);
