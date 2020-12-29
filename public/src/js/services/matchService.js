app.factory("matchService", ["$http", function ($http) {
    var matchService = {};

    matchService.get = function(playerId) {
        return $http({
            method: 'GET',
            url: 'api/matches/' + playerId
        })
        .then(function(response) {
            return response.data;
        });
    };

    return matchService;
}]);
