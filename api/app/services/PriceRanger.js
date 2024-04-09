const Utils = require("./Utils");

class PriceRanger {
    static findRange(price, ranges) {
        return Utils.binSearch(ranges, ({to}, i) => {
            const from = i ? ranges[i - 1].to : 0;

            if (from && price <= from)
                return 1;

            if (to && price > to)
                return -1;

            return 0;
        });
    }

    /**
     * Adds the percent to the price according to the ranges
     * @param {number} price The price in cents!
     * @param {any} ranges
     * @returns The price with the percent added
     */
    static addPercent(price, ranges) {
        const range = PriceRanger.findRange(price, ranges);

        if (range !== null)
            price += price * ranges[range].percent / 100;

        return price;
    }

    /**
     * Substracts the percent from the price according to the ranges
     * @param {number} price The price in cents!
     * @param {any} ranges
     * @returns The price with the percent substracted
     */
    static subtractPercent(price, ranges) {
        const range = PriceRanger.findRange(price, ranges);

        if (range !== null)
            price -= price * ranges[range].percent / 100;

        return price;
    }
}

module.exports = PriceRanger;
