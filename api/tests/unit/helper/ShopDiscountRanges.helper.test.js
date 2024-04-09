const ShopDiscountRangesHelper = require("../../../app/business-services/helper/ShopDiscountRanges.helper");
const assert = require("assert");
const ShopDiscountRangeModel = require("../../../app/models/ShopDiscountRange.model");

describe("ShopDiscountRangesHelper", () => {

    const dayRanges = [30, null];
    const priceRanges = [100, null];
    const discountValues = [
        [1, 2],
        [3, 4]
    ];

    describe("flattenDiscountValues", () => {

        it("should throw an error if not all inputs are provided" , () => {
            assert.throws(() => {
                ShopDiscountRangesHelper.flattenDiscountValues();
            });

            assert.throws(() => {
                ShopDiscountRangesHelper.flattenDiscountValues({
                    dayRanges,
                    priceRanges
                });
            });

            assert.throws(() => {
                ShopDiscountRangesHelper.flattenDiscountValues({
                    priceRanges,
                    discountValues
                });
            });

            assert.throws(() => {
                ShopDiscountRangesHelper.flattenDiscountValues({
                    dayRanges,
                    discountValues
                });
            });
        });

        it("should throw an error if array sizes are not matching", () => {
            assert.throws(() => {
                ShopDiscountRangesHelper.flattenDiscountValues({
                    dayRanges: [30, null, 40],
                    priceRanges,
                    discountValues
                });
            });

            assert.throws(() => {
                ShopDiscountRangesHelper.flattenDiscountValues({
                    dayRanges,
                    priceRanges: [100, null, 200],
                    discountValues
                });
            });

            assert.throws(() => {
                ShopDiscountRangesHelper.flattenDiscountValues({
                    dayRanges,
                    priceRanges,
                    discountValues: [
                        [1, 2],
                        [3, 4],
                        [5, 6]
                    ]
                });
            });
        });

        it("should return an array of objects with the correct structure", () => {
            const flattenedDiscountValues = ShopDiscountRangesHelper.flattenDiscountValues({
                dayRanges,
                priceRanges,
                discountValues
            });

            assert.strictEqual(flattenedDiscountValues.length, 4);
            assert.deepStrictEqual(flattenedDiscountValues, [
                {
                    price_to: 100,
                    day_to: 30,
                    discount: 1
                },
                {
                    price_to: 100,
                    day_to: null,
                    discount: 2
                },
                {
                    price_to: null,
                    day_to: 30,
                    discount: 3
                },
                {
                    price_to: null,
                    day_to: null,
                    discount: 4
                }
            ]);
                
        });

    });

    describe("getDiscountValue", () => {

        const data = [
            {shop_id: 42, day_to: 30, price_to: 100, discount: 1},
            {shop_id: 42, day_to: 30, price_to: 200, discount: 2},
            {shop_id: 42, day_to: 30, price_to: null, discount: 3},
            {shop_id: 42, day_to: 60, price_to: 100, discount: 4},
            {shop_id: 42, day_to: 60, price_to: 200, discount: 5},
            {shop_id: 42, day_to: 60, price_to: null, discount: 6},
            {shop_id: 42, day_to: null, price_to: 100, discount: 7},
            {shop_id: 42, day_to: null, price_to: 200, discount: 8},
            {shop_id: 42, day_to: null, price_to: null, discount: 9}
        ]

        const shopDiscountRanges = new ShopDiscountRangeModel(data)

        it("should return the correct values", () => {
            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 29.9, price: 50}),
                1
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 29.9, price: 150}),
                2
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 29.9, price: 250}),
                3
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 30, price: 50}),
                1
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 30, price: 150}),
                2
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 30, price: 250}),
                3
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 31, price: 50}),
                4
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 31, price: 150}),
                5
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 31, price: 250}),
                6
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 70, price: 50}),
                7
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 70, price: 150}),
                8
            );

            assert.strictEqual(
                ShopDiscountRangesHelper.getDiscountValue({shopDiscountRanges, day: 70, price: 250}),
                9
            );
        });
    });
});