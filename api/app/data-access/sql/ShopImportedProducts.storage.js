const ProductService = require("../../business-services/product/Product.service");
// eslint-disable-next-line no-unused-vars
const Product = require("../../models/Product");
// eslint-disable-next-line no-unused-vars
const Shop = require("../../models/shops/Shop");
const Storage = require("../../storage/Storage");

class ShopImportedProductStorage {
    /**
     * Retrieves a product by its external ID.
     * @param {Object} options - The options for retrieving the product.
     * @param {string|number} options.externalId - The external ID of the product.
     * @returns {Promise<Product>} - A promise that resolves to the retrieved product.
     * @throws {Error} - If the external ID does not match any product or if the product does not exist.
     */
    static async getProductByExternalId({externalId}) {
        const productId = await Storage.query(`
            SELECT product_id
            FROM shop_imported_products sip
            WHERE external_id = ?;`,
        `${externalId}`)
            .then((rows) => {
                return rows[0]?.product_id;
            });

        if (!productId) {
            throw new Error(`Could not match external id ${externalId} to a product`);
        }

        const product = await ProductService.getById(productId);

        if (!product) {
            throw new Error(`Product id ${productId} does not exist`);
        }

        return product;
    }

    /**
     * Deletes an imported product from the shop_imported_products table by external ID.
     * @param {Object} options - The options for deleting the imported product.
     * @param {Shop} options.shop - The shop object.
     * @param {string|number} options.externalId - The external ID of the imported product.
     * @returns {Promise<void>} - A promise that resolves when the product is deleted.
     */
    static async deleteImportedProductByExternalId({shop, externalId}) {
        await Storage.query(`
            DELETE
            FROM shop_imported_products
            WHERE shop_id = ? AND external_id = ?;`,
        shop.id, `${externalId}`);

    }
}

module.exports = ShopImportedProductStorage;
