const Material = require("../models/Material");

const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

class Route {
    static async listMaterials({user}) {
        await user.assertPermission(PERMISSIONS.MATERIAL_LIST);

        const materials = await Material.listAll();

        return {
            items: materials
                .map(material => material.serialize()),
            is_last_batch: 1
        };
    }

    static async createMaterial({user, body: {name}}) {
        await user.assertPermission(PERMISSIONS.MATERIAL_CREATE);

        if (await Material.getByName(name))
            throw new HttpError(409, "duplicate material name");

        return (await Material.create(name)).serialize();
    }
}

module.exports = Route;
