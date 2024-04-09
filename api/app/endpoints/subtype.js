const Subtype = require("../models/Subtype");

const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

class Route {
    static async listSubtypes({user}) {
        await user.assertPermission(PERMISSIONS.SUBTYPE_LIST);

        const subtypes = await Subtype.list();

        return {
            items: subtypes
                .map(subtype => subtype.serialize()),
            is_last_batch: 1
        };
    }

    static async createSubtype({user, body: {name}}) {
        await user.assertPermission(PERMISSIONS.SUBTYPE_CREATE);

        const subtype = await Subtype.getByName(name);

        if (subtype)
            throw new HttpError(409, "subtype already exists");

        return (await Subtype.create(name)).serialize();
    }

    static async getSubtypeById({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.SUBTYPE_LIST);
        const subtype = await Subtype.getById(id);

        if (!subtype)
            throw new HttpError(404, "no such subtype");

        return subtype.serialize();
    }
}

module.exports = Route;
