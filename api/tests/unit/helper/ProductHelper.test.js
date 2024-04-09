const ProductHelper = require("../../../app/business-services/product/helper/Product.helper");

const assert = require("assert");
const { describe } = require('mocha');

describe("ProductHelper", () => {
    describe('getEffectiveWholesalePrice', () => {
        it ('should return discounted price if it exists', () => {
            const product = {
                wholesalePriceCents: 100,
                wholesalePriceCentsDiscounted: 90,
            };

            const price = ProductHelper.getEffectiveWholesalePrice(product);

            assert.strictEqual(price, 90);
        });

        it ('should return regular price if discounted price does not exist', () => {
            const product = {
                wholesalePriceCents: 100,
            };
            const price = ProductHelper.getEffectiveWholesalePrice(product);
            assert.strictEqual(price, 100);
        });

        it ('should return regular price if discounted price is null', () => {
            const product = {
                wholesalePriceCents: 100,
            };
            const price = ProductHelper.getEffectiveWholesalePrice(product);
            assert.strictEqual(price, 100);
        });

        it ('should throw an error if product is null', () => {
            assert.throws(() => ProductHelper.getEffectiveWholesalePrice(null));
        });

    });
    describe('getEffectiveRetailPrice', () => {
        it ('should return discounted price if it exists', () => {
            const product = {
                retailPriceCents: 100,
                retailPriceCentsDiscounted: 90,
            };

            const price = ProductHelper.getEffectiveRetailPrice(product);

            assert.strictEqual(price, 90);
        });

        it ('should return regular price if discounted price does not exist', () => {
            const product = {
                retailPriceCents: 100,
            };
            const price = ProductHelper.getEffectiveRetailPrice(product);
            assert.strictEqual(price, 100);
        });

        it ('should return regular price if discounted price is null', () => {
            const product = {
                retailPriceCents: 100,
            };
            const price = ProductHelper.getEffectiveRetailPrice(product);
            assert.strictEqual(price, 100);
        });

        it ('should throw an error if product is null', () => {
            assert.throws(() => ProductHelper.getEffectiveRetailPrice(null));
        });

    });
    describe('getEffectivePurchasePrice', () => {
        it ('should return discounted price if it exists', () => {
            const product = {
                purchasePriceCents: 100,
                purchasePriceCentsDiscounted: 90,
            };

            const price = ProductHelper.getEffectivePurchasePrice(product);

            assert.strictEqual(price, 90);
        });

        it ('should return regular price if discounted price does not exist', () => {
            const product = {
                purchasePriceCents: 100,
            };
            const price = ProductHelper.getEffectivePurchasePrice(product);
            assert.strictEqual(price, 100);
        });

        it ('should return regular price if discounted price is null', () => {
            const product = {
                purchasePriceCents: 100,
            };
            const price = ProductHelper.getEffectivePurchasePrice(product);
            assert.strictEqual(price, 100);
        });

        it ('should throw an error if product is null', () => {
            assert.throws(() => ProductHelper.getEffectivePurchasePrice(null));
        });

    });
    describe('getPrice', () => {
        it ('should return discounted price if it exists', () => {
            const product = {
                wholesalePriceCents: 100,
                wholesalePriceCentsDiscounted: 90,
            };

            const price = ProductHelper.getEffectivePrice(product, "wholesalePriceCents");

            assert.strictEqual(price, 90);
        });

        it ('should return regular price if discounted price does not exist', () => {
            const product = {
                wholesalePriceCents: 100,
            };
            const price = ProductHelper.getEffectivePrice(product, "wholesalePriceCents");
            assert.strictEqual(price, 100);
        });

        it ('should return regular price if discounted price is null', () => {
            const product = {
                wholesalePriceCents: 100,
            };
            const price = ProductHelper.getEffectivePrice(product, "wholesalePriceCents");
            assert.strictEqual(price, 100);
        });

        it ('should throw an error if product is null', () => {
            assert.throws(() => ProductHelper.getEffectivePrice(null, "wholesalePriceCents"));
        });

        it ('should throw an error if price type is null or empty', () => {
            assert.throws(() => ProductHelper.getEffectivePrice({}, ""));
            assert.throws(() => ProductHelper.getEffectivePrice({}, null));
        });
    });
});