app.controller("ServerStatusCtrl", ["$scope", "$http", "ngNotify", function ($scope, $http, ngNotify) {
    var serverStatus = {
        "result": {
            "app": {
                "version": null,
                "timestamp": null,
                "time": null
            },
            "services": {
                "SessionsLogon": null,
                "SteamCommunity": null,
                "IEconItems": null,
                "Leaderboards": null //values: idle, low, medium, high
            },
            "datacenters": {},
            "matchmaking": {
                "scheduler": null,
                "online_servers": null,
                "online_players": null,
                "searching_players": null,
                "search_seconds_avg": null
            }
        }
    };

    var loadServerStatus = function() {
        $http.get("./api/steam-proxy/server-status").then(
            function(response) {
                serverStatus = response.data;
            },
            function(error) {
                if (error !== 'cancel') {
                    ga('send', 'event', 'SteamFail', JSON.stringify({err: error ? error.data : null, env: metadata.build}), 'serverStatusCouldNotBeRetrieved');
                    $scope.isWebApiDown = true;
                    ngNotify.set("csgo-mates failed to get servers status", "error");
                }
            }
        );

    };

    $scope.isWebApiDown = false;

    // Status getters
    $scope.invStatus = function() { // return {status: `class`, icon: `icon class`}
        var status = serverStatus.result.services.SessionsLogon;
        return transformStandardStatus(status);
    };

    $scope.sessionsLogonStatus = function() { // return {status: `class`, icon: `icon class`}
        var status = serverStatus.result.services.SessionsLogon;
        return transformStandardStatus(status);
    };

    $scope.schedulerStatus = function() { // return {status: `class`, icon: `icon class`}
        var status = serverStatus.result.matchmaking.scheduler;
        return transformStandardStatus(status);
    };

    var transformStandardStatus = function(status) {
        // not loaded yet
        if (!status) {
            return {status: "loading", icon: "fa-circle-o-notch fa-spin"};
        }

        if (status != "normal") {
            return {status: "bad", icon: "fa-times"};
        } else {
            return {status: "good", icon: "fa-check"};
        }
    };

    $scope.searchStatus = function() {
        var status;
        var seconds = serverStatus.result.matchmaking.search_seconds_avg;

        // not loaded yet
        if (!seconds) {
            return {status: "loading", seconds: null}
        }

        if (seconds < 60) {
            status = "good";
        } else if (seconds < 120) {
            status = "middle";
        } else {
            status = "bad";
        }

        return {status: status, seconds: seconds}
    };

    $scope.datacentersStatus = function(datacenter) {
        // not loaded yet
        if (!serverStatus.result.datacenters[datacenter]) {
            return "loading";
        }

        switch(serverStatus.result.datacenters[datacenter].load) {
            case "idle": case "low": case "medium":
                return "good";
            case "high":
                return "middle";
            default:
                return "bad";
        }
    }
    // load the server status to fill jsonServerStatus
    loadServerStatus();
}]);
