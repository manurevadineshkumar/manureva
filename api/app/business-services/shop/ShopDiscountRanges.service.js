const ShopDiscountRangesStorage = require("../../data-access/sql/ShopDiscountRanges.storage");
const ShopDiscountRangeModel = require("../../models/ShopDiscountRange.model");
const ShopDiscountRangesHelper = require("../helper/ShopDiscountRanges.helper");

class ShopDiscountRangesService {
    /**
     * Creates a new shop discount range.
     * @param {Object} params - The parameters for creating the shop discount range.
     * @param {number} params.shopId - The ID of the shop.
     * @param {(number | null)[]} params.dayRanges - The day ranges for the discount.
     * @param {(number | null)[]} params.priceRanges - The price ranges for the discount.
     * @param {number[][]} params.discountValues - The discount values.
     * @returns {Promise<ShopDiscountRangeModel>} A promise that resolves with the created shop discount range.
     */
    static async create({
        shopId,
        dayRanges,
        priceRanges,
        discountValues,
    }) {
        const flattenedDiscountValues = ShopDiscountRangesHelper.flattenDiscountValues({
            dayRanges,
            priceRanges,
            discountValues,
        });

        const data = await ShopDiscountRangesStorage.create({
            shopId,
            flattenedDiscountValues,
        });

        return new ShopDiscountRangeModel(data);
    }

    static async getDiscountValue({
        shopId,
        day,
        price,
    }) {
        const data = await ShopDiscountRangesStorage.getByShopId(shopId);
        const shopDiscountRanges = new ShopDiscountRangeModel(data);

        const discountValue = ShopDiscountRangesHelper.getDiscountValue({
            shopDiscountRanges,
            day,
            price,
        });

        return discountValue;
    }
}

module.exports = ShopDiscountRangesService;
