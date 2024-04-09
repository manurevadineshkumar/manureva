const LogProduct = require("../models/LogProduct");
const {PERMISSIONS} = require("../models/Permissions");

class Route {
    static async getLogProductById({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.LOG_PRODUCT_READ);

        return (await LogProduct.getById(id)).serialize();
    }

    static async getLogProducts({user, query: {prev_id, batch_size}}) {
        await user.assertPermission(PERMISSIONS.LOG_PRODUCT_LIST);

        return await LogProduct.list(prev_id, batch_size);
    }

    static async getLogPriceByProductId({
        user,
        path: {id},
        query: {prev_id, batch_size}
    }) {
        await user.assertPermission(PERMISSIONS.LOG_PRODUCT_READ);

        return await LogProduct.getLogProductPrices(prev_id, batch_size, id);
    }

}

module.exports = Route;
