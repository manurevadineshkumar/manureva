const ShopifyGraphQLApiRequest = require("../../../data-access/shopify/ShopifyGraphQLApiRequest");
const ShopifyShippingHelper = require("../../helper/ShopifyShipping.helper");

class ShopifyShippingService {

    static async #getShopLocationId(url, shopToken) {

        const query = ShopifyShippingHelper.getLocationIdQuery();

        const variables = "";
        const result = await ShopifyGraphQLApiRequest.sendRequest(url, shopToken, query, variables);

        if (!result || result.errors) {
            throw new Error("[ShopifyShippingService]: No locationId found");
        }

        const locationId = result.data.location.id;

        return locationId;
    }

    static async createShopShippingPolicy(url, shopToken) {

        if (!url || !shopToken) {
            throw new Error("[ShopifyShippingService]: No url || shopToken");
        }

        const locationId = await this.#getShopLocationId(url, shopToken);
        const query = ShopifyShippingHelper.getCreateDeliveryProfileQuery();
        const variables = ShopifyShippingHelper.getCreateDeliveryProfileVariables(locationId);

        const deliveryProfileId = await ShopifyGraphQLApiRequest.sendRequest(url, shopToken, query, variables);

        if (!deliveryProfileId || deliveryProfileId.errors) {
            throw new Error("[ShopifyshippingService] No delivery Profil Created");
        }

        return deliveryProfileId;
    }
}

module.exports = ShopifyShippingService;
