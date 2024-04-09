const MarketplaceStorage = require("../../storage/MarketplaceStorage");

const VestiaireMarketplace = require("./vestiaire/VestiaireMarketplace");

class MarketplaceFactory {
    static MARKETPLACE_CLASSES = {
        vestiaire: VestiaireMarketplace
    };

    /**
     * Instantiate a new marketplace with the proper class
     * @param data {Object} the marketplace data
     * @return {?Marketplace}
     */
    static buildMarketplace(data) {
        const instance = MarketplaceFactory.MARKETPLACE_CLASSES[
            data?.platform
        ];

        return data && instance ? new instance(data) : null;
    }

    /**
     * Get a marketplace by its id and its owner's ID
     * @param id {Number} the marketplace's ID
     * @param user_id {Number} the marketplace owner's ID
     * @param skip_ownership_check {Boolean} if `true`, do not require `user_id`
     * to match
     * @return {Promise<?Marketplace>}
     */
    static async getById(id, user_id, skip_ownership_check = false) {
        const data = await MarketplaceStorage.getById(
            id, user_id, skip_ownership_check
        );

        return MarketplaceFactory.buildMarketplace(data);
    }

    /**
     * Create a new marketplace
     * @param data {Object} the marketplace's parameters
     * @return {Promise<Marketplace>}
     */
    static async create(data) {
        const MarketplaceClass = MarketplaceFactory.MARKETPLACE_CLASSES[
            data.platform
        ];

        return await MarketplaceClass.create(data);
    }

    /**
     * List marketplaces for a user
     * @param user_id {Number} a user id
     * @param prev_id {Number} previous id for pagination
     * @param batch_size {Number} batch size for pagination
     * @return {Promise<Marketplace[]>}
     */
    static async listForUser(user_id, prev_id = 0, batch_size = 32) {
        const marketplaces = await MarketplaceStorage.listForUser(
            user_id, prev_id, batch_size
        );

        return marketplaces.map(data =>
            MarketplaceFactory.buildMarketplace(data)
        );
    }
}

module.exports = MarketplaceFactory;
