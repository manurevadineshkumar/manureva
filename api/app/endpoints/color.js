const Color = require("../models/Color");

const HttpError = require("../errors/HttpError");
const {PERMISSIONS} = require("../models/Permissions");

class Route {
    static async listColors({user}) {
        await user.assertPermission(PERMISSIONS.COLOR_LIST);

        const colors = await Color.listAll();

        return {
            items: colors
                .map(color => color.serialize()),
            is_last_batch: 1
        };
    }

    static async createColor({user, body: {name}}) {
        await user.assertPermission(PERMISSIONS.COLOR_CREATE);

        if (await Color.getByName(name))
            throw new HttpError(409, "duplicate color name");

        return (await Color.create(name)).serialize();
    }
}

module.exports = Route;
