const ProductsGroup = require("../models/ProductsGroup");
const HttpError = require("../errors/HttpError");

class Route {
    static async getProductsInShareView({
        path: {hash},
        query: {prev_id, batch_size}
    }) {
        const [id, token] = hash.split("-");

        const group = await ProductsGroup.getById(id);

        if (!group || group.token !== token)
            throw new HttpError(404, "Share view not found");

        const products = await group.listProducts({prev_id, batch_size});

        return  {
            products_count: group.productsCount,
            items: products.map(product => product.serializePublic()),
            ...(products.length < batch_size ? {is_last_batch: 1} : {})
        };
    }
}

module.exports = Route;
