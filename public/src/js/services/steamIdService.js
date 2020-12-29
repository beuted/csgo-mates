app.factory("steamIdService", [function () {
    var steamIdService = {};

    steamIdService.steamId32To64 = function(steamId) {
        var steamIDBase = 7960265728; //76561197960265728
        var startId = "7656119"
        var steamIDParts = steamId.split(":");
        var communityID = steamIDParts[2] * 2;
        if (steamIDParts[1] == "1") {
            communityID = communityID + 1;
        }
        communityID = communityID + steamIDBase;
        return startId + communityID;
    }

    steamIdService.steamId64To32 = function(steamId) {
        var x =  new BigNumber(steamId);
        return x.minus('76561197960265728').toString();
    }

    return steamIdService;
}]);
