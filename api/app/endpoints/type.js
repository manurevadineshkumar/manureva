const Type = require("../models/Type");

const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

class Route {
    static async listTypes({user}) {
        await user.assertPermission(PERMISSIONS.TYPE_LIST);

        const types = await Type.list();

        return {
            items: types
                .map(type => type.serialize()),
            is_last_batch: 1
        };
    }

    static async createType({user, body: {name}}) {
        await user.assertPermission(PERMISSIONS.TYPE_CREATE);

        const type = await Type.getByName(name);

        if (type)
            throw new HttpError(400, "type already exists");

        return (await Type.create(name)).serialize();
    }

    static async getTypeById({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.TYPE_LIST);

        const type = await Type.getById(id);

        if (!type)
            throw new HttpError(404, "no such type");

        return type.serialize();
    }
}

module.exports = Route;
