const Storage = require("../../storage/Storage");

class ShopDiscountRangesStorage extends Storage {
    /**
     * Creates a new shop discount range.
     * @param {Object} options - The options for creating a shop discount range.
     * @param {number} options.shopId - The ID of the shop.
     * @param {{
     *  price_to: number,
     *  day_to: number,
     *  discount: number,
     * }[]} options.flattenedDiscountValues - The flattened discount values.
     * @returns {Promise} A promise that resolves with the created data.
     */
    static async create({
        shopId,
        flattenedDiscountValues,
    }) {
        const formatedDiscountValues = flattenedDiscountValues.map(({price_to, day_to, discount}) => {
            return [shopId, price_to, day_to, discount];
        });

        await Storage.query(
            `INSERT INTO shop_discount_ranges
                (shop_id, price_to, day_to, discount)
                VALUES ?;`,
            formatedDiscountValues
        );

        return await ShopDiscountRangesStorage.getByShopId(shopId);
    }

    /**
     * Retrieves shop discount ranges by shop ID.
     * @param {number} id - The ID of the shop.
     * @returns {Promise<{
     *  shop_id: number,
     *  price_to: number | null,
     *  day_to: number | null,
     *  discount: number
     * }[]>} - A promise that resolves to an array of shop discount range objects.
     */
    static async getByShopId(id) {
        const data = await Storage.query(`
            SELECT shop_id, price_to, day_to, discount
            FROM shop_discount_ranges
            WHERE shop_id = ?;`,
        id);

        return data.map(({shop_id, price_to, day_to, discount}) => ({
            shop_id,
            price_to,
            day_to,
            discount,
        }));
    }
}

module.exports = ShopDiscountRangesStorage;

