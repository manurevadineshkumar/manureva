class ShopDiscountRangeModel {
    /**
     * Represents a ShopDiscountRange model.
     * @constructor
     * @param {{
     *  shop_id: number,
     *  day_to: number,
     *  price_to: number,
     *  discount: number
     * }[]} data - The array of discount ranges.
     */
    constructor(data) {
        /** @type {{day_to: number, price_to: number, discount: number}[]} */
        this.discountRanges = data.map(({day_to, price_to, discount}) => ({
            day_to,
            price_to,
            discount
        }));
    }

    /**
     * Lists discount ranges for a Shop
     * @returns {{day_to: number, price_to: number, discount: number}[]}
     */
    serialize() {
        return JSON.parse(JSON.stringify(this.discountRanges));
    }
}

module.exports = ShopDiscountRangeModel;
