// eslint-disable-next-line no-unused-vars
const Product = require("../../../../models/Product");
// eslint-disable-next-line no-unused-vars
const Shop = require("../../../../models/shops/Shop");
const Brand = require("../../../../models/Brand");
const Type = require("../../../../models/Type");

const ShopifyService = require("../Shopify.service");
const ShopifyBindingService = require("../ShopifyBinding.service");

const ArrayUtils = require("../../../../services/ArrayUtils");

class ShopifyProductWebhookHelper {
    /**
     * Compares the prices of a Shopify product and a Korvin product and returns the prices that need to be updated.
     * @param {Object} options - The options for comparing the prices.
     * @param {Object} options.shopifyProduct - The Shopify product object.
     * @param {Product} options.korvinProduct - The Korvin product object.
     * @returns {{
     *   boughtPrice: number,
     *   boughtPriceDiscounted: number
     * }} - The prices that need to be updated.
     */
    static #compareShopifyAndKorvinPrices({shopifyProduct, korvinProduct}) {
        const {boughtPrice, boughtPriceDiscounted} = ShopifyService.convertShopifyPricesToKorvinPrices({
            price: shopifyProduct.price,
            compareAtPrice: shopifyProduct.compareAtPrice
        });

        const pricesToUpdate = {};

        if (boughtPrice !== korvinProduct.boughtPrice) {
            pricesToUpdate["boughtPrice"] = boughtPrice;
        }

        if (boughtPriceDiscounted !== korvinProduct.boughtPriceDiscounted) {
            pricesToUpdate["boughtPriceDiscounted"] = boughtPriceDiscounted;
        }

        return pricesToUpdate;
    }

    /**
     * @typedef {Object} ToUpdate
     * @property {Object} toUpdate - The update object containing the differences.
     * @property {string} [toUpdate.status] - The status of the product.
     * @property {string} [toUpdate.name] - The name of the product.
     * @property {string} [toUpdate.description] - The description of the product.
     * @property {number} [toUpdate.boughtPrice] - The bought price of the product.
     * @property {number} [toUpdate.boughtPriceDiscounted] - The discounted bought price of the product.
     * @property {number} [toUpdate.brand_id] - The brand identifier.
     * @property {number} [toUpdate.type_id] - The type identifier.
     * @property {number[]} [toUpdate.color_ids] - The color identifiers.
     * @property {number[]} [toUpdate.material_ids] - The material identifiers.
     * @property {Brand|null} brand - The brand object.
     * @property {Type|null} type - The type object.
     */

    /**
     * Compares a Shopify product with a Korvin product and generates an update object based on the differences.
     *
     * @param {Object} options - The options for comparison.
     * @param {Object} options.shopifyProduct - The Shopify product object.
     * @param {Product} options.korvinProduct - The Korvin product object.
     * @param {Shop} options.shop - The shop identifier.
     * @returns {Promise<ToUpdate>} - The update object containing the differences.
     */
    static async compareShopifyAndKorvinProduct({shopifyProduct, korvinProduct, shop}) {
        const toUpdate = {};

        if (shopifyProduct.status !== "ACTIVE" || shopifyProduct.totalInventory === 0) {
            toUpdate["status"] = "DISABLED";
        } else if (shopifyProduct.status === "ACTIVE" && korvinProduct.status === "DISABLED") {
            toUpdate["status"] = "ACTIVE";
        }

        if (shopifyProduct.title !== korvinProduct.name) {
            toUpdate["name"] = shopifyProduct.title;
        }

        if (shopifyProduct.descriptionHtml !== korvinProduct.description) {
            toUpdate["description"] = shopifyProduct.descriptionHtml;
        }

        // need to match bindings type and brand and compare
        const binding_categories = await ShopifyBindingService.matchShopifyProductToBindings({shop, shopifyProduct});

        const {rawData, brandId, typeId} = await ShopifyService.createProductData({
            shop,
            shopifyProduct,
            binding_categories
        });

        let brand = null;
        if (brandId !== korvinProduct.brand.id) {
            brand = await Brand.getById(brandId);
            toUpdate["brand_id"] = brandId;
        }

        let type = null;
        if (typeId !== korvinProduct.type.id) {
            type = await Type.getById(typeId);
            toUpdate["type_id"] = typeId;
        }

        const pricesToUpdate = ShopifyProductWebhookHelper.#compareShopifyAndKorvinPrices({
            shopifyProduct,
            korvinProduct,
        });
        Object.assign(toUpdate, pricesToUpdate);

        const shopifyColorIds = rawData.color_ids;
        const korvinColorIds = Object.keys(korvinProduct.colors).map(color => +color);
        if (ArrayUtils.sameUniqueElements(shopifyColorIds, korvinColorIds) === false) {
            toUpdate["color_ids"] = rawData.color_ids;
        }

        const shopifyMatieralIds = rawData.material_ids;
        const korvinMaterialIds = Object.keys(korvinProduct.materials).map(material => +material);
        if (ArrayUtils.sameUniqueElements(shopifyMatieralIds, korvinMaterialIds) === false) {
            toUpdate["material_ids"] = rawData.material_ids;
        }

        return {toUpdate, brand, type};
    }
}

module.exports = ShopifyProductWebhookHelper;
