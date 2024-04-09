const korvinShippingPolicy = require("../../const/korvin-shipping-policy.json");

class ShopifyShippingHelper {

    /**
     * Returns the GraphQL query for creating a delivery profile.
     *
     * @returns {string} The GraphQL query string.
     */
    static getCreateDeliveryProfileQuery() {
        const query = `mutation createDeliveryProfile($profile: DeliveryProfileInput!) {
                        deliveryProfileCreate(profile: $profile) {
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
     * Returns the variables needed to create a delivery profile.
     * @param {number} locationId - The ID of the location.
     * @returns {Object} The variables object.
     */
    static getCreateDeliveryProfileVariables(locationId) {
        const zonesToCreate = korvinShippingPolicy["zonesToCreate"];

        const variables = {
            "profile": {
                "name": "korvin-shipping",
                "locationGroupsToCreate": [
                    {
                        "locations": locationId,
                        "zonesToCreate": zonesToCreate
                    }
                ]
            }
        };

        return variables;
    }

    /**
     * Returns the GraphQL query for retrieving the location ID.
     * @returns {string} The GraphQL query.
     */
    static getLocationIdQuery() {
        const query = `{
            location {
              id
            }
          }`;

        return query;
    }

}
module.exports = ShopifyShippingHelper;
