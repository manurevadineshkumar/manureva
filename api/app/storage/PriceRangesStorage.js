const ArrayUtils = require("../services/ArrayUtils");
const Storage = require("./Storage");

class PriceRangesStorage extends Storage {
    static async #setForType(target_type, target_id, ranges) {
        const delete_query = `DELETE FROM price_ranges
            WHERE (target_type, target_id) = (?, ?);`;
        const create_query = ranges.length
            ? `INSERT INTO price_ranges
                (target_type, target_id, price_to, percent)
                VALUES ?;`
            : "";

        const ordered_ranges = ArrayUtils.orderByProperty(ranges, "to");

        await Storage.query(
            delete_query + create_query,
            target_type, target_id,
            ...(
                ordered_ranges.length
                    ? [ordered_ranges.map(({to, percent}) =>
                        [target_type, target_id, to, percent]
                    )]
                    : []
            )
        );

        return await PriceRangesStorage.#getForTypeById(target_type, target_id);
    }

    static async setForShop(id, ranges) {
        return await PriceRangesStorage.#setForType("shop", id, ranges);
    }

    static async setForMarketplace(id, ranges) {
        return await PriceRangesStorage.#setForType("marketplace", id, ranges);
    }

    static async #getForTypeById(target_type, target_id) {
        const ranges = (
            await Storage.query(`
                SELECT *
                FROM price_ranges
                WHERE (target_type, target_id) = (?, ?)
                ORDER BY ISNULL(price_to), price_to ASC;`,
            target_type, target_id)
        ).map(({price_to, percent}) => ({to: price_to, percent}));

        return {target_type, target_id, ranges};
    }

    static async getByShopId(id) {
        return PriceRangesStorage.#getForTypeById("shop", id);
    }

    static async getByMarketplaceId(id) {
        return PriceRangesStorage.#getForTypeById("marketplace", id);
    }
}

module.exports = PriceRangesStorage;
