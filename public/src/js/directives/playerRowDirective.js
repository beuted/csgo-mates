app.directive('playerRowDirective', function() {
    return {
        // Restrict it to be an attribute in this case
        restrict: 'A',

        templateUrl: 'templates/playerRowDirective.html',

        replace: true,

        scope: {
            /// player instance
            player: '='
        },

        controller: ['$scope', '$rootScope', '$state', 'smoothScroll', 'trackingService', 'ngNotify', function($scope, $rootScope, $state, smoothScroll, trackingService, ngNotify) {

            $scope.setTrackedPlayer = function() {
                var id = $scope.player.id;

                if (!$rootScope.user) {
                    ngNotify.set('You need to connect to remove people to your suspect list', {
                        type: 'error'
                    });
                    return;
                }

                if (($scope.player.vacStatus.numberOfVACBans !== null && $scope.player.vacStatus.numberOfGameBans !== null)
                    || $scope.player.info.visibility === 1 /* private profil */) {

                    // if profil is private banned = false
                    var banned = false;
                    if ($scope.player.info.visibility !== 1) {
                        banned = $scope.player.vacStatus.numberOfVACBans > 0 || $scope.player.vacStatus.numberOfGameBans > 0;
                    }

                    trackingService.addTrackedPlayer(id, banned).then(
                        function() {
                            $scope.player.watched = true;
                        },
                        function(error) {
                            if (error.status === 403) {
                                ngNotify.set('Limit of suspected player reached, please remove suspsected players before adding new.', {
                                    type: 'error'
                                });
                            } else {
                                console.error("ERROR: User is trying to addTrackedPlayer" + JSON.stringify(error));
                            }
                        });
                }
            };

            $scope.removeTrackedPlayer = function() {
                var id = $scope.player.id;
                if (!$rootScope.user) {
                    ngNotify.set('You need to connect to remove people to your suspect list', {
                        type: 'error'
                    });
                    return;
                }

                trackingService.removeTrackedPlayer(id).then(
                    function() {
                        $scope.player.watched = false;
                    },
                    function(error) {
                        console.warn("User is trying to removeTrackedPlayer while not logged in");
                    });
            };

            $scope.goToPlayer = function() {
                $state.go("home", { player : $scope.player.id }).finally(function() {
                    var section = document.getElementById("main-section");
                    smoothScroll(section);
                });
            };
        }]
    };
});
