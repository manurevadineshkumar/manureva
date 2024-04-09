// eslint-disable-next-line no-unused-vars
const ShopDiscountRangeModel = require("../../models/ShopDiscountRange.model");

class ShopDiscountRangesHelper {

    static checkDiscountRanges({priceRanges, dayRanges, discountValues}) {
        if (!priceRanges || !dayRanges || !discountValues) {
            throw new Error("Not all inputs are provided");
        }

        if (priceRanges.length !== discountValues.length) {
            throw new Error("Array sizes are not matching");
        }

        discountValues.forEach((discountValuesRow) => {
            if (discountValuesRow.length !== dayRanges.length) {
                throw new Error("Array sizes are not matching");
            }
        });
    }

    /**
     * Transforms the discount values into a flattened array.
     * @param {Object} data - The data object.
     * @param {(number | null)[]} data.priceRanges - The price ranges.
     * @param {(number | null)[]} data.dayRanges - The day ranges.
     * @param {number[][]} data.discountValues - The discount values.
     * @returns {{
     *  price_to: number,
     *  day_to: number,
     *  discount: number,
     * }[]} - The flattened discount values.
     */
    static flattenDiscountValues({priceRanges, dayRanges, discountValues}) {
        ShopDiscountRangesHelper.checkDiscountRanges({priceRanges, dayRanges, discountValues});

        const flattenedDiscountValues = [];

        for (let i = 0; i < priceRanges.length; i++) {
            for (let j = 0; j < dayRanges.length; j++) {
                flattenedDiscountValues.push({
                    price_to: priceRanges[i],
                    day_to: dayRanges[j],
                    discount: discountValues[i][j],
                });
            }
        }

        return flattenedDiscountValues;
    }

    /**
     * Gets the discount value for the provided day and price.
     * @param {Object} data - The data object.
     * @param {ShopDiscountRangeModel} data.shopDiscountRanges - The shop discount ranges.
     * @param {number} data.day - The day.
     * @param {number} data.price - The price.
     * @returns {number} The discount value.
     */
    static getDiscountValue({shopDiscountRanges, day, price}) {
        const {discountRanges} = shopDiscountRanges;

        const discountRow = discountRanges.find((discountRange) => {
            let {day_to, price_to} = discountRange;

            day_to = day_to ?? Infinity;
            price_to = price_to ?? Infinity;

            return day <= day_to && price <= price_to;
        });

        if (!discountRow) {
            throw new Error(`No discount found for day ${day} and price ${price} (discount Range: ${discountRanges})`);
        }

        return discountRow.discount;
    }
}

module.exports = ShopDiscountRangesHelper;
