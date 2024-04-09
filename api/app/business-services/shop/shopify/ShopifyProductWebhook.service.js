// eslint-disable-next-line no-unused-vars
const Shop = require("../../../models/shops/Shop");
const Brand = require("../../../models/Brand");
const Type = require("../../../models/Type");

const ShopifyProductWebhookHelper = require("./helper/ShopifyProductWebhook.helper");

const ShopifyBindingService = require("./ShopifyBinding.service");
const ShopifyService = require("./Shopify.service");
const ProductService = require("../../product/Product.service");
const ShopImportedProductService = require("../ShopImportedProducts.service");
const PriceManager = require("../../../services/PriceManager");

const ShopifyGraphQLApiRequest = require("../../../data-access/shopify/ShopifyGraphQLApiRequest");
const ShopifyWebhooksApi = require("../../../data-access/shopify/ShopifyWebhooksApi");

const ObjectUtils = require("../../../utils/Object.Utils");

class ShopifyProductWebhookService {
    /**
     * Creates webhooks for product creation, update, and deletion.
     * @param {Object} options - The options for creating webhooks.
     * @param {Shop} options.shop - The shop name.
     * @returns {Promise<void>} - A promise that resolves when the webhooks are created.
     * @throws {HttpError} - Throws an error if the webhooks cannot be created.
     */
    static async createWebhooks({shop}) {
        await ShopifyWebhooksApi.createProductCreateWebhook(shop);
        await ShopifyWebhooksApi.createProductUpdateWebhook(shop);
        await ShopifyWebhooksApi.createProductDeleteWebhook(shop);
    }

    /**
     * Imports a Shopify product for a specific shop.
     * @param {Object} options - The options for importing the Shopify product.
     * @param {Shop} options.shop - The shop identifier.
     * @param {string} options.id - The Shopify GraphQL product identifier (gid://shopify/Product/0123456789).
     * @returns {Promise<void>} - A promise that resolves when the import is complete.
     */
    static async importShopifyProductFromId({shop, id}) {
        const shopifyProduct = await ShopifyGraphQLApiRequest.fetchProductById({shop, id});

        if (shopifyProduct.status !== "ACTIVE") {
            return;
        }

        const binding_categories = await ShopifyBindingService.matchShopifyProductToBindings({shop, shopifyProduct});

        const {rawData, brandId, typeId} = await ShopifyService.createProductData({
            shop,
            shopifyProduct,
            binding_categories
        });

        const brand = new Brand({id: brandId});
        const type = new Type({id: typeId});

        const product = await ProductService.create(rawData, brand, type);

        const prices = await PriceManager.computePrices({
            product,
            shop,
            createdOnShopAt: shopifyProduct.createdAt
        });

        await product.update({
            purchase_price_cents: prices.purchase_price_cents,
            purchase_price_cents_discounted: prices.purchase_price_cents_discounted,
            retail_price_cents: prices.retail_price_cents,
            retail_price_cents_discounted: prices.retail_price_cents_discounted,
            wholesale_price_cents: prices.wholesale_price_cents,
            wholesale_price_cents_discounted: prices.wholesale_price_cents_discounted,
        });

        const externalId = id.split("/").pop();
        const isAdded = await shop.addImportedProductById(product.id, externalId, shopifyProduct.createdAt);
        if (isAdded) {
            await product.storeImages(shopifyProduct.images);
        }
    }

    /**
     * Update a product for a specific shop when the product.
     * @param {Object} options - The options for importing the Shopify product.
     * @param {Shop} options.shop - The shop identifier.
     * @param {string} options.id - The Shopify GraphQL product identifier (gid://shopify/Product/0123456789).
     * @returns {Promise<void>} - A promise that resolves when the import is complete.
     */
    static async updateShopifyProductFromId({shop, id}) {
        const externalId = id.split("/").pop();

        const shopifyProduct = await ShopifyGraphQLApiRequest.fetchProductById({shop, id});
        const korvinProduct = await ShopImportedProductService.getProductByExternalId({externalId});

        const {toUpdate, brand, type} = await ShopifyProductWebhookHelper.compareShopifyAndKorvinProduct({
            shopifyProduct,
            korvinProduct,
            shop
        });

        Object.assign(korvinProduct, toUpdate);

        if (toUpdate.boughtPrice || toUpdate.boughtPriceDiscounted) {
            const prices = await PriceManager.computePrices({
                product: korvinProduct,
                shop,
                createdOnShopAt: shopifyProduct.createdAt
            });

            Object.assign(
                toUpdate,
                {
                    purchase_price_cents: prices.purchase_price_cents,
                    purchase_price_cents_discounted: prices.purchase_price_cents_discounted,
                    wholesale_price_cents: prices.wholesale_price_cents,
                    wholesale_price_cents_discounted: prices.wholesale_price_cents_discounted,
                    retail_price_cents: prices.retail_price_cents,
                    retail_price_cents_discounted: prices.retail_price_cents_discounted
                }
            );
        }

        const dataToUpdate = ObjectUtils.renameKeys(
            toUpdate,
            {boughtPrice: "bought_price", boughtPriceDiscounted: "bought_price_discounted"}
        );

        await korvinProduct.update(dataToUpdate, brand, type);
    }

    static async deleteShopifyProductFromId({shop, id}) {
        const externalId = id;

        const korvinProduct = await ShopImportedProductService.getProductByExternalId({externalId});

        await korvinProduct.update({status: "DISABLED"});

        await ShopImportedProductService.deleteImportedProductByExternalId({shop, externalId});
    }
}

module.exports = ShopifyProductWebhookService;
