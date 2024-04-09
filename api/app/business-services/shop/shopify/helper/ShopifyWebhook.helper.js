const HttpError = require("../../../../errors/HttpError");
const Shop = require("../../../../models/shops/Shop");
const ShopStorage = require("../../../../storage/ShopStorage");
const CryptoHelper = require("../../../helper/Crypto.helper");

class ShopifyWebhookHelper {
    /**
     * Checks the validity of a Shopify webhook request and returns the Shop object.
     * @param {Object} options - The options for checking the webhook.
     * @param {Object} options.req - The request object containing the headers.
     * @returns {Promise<Shop>} - A promise that resolves to a Shop object if the webhook is valid.
     * @throws {HttpError} - Throws an error if the webhook is invalid or missing required headers.
     */
    static async checkShopifyWebhook({req}) {
        const headers = req.headers;
        const hmac = headers["x-shopify-hmac-sha256"];
        const domain = headers["x-shopify-shop-domain"];

        if (!hmac || !domain) {
            throw new HttpError(400, "Missing headers");
        }

        const shop = await ShopStorage.getByUrl(domain);
        if (!shop) {
            throw new HttpError(404, "Shop not found");
        }

        const isValid = CryptoHelper.verifyShopifyHmac({req: req, secret: shop.api_secret});
        if (!isValid) {
            throw new HttpError(400, "Invalid HMAC");
        }

        return new Shop(shop);
    }
}

module.exports = ShopifyWebhookHelper;
