// eslint-disable-next-line no-unused-vars
const Product = require("../../models/Product");
// eslint-disable-next-line no-unused-vars
const Shop = require("../../models/shops/Shop");

const ShopImportedProductStorage = require("../../data-access/sql/ShopImportedProducts.storage");

class ShopImportedProductService {
    /**
     * Retrieves a product by its external ID.
     * @param {Object} options - The options for retrieving the product.
     * @param {string} options.externalId - The external ID of the product.
     * @returns {Promise<Product>} - The retrieved product.
     */
    static async getProductByExternalId({externalId}) {
        const product = await ShopImportedProductStorage.getProductByExternalId({externalId});
        return product;
    }

    /**
     * Deletes an imported product by its external ID.
     * @param {Object} options - The options for deleting the imported product.
     * @param {Shop} options.shop - The shop ID.
     * @param {string} options.externalId - The external ID of the imported product.
     * @returns {Promise<void>} - A promise that resolves when the imported product is deleted.
     */
    static async deleteImportedProductByExternalId({shop, externalId}) {
        await ShopImportedProductStorage.deleteImportedProductByExternalId({shop, externalId});
    }
}

module.exports = ShopImportedProductService;
