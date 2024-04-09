const Shop = require("../../models/shops/Shop");
const ShopStorage = require("../../storage/ShopStorage");
const ShopifyService = require("./shopify/Shopify.service");

class ShopService {
    static PLATFORMS = {
        SHOPIFY: "shopify"
    };

    /**
     * Fetches shop details based on the platform.
     * @param {string} platform - The platform name.
     * @param {string} url - The URL of the shop.
     * @param {string} token - The authentication token.
     * @param {boolean} is_exporting - if the shop is exporting or not
     * @returns {Promise<{currency: string, original_url: string}>} - The shop details.
     * @throws {Error} - If the platform is not supported.
     */
    static async fetchShopDetails(platform, url, token, is_exporting) {
        if (platform === ShopService.PLATFORMS.SHOPIFY) {
            return await ShopifyService.fetchShopDetails(url, token, is_exporting);
        } else {
            throw new Error(`Platform ${platform} not supported`);
        }
    }

    /**
     * Retrieves a shop by its URL.
     * @param {string} url - The URL of the shop.
     * @returns {Promise<Shop|null>} - A promise that resolves to a Shop instance if found, or null if not found.
     */
    static async getByUrl(url) {
        const data = await ShopStorage.getByUrl(url);

        if (!data) {
            return null;
        }

        return new Shop(data);
    }
}

module.exports = ShopService;
