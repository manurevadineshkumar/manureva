// eslint-disable-next-line no-unused-vars
const Shop = require("../../../models/shops/Shop");
const ShopifyMetafieldsApi = require("../../../data-access/shopify/ShopifyMetafieldsApi");

class ShopifyMetafieldService {
    /**
     * Creates metafield definitions for a shop.
     * @param {Object} options - The options for creating metafield definitions.
     * @param {Shop} options.shop - The shop name.
     * @returns {Promise<void>} - A promise that resolves when all metafield definitions are created.
     */
    static async createMetafieldDefinitions({shop}) {
        await ShopifyMetafieldsApi.create({
            shop,
            name: "colors",
            description: "The colors of the product",
            type: "list.single_line_text_field"
        });
        await ShopifyMetafieldsApi.create({
            shop,
            name: "materials",
            description: "The materials of the product",
            type: "list.single_line_text_field"
        });
        await ShopifyMetafieldsApi.create({
            shop,
            name: "size",
            description: "The size of the product",
            type: "rich_text_field"
        });
        await ShopifyMetafieldsApi.create({
            shop,
            name: "extras",
            description: "The extras about the product",
            type: "rich_text_field"
        });
        await ShopifyMetafieldsApi.create({
            shop,
            name: "grade",
            description: "The grade of the product",
            type: "single_line_text_field"
        });
    }
}

module.exports = ShopifyMetafieldService;
