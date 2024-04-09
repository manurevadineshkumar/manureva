const Product = require("../../models/Product");
const ShopExportedProductsStorage = require("../../storage/ShopExportedProducts.storage");

class ShopExportedProductsService {

    // Instead of listing all prodcts as we do in ShopifyExporter we only need to get the
    // products that are already exported by a specific shop. But for this process to work with
    // the work already in place we need our data to be of type Products with added data from the
    // shop_exported_products table. That's why we have new Product(data) and then manipulate the data

    static async listAvailableExportedProductsByShop(
        shopId, prevId, batchSize) {
        const results = await ShopExportedProductsStorage
            .listAvailableExportedProductsByShop(shopId, prevId, batchSize);

        return results.map((data) => {
            const product = new Product(data);
            const addedProperties = {
                shop_id: data.shop_exported_products_infos[0].shop_id,
                external_id: data.shop_exported_products_infos[0].external_id,
                last_update: data.shop_exported_products_infos[0].last_update,
                exported_at: data.shop_exported_products_infos[0].exported_at,
                archived: data.shop_exported_products_infos[0].archived,
                exportedPriceCents: data.shop_exported_products_infos[0].exported_price
            };
            Object.assign(product, addedProperties);
            return product;
        });
    }

    static async getExternalIds(shopId, productIds) {
        return await ShopExportedProductsStorage.getExternalIds(shopId, productIds);
    }

    static async setExternalId(productId, shopId, externalId) {
        await ShopExportedProductsStorage.setExternalId(
            productId, shopId, externalId
        );
    }

    static async countUpdatedForShop(shopId, filters) {
        return await ShopExportedProductsStorage
            .countUpdatedForShop(shopId, filters);
    }

    static async removeProductById(shopId, productId) {
        return await ShopExportedProductsStorage.removeProductById(shopId, productId);
    }

    static async listArchivedProducts(shopId) {
        return await ShopExportedProductsStorage.listArchivedProducts(shopId);
    }
}

module.exports = ShopExportedProductsService;
