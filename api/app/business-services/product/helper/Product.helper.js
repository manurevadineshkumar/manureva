// eslint-disable-next-line no-unused-vars
const Product = require("../../../models/Product");

class ProductHelper {
    /**
     * Get the price of a product based on the specified price type.
     * @param {Product} product - The product object.
     * @param {string} priceType - The price type.
     * @returns {number} - The price of the product.
     * @throws {Error} - If the product or price type is null.
     */
    static getEffectivePrice(product, priceType) {
        if (!product) {
            throw new Error("[ProductHelper] Product is null");
        }

        if (!priceType) {
            throw new Error("[ProductHelper] Price type is null");
        }

        const priceTypeDiscounted = priceType + "Discounted";

        if (product[priceTypeDiscounted]) {
            return product[priceTypeDiscounted];
        }

        if (!product[priceType]) {
            throw new Error(
                `[ProductHelper] Price type ${priceType} is not valid for #${product.id}: ${product[priceType]}`
            );
        }
        return product[priceType];
    }

    static getEffectiveWholesalePrice(product) {
        return ProductHelper.getEffectivePrice(product, "wholesalePriceCents");
    }

    static getEffectiveRetailPrice(product) {
        return ProductHelper.getEffectivePrice(product, "retailPriceCents");
    }

    static getEffectivePurchasePrice(product) {
        return ProductHelper.getEffectivePrice(product, "purchasePriceCents");
    }

    /**
     * Check wether a product is available for sale.
     * A product is available for sale if its status is "ACTIVE" or "LOCKED".
     * @param {Product} product
     * @returns {Boolean}
     */
    static isForSale(product) {
        if (product.status === "ACTIVE" || product.status === "LOCKED") {
            return true;
        }

        return false;
    }
}

module.exports = ProductHelper;
