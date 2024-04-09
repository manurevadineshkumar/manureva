const Shop = require("../Shop");

const ShopifyShippingService = require("../../../business-services/shop/shopify/ShopifyShipping.service");
const ShopifyProductWebhookService = require("../../../business-services/shop/shopify/ShopifyProductWebhook.service");
const ShopifyOrderWebhookService = require("../../../business-services/shop/shopify/ShopifyOrderWebhook.service");
const ShopifyMetafieldService = require("../../../business-services/shop/shopify/ShopifyMetafieldService");

const ShopifyWebhooksApi = require("../../../data-access/shopify/ShopifyWebhooksApi");
const ShopifyMetafieldsApi = require("../../../data-access/shopify/ShopifyMetafieldsApi");

const HttpError = require("../../../errors/HttpError");

class ShopifyShop extends Shop {
    static ProductsManager = require("./ShopifyProductsManager");

    constructor(data) {
        super(data);
    }

    get baseUrl() {
        return "https://" + this.url + "/admin/api/2023-07";
    }

    static processUrl(url) {
        url = super.processUrl(url);

        url = url.split("/")[0];

        if (!url.endsWith(".myshopify.com"))
            throw new HttpError(
                400, "shop url should end with \"myshopify.com\""
            );

        return url;
    }

    /**
     * Creates a new shop.
     * This method also creates webhooks for products and orders.
     * @override Shop.create
     * @param {Object} data - The data for creating the shop.
     * @param {string} data.owner_id - The ID of the shop owner.
     * @param {string} data.name - The name of the shop.
     * @param {boolean} data.is_importing - Indicates if the shop is importing.
     * @param {boolean} data.is_exporting - Indicates if the shop is exporting.
     * @param {string} data.platform - The platform of the shop.
     * @param {string} data.currency - The currency of the shop.
     * @param {string} data.url - The URL of the shop.
     * @param {string} data.original_url - The original URL of the shop.
     * @param {string} data.token - The token of the shop.
     * @param {string} data.api_secret - The API secret of the shop.
     * @param {Array} data.day_ranges - The day ranges of the shop.
     * @param {Array} data.price_ranges - The price ranges of the shop.
     * @param {Array<Array<number>>} data.discount_values - The discount values of the shop.
     * @returns {Promise<Shop>} A promise that resolves with the created shop.
     */
    static async create({
        owner_id,
        name,
        is_importing,
        is_exporting,
        platform,
        currency,
        url,
        original_url,
        token,
        api_secret,
        day_ranges,
        price_ranges,
        discount_values
    }) {
        const shopifyShopInstance = await super.create({
            owner_id,
            name,
            is_importing,
            is_exporting,
            platform,
            currency,
            url,
            original_url,
            token,
            api_secret,
            day_ranges,
            price_ranges,
            discount_values
        });

        // Create shopify ressources sequentially to avoid stress on the Shopify API
        if (is_exporting) {
            await ShopifyShippingService.createShopShippingPolicy(original_url, token);
            await ShopifyOrderWebhookService.createWebhooks({shop: shopifyShopInstance});
            await ShopifyMetafieldService.createMetafieldDefinitions({shop: shopifyShopInstance});
        }

        if (is_importing) {
            await ShopifyProductWebhookService.createWebhooks({shop: shopifyShopInstance});
        }

        return shopifyShopInstance;
    }

    /**
     * Deletes the ShopifyShop instance.
     * This method also deletes associated webhooks for products and orders.
     * @override Shop.delete
     * @returns {Promise<void>} A promise that resolves when the deletion is complete.
     */
    async delete() {

        const webhookIds = await ShopifyWebhooksApi.listWebhooks(this);
        const metafieldDefinitionIds = await ShopifyMetafieldsApi.list({shop: this});

        // Delete sequentially to avoid stress on the Shopify API (Promise.all all the requests returns 500 error)
        for (const webhookId of webhookIds) {
            await ShopifyWebhooksApi.deleteWebhook(this, webhookId);
        }

        for (const metafieldDefinitionId of metafieldDefinitionIds) {
            await ShopifyMetafieldsApi.delete(this, metafieldDefinitionId);
        }

        await super.delete();
    }
}

module.exports = ShopifyShop;
