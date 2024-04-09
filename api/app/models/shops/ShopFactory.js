const ShopStorage = require("../../storage/ShopStorage");
const ShopifyShop = require("./shopify/ShopifyShop");

// eslint-disable-next-line no-unused-vars
const Shop = require("./Shop");

class ShopFactory {
    static SHOP_CLASSES = {
        shopify: ShopifyShop
    };

    /**
     * Instantiate a new shop with the proper class
     * @param data {Object} the shop data
     * @return {?Shop}
     */
    static buildShop(data) {
        const instance = ShopFactory.SHOP_CLASSES[data?.platform];

        return data && instance ? new instance(data) : null;
    }

    /**
     * Get a shop by its id and its owner's id
     * @param id {Number} the shop's id
     * @param user_id {Number} the shop owner's id
     * @param skip_ownership_check {Boolean} if `true`, do not require `user_id`
     * to match
     * @return {Promise<?Shop>}
     */
    static async getById(id, user_id, skip_ownership_check = false) {
        const data = await ShopStorage.getById(
            id, user_id, skip_ownership_check
        );

        return ShopFactory.buildShop(data);
    }

    /**
     * Get a shop by its name and its owner's id
     * @param name {String} the shop's name
     * @param user_id {Number} the shop owner's id
     * @return {Promise<?Shop>}
     */
    static async getByName(name, user_id) {
        const data = await ShopStorage.getByName(name, user_id);

        return ShopFactory.buildShop(data);
    }

    /**
     * Get a shop by its URL and platform
     * @param url {String} the shop's URL
     * @param platform {String} the shop's platform
     * @return {Promise<?Shop>}
     */
    static async getByUrl(url, platform) {
        const ShopClass = ShopFactory.SHOP_CLASSES[platform];

        const data = await ShopStorage.getByUrl(ShopClass.processUrl(url));

        return ShopFactory.buildShop(data);
    }

    /**
     * Creates a new shop.
     * @param {Object} data - The data for creating the shop.
     * @param {number} data.owner_id - The ID of the shop owner.
     * @param {string} data.name - The name of the shop.
     * @param {boolean} data.is_importing - Indicates if the shop is importing.
     * @param {boolean} data.is_exporting - Indicates if the shop is exporting.
     * @param {string} data.platform - The platform of the shop.
     * @param {string} data.currency - The currency of the shop.
     * @param {string} data.original_url - The original url of the shop.
     * @param {string} data.url - The URL of the shop.
     * @param {string} data.token - The access token of the shop.
     * @param {string} data.api_secret - The API secret of the shop.
     * @param {Array} data.day_ranges - The day ranges of the shop.
     * @param {Array} data.price_ranges - The price ranges of the shop.
     * @param {Array<Array>} data.discount_values - The discount values of the shop.
     * @returns {Promise<Shop>} A promise that resolves with the created shop.
     */
    static async create(data) {
        const ShopClass = ShopFactory.SHOP_CLASSES[data.platform];

        return await ShopClass.create(data);
    }

    /**
     * List shops for a user
     * @param user_id {Number} a user id
     * @param filters {Object} filters to pass to shop listing
     * @param prev_id {Number} previous id for pagination
     * @param batch_size {Number} batch size for pagination
     * @return {Promise<Shop[]>}
     */
    static async listForUser(
        user_id, prev_id = 0, batch_size = 16, filters = {}
    ) {
        const shops = await ShopStorage.listForUser(
            user_id, prev_id, batch_size, filters
        );

        return shops.map(data => ShopFactory.buildShop(data));
    }
}

module.exports = ShopFactory;
