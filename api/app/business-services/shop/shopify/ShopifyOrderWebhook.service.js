const ShopifyWebhooksApi = require("../../../data-access/shopify/ShopifyWebhooksApi");
// eslint-disable-next-line no-unused-vars
const Shop = require("../../../models/shops/Shop");

class ShopifyOrderWebhookService {
    /**
     * Creates webhooks for orders in Shopify.
     * @param {Object} options - The options for creating webhooks.
     * @param {Shop} options.shop - The Shopify shop name.
     * @returns {Promise<void>} A promise that resolves when the webhooks are created.
     * @throws {HttpError} If there is an error creating the webhooks.
     */
    static async createWebhooks({shop}) {
        await ShopifyWebhooksApi.createOrderCreateWebhook(shop);
        await ShopifyWebhooksApi.createCartCreateWebhook(shop);
        await ShopifyWebhooksApi.createCartUpdateWebhook(shop);
    }
}

module.exports = ShopifyOrderWebhookService;
