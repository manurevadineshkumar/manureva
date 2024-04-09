const ShopifyGraphQLApiRequest = require("../../../data-access/shopify/ShopifyGraphQLApiRequest");
const ShopifyProductHelper = require("../../helper/ShopifyProduct.helper");

class ShopifyProductService {

    /**
     * Retrieves the Korvin delivery profile ID from Shopify.
     * @param {string} url - The Shopify API URL.
     * @param {string} shopToken - The Shopify shop token.
     * @returns {Promise<string>} The delivery profile ID.
     * @throws {Error} If no deliveryProfileId is found.
     */
    static async #getKorvinDeliveryProfileId(url, shopToken) {

        const query = ShopifyProductHelper.getDeliveryProfileQuery();

        const variables = "";
        const result = await ShopifyGraphQLApiRequest.sendRequest(url, shopToken, query, variables);

        if (!result || result.errors) {
            throw new Error("[ShopifyShippingService]: No deliveryProfileId found");
        }

        let deliveryProfileId;

        for (const deliveryProfile of result.data.deliveryProfiles.edges) {
            if (deliveryProfile.node.name === "korvin-shipping") {
                deliveryProfileId = deliveryProfile.node.id;
            }
        }

        if (!deliveryProfileId) {
            throw new Error("[ShopifyProductService]: no deliveryProfileId");
        }

        return deliveryProfileId;
    }

    /**
     * Retrieves the product variants for the given product external IDs from Shopify.
     * @param {string} url - The URL of the Shopify store.
     * @param {string} shopToken - The access token for the Shopify store.
     * @param {string[]} productExternalIds - The external IDs of the products.
     * @returns {Promise<string[]>} - A promise that resolves to an array of product variant IDs.
     * @throws {Error} - If no product variants are found.
     */
    static async #getProductVariants(url, shopToken, productExternalIds) {

        const query = ShopifyProductHelper.getProductVariantsQuery(productExternalIds);

        const variables = "";
        const result = await ShopifyGraphQLApiRequest.sendRequest(url, shopToken, query, variables);

        if (!result || result.errors) {
            throw new Error("[ShopifyShippingService]: No deliveryProfileId found");
        }

        const productVariantsIds = [];

        for (const productVariantId of result.data.productVariants.edges) {
            productVariantsIds.push(productVariantId?.node.id);
        }

        if (productVariantsIds.length === 0) {
            throw new Error("[ShopifyProductService]: no product variants");
        }

        return productVariantsIds;
    }

    /**
     * Adds products to a delivery profile on Shopify.
     *
     * @param {string} url - The URL of the Shopify store.
     * @param {string} shopToken - The token for accessing the Shopify store.
     * @param {string[]} productExternalIds - The external IDs of the products to be added.
     * @returns {Promise<any>} - A promise that resolves to the updated delivery profile.
     * @throws {Error} - If the URL or shop token is missing, or if there is an error updating the delivery profile.
     */
    static async addProductsToDeliveryProfile(url, shopToken, productExternalIds) {

        if (!url || !shopToken) {
            throw new Error("[ShopifyProductService]: No url || shopToken");
        }

        const deliveryProfileId = await this.#getKorvinDeliveryProfileId(url, shopToken);
        const productVariantsId = await this.#getProductVariants(url, shopToken, productExternalIds);

        if (!deliveryProfileId || !productVariantsId) {
            throw new Error("[ShopifyProductService]: No delivery profile Id || product variants Id");
        }
        const query = ShopifyProductHelper.getDeliveryProfileUpdateProductsQuery();
        const variables = ShopifyProductHelper
            .getDeliveryProfileUpdateProductsVariables(deliveryProfileId, productVariantsId);

        const updateDeliveryProfile = await ShopifyGraphQLApiRequest.sendRequest(url, shopToken, query, variables);

        if (!updateDeliveryProfile || updateDeliveryProfile.errors) {
            throw new Error("[ShopifyProductService] No delivery Profile Updated");
        }

        return updateDeliveryProfile;
    }
}

module.exports = ShopifyProductService;
