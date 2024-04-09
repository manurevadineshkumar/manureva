const PriceRangesStorage = require("../storage/PriceRangesStorage");
const PriceRanger = require("../services/PriceRanger");

class PriceRanges {
    constructor(data) {
        /** @type {"shop" | "marketplace"} */
        this.targetType = data.target_type;

        /** @type {number} */
        this.targetId = data.target_id;

        /** @type {{to: number, percent: number}[]} */
        this.ranges = data.ranges;
    }

    serialize() {
        return JSON.parse(JSON.stringify(this.ranges));
    }

    /**
     * Lists price ranges for a Shop
     * @param id
     * @return {Promise<PriceRanges>}
     */
    static async getByShopId(id) {
        const data = await PriceRangesStorage.getByShopId(id);

        return new PriceRanges(data);
    }

    /**
     * Lists price ranges for a Marketplace
     * @param id
     * @return {Promise<PriceRanges>}
     */
    static async getByMarketplaceId(id) {
        const data = await PriceRangesStorage.getByMarketplaceId(id);

        return new PriceRanges(data);
    }

    /**
     * Sets price ranges for a Shop
     * @param id
     * @param ranges
     * @return {Promise<PriceRanges>}
     */
    static async setForShop(id, ranges) {
        return new PriceRanges(await PriceRangesStorage.setForShop(id, ranges));
    }

    /**
     * Sets price ranges for a Marketplace
     * @param id
     * @param ranges
     * @return {Promise<PriceRanges>}
     */
    static async setForMarketplace(id, ranges) {
        return new PriceRanges(
            await PriceRangesStorage.setForMarketplace(id, ranges)
        );
    }

    /**
     * Increases a price based on ranges
     *
     * @param {number} price Price in cents
     * @return {Promise<Number>}
     */
    addPercent(price) {
        return PriceRanger.addPercent(price, this.ranges);
    }

    /**
     * Decreases a price based on ranges
     *
     * @param {number} price Price in cents
     * @return {Promise<Number>}
     */
    subtractPercent(price) {
        return PriceRanger.subtractPercent(price, this.ranges);
    }

    /**
     * Updates these PriceRanges
     * @param ranges
     * @return {Promise<void>}
     */
    async update(ranges) {
        const handler = {
            shop: PriceRanges.setForShop,
            marketplace: PriceRanges.setForMarketplace
        }[this.targetType];

        await handler?.(this.targetId, ranges);

        this.ranges = ranges;
    }

    /**
     * Deletes these PriceRanges
     * @return {Promise<void>}
     */
    async delete() {
        return await this.update([]);
    }
}

module.exports = PriceRanges;
