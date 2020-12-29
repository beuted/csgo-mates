var app = angular.module('app', ['ui.router', 'ui.bootstrap', 'smoothScroll', 'ngSanitize', 'ngNotify', 'LocalStorageModule'/*, 'ngAnimate'*/]) //TODO FUCKIN WEIRD
.config(['$stateProvider', '$urlRouterProvider', 'localStorageServiceProvider',
        function($stateProvider, $urlRouterProvider,localStorageServiceProvider) {
    $stateProvider
        .state('home', {
          url: '/home/:player',
          templateUrl: 'templates/main.html',
          controller: 'MainCtrl'
        })
        .state('tracker', {
          url: '/tracker',
          templateUrl: 'templates/tracker.html',
          controller: 'TrackerCtrl'
        })
        .state('history', {
          url: '/history',
          templateUrl: 'templates/history.html',
          controller: 'HistoryCtrl'
        })
        .state('friends', {
          url: '/friends',
          templateUrl: 'templates/friends.html',
          controller: 'FriendsCtrl'
        });

    $urlRouterProvider
        .when('/tracker/', '/tracker')
        .when('/history/', '/history')
        .otherwise('/home/');

    localStorageServiceProvider
        .setPrefix('csgo-mates')
        .setStorageType('localStorage')
        .setStorageCookie(0, '/')
        .setStorageCookieDomain('csgo-mates.com');
}])
.run(['$rootScope', 'ngNotify', 'searchService', 'trackingService', 'historyService', 'userService',
     function($rootScope, ngNotify, searchService, trackingService, historyService, userService) {
    // Setup bg
    var bgs = ['bg_nuke', 'bg_inferno', 'bg_cache', 'bg_mirage', 'bg_dust2'];
    $rootScope.bg = 'bg_nuke';
    $rootScope.randomizeBg = function() {
        $rootScope.bg = bgs[Math.floor((Math.random()*bgs.length))];
    }
    $rootScope.selectBg = function(map) {
        if (_.contains(['de_nuke', 'de_inferno', 'de_cache', 'de_mirage', 'de_dust2'], map))
            $rootScope.bg = 'bg_' + map.slice(3);
    }

    // will be overrighten with steamId when user is connected
    $rootScope.user = null;
    userService.get().then(function(user) {
        $rootScope.user = user;
    });

    // Setup navbar
    $('.navbar-fixed-top').autoHidingNavbar({
        // see next for specifications
    });

    // Setup ngNotify
    ngNotify.config({
        theme: 'pure ',
        position: 'bottom',
        duration: 3000,
        type: 'info',
        sticky: false,
        html: true
    });

    ngNotify.addType('classic', 'csgomates-notify');
    ngNotify.addType('error', 'csgomates-error');

    ngNotify.errorOccured = false;

    ngNotify.setSpin = function(message) {
        ngNotify.set(message + ' <i class="fa fa-circle-o-notch fa-spin"></i>', {
            type: 'classic',
            sticky: false
        });
    };

    // Check if cheaters have been detected among tracked players
    trackingService.getTrackerPlayerIds().then(function(trackedPlayerIds) {
        if (trackedPlayerIds.length) {
            trackingService.getTrackerPlayers().then(function(trackedPlayers) {
                var playerRows = searchService.fillEmptyPlayerRows(trackedPlayerIds);
                searchService.processPlayerVacStatus(playerRows).promise.then(function(_playerRows) {
                    for (var i = 0; i < _playerRows.length; i++) {
                        var trackedPlayer = _.find(trackedPlayers, function(player) {return player.trackedPlayer === _playerRows[i].id});
                        if (trackedPlayer.isBanned == false
                            && (_playerRows[i].vacStatus.numberOfVACBans > 0 || _playerRows[i].vacStatus.numberOfGameBans > 0)) {
                            // Add the player to the list of new cheater spotted
                            trackingService.cheatersSpotted.push(_playerRows[i].id);
                        }
                    }
                });
            });
        }
    });

    // Check if cheaters have been detected among history players
    historyService.getSeenPlayerIds().then(function(historyPlayerIds) {
        if (historyPlayerIds.length) {
            historyService.getSeenPlayers().then(function(historyPlayers) {
                var playerRows = searchService.fillEmptyPlayerRows(historyPlayerIds);
                searchService.processPlayerVacStatus(playerRows).promise.then(function(_playerRows) {
                    for (var i = 0; i < _playerRows.length; i++) {
                        var historyPlayer = _.find(historyPlayers, function(player) {return player.idPlayer === _playerRows[i].id});
                        if (historyPlayer.isBanned == false
                            && (_playerRows[i].vacStatus.numberOfVACBans > 0 || _playerRows[i].vacStatus.numberOfGameBans > 0)) {
                            // Add the player to the list of new cheater spotted
                            historyService.cheatersSpotted.push(_playerRows[i].id);
                        }
                    }
                });
            });
        }
    });
}])
.directive('tooltip', [function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs){
            $(element).hover(function(){
                // on mouseenter
                $(element).tooltip('show');
            }, function(){
                // on mouseleave
                $(element).tooltip('hide');
            });
        }
    };
}])
//We already have a limitTo filter built-in to angular,
//let's make a startFrom filter
.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    }
})
.filter('floor', function() {
  return function(input) {
    return Math.floor(input);
  };
});
