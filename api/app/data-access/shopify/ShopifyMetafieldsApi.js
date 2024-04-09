// eslint-disable-next-line no-unused-vars
const Shop = require("../../models/shops/Shop");
const ShopifyGraphQLApiRequest = require("./ShopifyGraphQLApiRequest");

class ShopifyMetafieldsApi {
    /**
     * Creates a new Shopify metafield definition.
     * @param {Object} options - The options for creating the metafield definition.
     * @param {Shop} options.shop - The shop object containing the URL and token.
     * @param {string} options.name - The name of the metafield definition.
     * @param {string} options.description - The description of the metafield definition.
     * @param {string} options.type - The type of the metafield definition.
     * @throws {Error} If there are any user errors returned from the API.
     */
    static async create({shop, name, description, type}) {
        const query = `
        mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
              createdDefinition {
                id
                name
              }
              userErrors {
                field
                message
                code
              }
            }
          }
        `;

        const variables = {
            "definition": {
                "name": `Korvin: ${name}`,
                "namespace": "korvin",
                "key": name,
                "description": description,
                "type": type,
                "ownerType": "PRODUCT",
                "pin": true
            }
        };

        const response = await ShopifyGraphQLApiRequest.sendRequest(shop.url, shop.token, query, variables);

        if (response.data.metafieldDefinitionCreate.userErrors.length > 0) {
            console.info(`[ShopifyMetafieldsApi]: Failed to create metafield definition for ${name}`);
            console.info("[ShopifyMetafieldsApi]:", response.data.metafieldDefinitionCreate.userErrors);
        }
    }

    /**
     * Retrieves a list of metafield definitions from Shopify.
     * @param {Object} options - The options for the API request.
     * @param {Shop} options.shop - The shop object containing the URL and token.
     * @returns {Promise<Array<string>>} - A promise that resolves to an array of metafield IDs.
     */
    static async list({shop}) {
        const query = `
        query {
          metafieldDefinitions(first: 250, ownerType: PRODUCT, query: "namespace:'korvin'") {
            edges {
              node {
                id
              }
            }
          }
        }
        `;
        const variables = {};

        const response = await ShopifyGraphQLApiRequest.sendRequest(shop.url, shop.token, query, variables);

        return response.data.metafieldDefinitions.edges.map(edge => edge.node.id);
    }

    /**
     * Deletes a metafield definition from Shopify.
     * @param {Shop} shop - The Shopify shop object.
     * @param {string} id - The ID of the metafield definition to delete.
     * @returns {Promise<void>} - A promise that resolves when the deletion is complete.
     */
    static async delete(shop, id) {
        const query = `
        mutation DeleteMetafieldDefinition($id: ID!, $deleteAllAssociatedMetafields: Boolean!) {
          metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields) {
            deletedDefinitionId
            userErrors {
              field
              message
              code
            }
          }
        }
        `;
        const variables = {
            "id": id,
            "deleteAllAssociatedMetafields": true
        };

        const response = await ShopifyGraphQLApiRequest.sendRequest(shop.url, shop.token, query, variables);

        if (response.errors || response.data.metafieldDefinitionDelete.userErrors.length > 0) {
            console.info(`[ShopifyMetafieldsApi#delete]: Failed to delete metafield definition ${id}`);
            console.info(
                "[ShopifyMetafieldsApi#delete]: userErrors:",
                response.data?.metafieldDefinitionDelete?.userErrors
            );
            console.info("[ShopifyMetafieldsApi#delete]: errors", response.errors);
        }
    }
}

module.exports = ShopifyMetafieldsApi;
