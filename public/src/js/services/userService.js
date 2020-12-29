app.factory('userService', ['$http', function ($http) {
    var userService = {};

    userService.get = function() {
        return $http({
            method: 'GET',
            url: 'api/auth/steam/user'
        })
        .then(function(response) {
            return response.data;
        }, function (error) {
            return null;
        });
    };

    return userService;
}]);
