const ShopifyRestApiRequest = require("./ShopifyRestApiRequest");

// eslint-disable-next-line no-unused-vars
const Shop = require("../../models/shops/Shop");
const Utils = require("../../services/Utils");

class ShopifyWebhooksApi {
    static KORVIN_API_URL = process.env.NODE_ENV !== "production"
        ? "https://korvin.pagekite.me"
        : "https://api.korvin.io";

    /**
     * Creates a webhook for a given shop.
     * @param {Shop} shop - The shop object.
     * @param {{topic: string, address: string}} webhook - The webhook object.
     * @returns {Promise<void>} - A promise that resolves when the webhook is created.
     */
    static async #createWebhook(shop, webhook) {
        const store = shop.url.split(".")[0];

        try {
            await Utils.sleep(200);
            const data = await ShopifyRestApiRequest.sendRequest(store, shop.token, "/webhooks.json", "POST", {
                webhook: {
                    topic: webhook.topic,
                    address: webhook.address,
                    format: "json"
                }
            });

            if (data.error) {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error(error); // swallow the error
        }
    }

    /**
     * Creates a webhook for product creation in Shopify.
     * @param {Shop} shop - The Shopify shop name.
     * @returns {Promise<void>} - A promise that resolves when the webhook is created.
     */
    static async createProductCreateWebhook(shop) {
        const topic = "products/create";

        await ShopifyWebhooksApi.#createWebhook(shop, {
            topic: topic,
            address: ShopifyWebhooksApi.KORVIN_API_URL + "/webhook/shopify/" + topic
        });
    }

    /**
     * Creates a webhook for product updates in Shopify.
     * @param {Shop} shop - The Shopify shop name.
     * @returns {Promise<void>} - A promise that resolves when the webhook is created.
     */
    static async createProductUpdateWebhook(shop) {
        const topic = "products/update";

        await ShopifyWebhooksApi.#createWebhook(shop, {
            topic: topic,
            address: ShopifyWebhooksApi.KORVIN_API_URL + "/webhook/shopify/" + topic
        });
    }

    /**
     * Creates a webhook for product deletion in Shopify.
     * @param {Shop} shop - The Shopify shop name.
     * @returns {Promise<void>} - A promise that resolves when the webhook is created.
     */
    static async createProductDeleteWebhook(shop) {
        const topic = "products/delete";

        await ShopifyWebhooksApi.#createWebhook(shop, {
            topic: topic,
            address: ShopifyWebhooksApi.KORVIN_API_URL + "/webhook/shopify/" + topic
        });
    }

    /**
     * Creates a Shopify webhook for order creation.
     * @param {Shop} shop - The Shopify shop name.
     * @returns {Promise<void>} - A promise that resolves when the webhook is created.
     */
    static async createOrderCreateWebhook(shop) {
        const topic = "orders/create";

        await ShopifyWebhooksApi.#createWebhook(shop, {
            topic: topic,
            address: ShopifyWebhooksApi.KORVIN_API_URL + "/webhook/shopify/" + topic
        });
    }

    /**
     * Creates a webhook for the "carts/create" topic.
     * @param {Shop} shop - The name of the Shopify shop.
     * @returns {Promise<void>} - A promise that resolves when the webhook is created.
     */
    static async createCartCreateWebhook(shop) {
        const topic = "carts/create";

        await ShopifyWebhooksApi.#createWebhook(shop, {
            topic: topic,
            address: ShopifyWebhooksApi.KORVIN_API_URL + "/webhook/shopify/" + topic
        });
    }

    /**
     * Creates a cart update webhook for the specified shop.
     * @param {Shop} shop - The shop name.
     * @returns {Promise<void>} - A promise that resolves when the webhook is created.
     */
    static async createCartUpdateWebhook(shop) {
        const topic = "carts/update";

        await ShopifyWebhooksApi.#createWebhook(shop, {
            topic: topic,
            address: ShopifyWebhooksApi.KORVIN_API_URL + "/webhook/shopify/" + topic
        });
    }

    /**
     * Retrieves a list of webhook IDs for a given Shopify store.
     * @param {Object} shop - The shop object containing the shop URL and token.
     * @returns {Promise<Array<number>>} - A promise that resolves to an array of webhook IDs.
     * @throws {Error} - If there is an error retrieving the webhooks.
     */
    static async listWebhooks(shop) {
        const store = shop.url.split(".")[0];

        const data = await ShopifyRestApiRequest.sendRequest(store, shop.token, "/webhooks.json", "GET");

        if (data.errors) {
            throw new Error(data.error);
        }

        const webhookIds = data.webhooks.map(webhook => webhook.id);

        return webhookIds;
    }

    /**
     * Deletes a webhook from the Shopify store.
     * @param {Object} shop - The shop object containing the shop URL and token.
     * @param {number} webhookId - The ID of the webhook to be deleted.
     * @throws {Error} If there is an error deleting the webhook.
     */
    static async deleteWebhook(shop, webhookId) {
        const store = shop.url.split(".")[0];
        const endpoint = `/webhooks/${webhookId}.json`;

        const data = await ShopifyRestApiRequest.sendRequest(store, shop.token, endpoint, "DELETE");

        if (data.errors) {
            throw new Error(data.error);
        }
    }
}

module.exports = ShopifyWebhooksApi;
