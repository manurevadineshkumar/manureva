const Brand = require("../models/Brand");
const HttpError = require("../errors/HttpError");

const {PERMISSIONS} = require("../models/Permissions");

class Route {
    static async listBrands({user}) {
        await user.assertPermission(PERMISSIONS.BRAND_LIST);

        const brands = await Brand.list();

        return {
            items: brands
                .map(brand => brand.serialize()),
            is_last_batch: 1
        };
    }

    static async createBrand({user, body: {name}}) {
        await user.assertPermission(PERMISSIONS.BRAND_CREATE);

        const brand = await Brand.getByName(name);

        if (brand)
            throw new HttpError(400, "brand already exists");

        return (await Brand.create(name)).serialize();
    }

    static async getBrandById({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.BRAND_READ);

        const brand = await Brand.getById(id);

        if (!brand)
            throw new HttpError(404, "no such brand");

        return brand.serialize();
    }
}

module.exports = Route;
