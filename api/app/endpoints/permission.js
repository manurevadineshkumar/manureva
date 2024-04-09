const PERMISSIONS_DATA = require("../const/permissions.json");

const {PERMISSIONS} = require("../models/Permissions");

class Route {
    static async listPermissions({user}) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        return PERMISSIONS_DATA;
    }
}

module.exports = Route;
