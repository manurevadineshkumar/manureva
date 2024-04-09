// eslint-disable-next-line no-unused-vars
const Shop = require("../../../models/shops/Shop");
// eslint-disable-next-line no-unused-vars
const Product = require("../../../models/Product");

const ProductHelper = require("../../product/helper/Product.helper");
const ShopifyFieldService = require("./helper/ShopifyProductField.helper");
const Utils = require("../../../services/Utils");

const ShopifyRestApiRequest = require("../../../data-access/shopify/ShopifyRestApiRequest");

const shopify_access_scopes = require("../../../const/shopify-access-scope.json");
const HttpError = require("../../../errors/HttpError");

class ShopifyService {
    /**
     * Fetches shop details from Shopify.
     * @param {string} url - The URL of the Shopify store.
     * @param {string} token - The access token for the Shopify API.
     * @param {boolean} is_exporting - If the shop is exporting or not
     * @returns {Promise<{currency: string, original_url: string}>}
     * The shop details, including the currency and the original shopify domain.
     */
    static async fetchShopDetails(url, token, is_exporting) {
        const result = await ShopifyRestApiRequest.fetchAccessScopes(url, token);
        const storeAccessScopes = result.access_scopes.map((elem) => elem.handle);
        let korvinAccesScopes = shopify_access_scopes["access-scopes"];

        if (!is_exporting) {
            korvinAccesScopes = korvinAccesScopes
                .filter((scope) => scope.includes("shipping") === false);
        }

        for (const scope of korvinAccesScopes) {
            if (!storeAccessScopes.includes(scope)) {
                throw new HttpError(412, `Missing ${scope} permission`);
            }
        }

        const shopifyDetails = await ShopifyRestApiRequest.fetchShopDetails(url, token);

        return {
            currency: shopifyDetails.shop.currency,
            original_url: shopifyDetails.shop.myshopify_domain
        };
    }

    /**
     * Converts Shopify prices to Korvin prices.
     * @param {Object} options - The options for conversion.
     * @param {number} options.price - The price of the product.
     * @param {number|null} options.compareAtPrice - The compare at price of the product.
     * @returns {{
     *   boughtPrice: number,
     *   boughtPriceDiscounted: number | null
     * }} - The converted prices.
     */
    static convertShopifyPricesToKorvinPrices({price, compareAtPrice}) {
        price = +price;
        compareAtPrice = compareAtPrice ? +compareAtPrice : null;

        let boughtPrice;
        let boughtPriceDiscounted;
        if (compareAtPrice && compareAtPrice > price) {
            boughtPrice = compareAtPrice;
            boughtPriceDiscounted = price;
        } else {
            boughtPrice = price;
            boughtPriceDiscounted = null;
        }

        return {
            boughtPrice,
            boughtPriceDiscounted
        };
    }

    /**
     * Creates Korvin product data from Shopify product.
     * @param {Object} options - The options for creating product data.
     * @param {Shop} options.shop - The shop name.
     * @param {Object} options.shopifyProduct - The Shopify product data.
     * @param {Object} options.binding_categories - The binding categories data.
     * @throws {Error} - If the product is missing type, brand, or price.
     */
    static async createProductData({shop, shopifyProduct, binding_categories}) {
        const getHighestPriorityId = function(bindings) {
            const sortedBindings = bindings.sort((a, b) => b.priority - a.priority);
            return sortedBindings.length > 0 ? sortedBindings[0].id : null;
        };

        const {boughtPrice, boughtPriceDiscounted} = ShopifyService.convertShopifyPricesToKorvinPrices({
            price: shopifyProduct.price,
            compareAtPrice: shopifyProduct.compareAtPrice
        });

        const brandId = getHighestPriorityId(binding_categories.brands);
        const typeId = getHighestPriorityId(binding_categories.types);
        const rawData = {
            owner_id: shop.ownerId,
            gender: getHighestPriorityId(binding_categories.genders),
            name: shopifyProduct.title,
            description: shopifyProduct.descriptionHtml,
            status: shopifyProduct.status,
            is_exportable: 0,
            bought_currency: shop.currency,
            bought_price: boughtPrice,
            bought_price_discounted: boughtPriceDiscounted,
            purchase_price_cents: null,
            retail_price_cents: null,
            wholesale_price_cents: null,
            grade: "B",
            color_ids: binding_categories.colors.map(({id}) => id),
            material_ids: binding_categories.materials.map(({id}) => id)
        };

        if (!brandId || !typeId || !rawData.bought_price) {
            throw new Error("products must have type, brand and price");
        }

        return {
            rawData,
            brandId,
            typeId
        };
    }

    /**
     * Creates default Shopify product data from Korvin product.
     * This is the minimal data required to create or update a Shopify product.
     * You can tune the fields after calling this function to fit your need.
     * @param {Object} options - The options for creating Shopify product data.
     * @param {Product} options.product - The Korvin product object.
     * @param {number} [options.external_id] - The external ID of the product.
     * @param {"retail"|"wholesale"} [options.priceType="wholesale"] - The price type to use.
     * @returns The Shopify product data to send to Shopify REST API.
     */
    static async createShopifyProductDataFromKorvinProduct({product, external_id, priceType = "wholesale"}) {
        const conditionalFields = {};
        if (external_id) {
            conditionalFields["id"] = external_id;
        } else {
            const extras = {
                hasSerial: product.hasSerial,
                hasBox: product.hasBox,
                hasGuaranteeCard: product.hasGuaranteeCard,
                hasStorageBag: product.hasStorageBag,
            };

            conditionalFields["images"] = product.imageUrls.map(src => ({src}));
            conditionalFields["metafields"] = [
                ShopifyFieldService.createMetafieldColors(product.colors),
                ShopifyFieldService.createMetafieldMaterials(product.materials),
                ShopifyFieldService.createMetafieldGrade(product.grade),
                ShopifyFieldService.createMetafieldSize(product.size),
                ShopifyFieldService.createMetafieldExtras(extras),
            ].filter(Boolean);
        }

        const body_html = ShopifyFieldService.createBodyHtml([
            ["Grade", product.grade],
            [
                "Colors",
                Object.values(product.colors)
                    .map(({name}) => name)
                    .join(", ")
            ],
            [
                "Materials",
                Object.values(product.materials)
                    .map(({name}) => name)
                    .join(", ")
            ]
        ]);

        const prices = {
            "wholesale": ProductHelper.getEffectiveWholesalePrice(product) / 100,
            "retail": ProductHelper.getEffectiveRetailPrice(product) / 100,
        };

        const compareAtPrices = {
            "wholesale": product.wholesalePriceCents / 100,
            "retail": product.retailPriceCents / 100,
        };

        const tags = [
            product.type.name,
            product.subtype?.name,
            ...Object.values(product.tags).map(({name}) => name)
        ].filter(Boolean).map(tag => Utils.capitalizeAll(tag.replaceAll("_", " ")));

        return {
            sku: product.id,
            title: product.name,
            handle: product.identifier,
            body_html,
            product_type: product.type.name,
            vendor: product.brand.name,
            tags: tags,
            variants: [{
                price: prices[priceType],
                compare_at_price: compareAtPrices[priceType],
                inventory_policy: "deny",
                inventory_management: "shopify",
                inventory_quantity: product.status == "ACTIVE" || product.status == "LOCKED" ? 1 : 0,
                weight: 1,
                weight_unit: "kg"
            }],
            ...conditionalFields
        };
    }
}

module.exports = ShopifyService;
