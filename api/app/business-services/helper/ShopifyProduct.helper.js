class ShopifyProductHelper {

    /**
     * Generates a GraphQL query to retrieve product variants from Shopify based on their external IDs.
     *
     * @param {string[]} productExternalIds - An array of external IDs of the products.
     * @returns {string} - The generated GraphQL query.
     */
    static getProductVariantsQuery(productExternalIds) {
        const productIds = productExternalIds.join(",");
        const query = `{
            productVariants(first: 250, query: "product_ids:${productIds}") {
                edges {
                    node {
                        id
                        title
                    }
                }
            }
          }`;

        return query;
    }

    /**
     * Returns the GraphQL query for retrieving delivery profiles from Shopify.
     * @returns {string} The GraphQL query string.
     */
    static getDeliveryProfileQuery() {
        const query = `{
            deliveryProfiles(first: 100) {
                edges {
                    node {
                        id,
                        name
                    }
                }
            }
        }`;

        return query;
    }

    /**
     * Returns the GraphQL query for updating delivery profiles on Shopify.
     * @returns {string} The GraphQL query string.
     */
    static getDeliveryProfileUpdateProductsQuery() {
        const query = `
            mutation deliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
                deliveryProfileUpdate(id: $id, profile: $profile) {
                    profile {
                        id
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`;

        return query;
    }

    /**
     * Returns the variables object for updating a delivery profile with product variants on Shopify.
     * @param {number} deliveryProfileId - The ID of the delivery profile.
     * @param {string[]} productVariantsId - An array of product variant IDs to associate with the delivery profile.
     * @returns {Object} The variables object.
     */
    static getDeliveryProfileUpdateProductsVariables(deliveryProfileId, productVariantsId) {
        const variables = {
            "id": deliveryProfileId,
            "leaveLegacyModeProfiles": true,
            "profile": {
                "name": "korvin-shipping",
                "variantsToAssociate": productVariantsId
            }
        };

        return variables;
    }
}

module.exports = ShopifyProductHelper;
