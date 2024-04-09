const axios = require("axios");

// eslint-disable-next-line no-unused-vars
const Shop = require("../../models/shops/Shop");

class ShopifyGraphQLApiRequest{
    static #API_VERSION = "2024-01";

    static #baseUrl(url) {
        return `https://${url}/admin/api/${ShopifyGraphQLApiRequest.#API_VERSION}/graphql.json`;
    }

    /**
     * Parses a product object returned from the Shopify GraphQL API.
     * @param {Object} product - The product object to parse.
     * @returns {{
     *   id: string,
     *   createdAt: Date,
     *   updatedAt: Date,
     *   title: string,
     *   status: string,
     *   descriptionHtml: string,
     *   productType: string,
     *   vendor: string,
     *   tags: Array<string>,
     *   totalInventory: number,
     *   price: number,
     *   compareAtPrice: number,
     *   images: Array<string>,
     *   metafields: Array<{key: string, value: string, type: string}>
     * }} - The parsed product object.
     */
    static #parseProduct(product) {
        return {
            id: product.id,
            createdAt: new Date(product.createdAt),
            updatedAt: new Date(product.updatedAt),
            title: product.title,
            status: product.status,
            descriptionHtml: product.descriptionHtml.replace(/(<([^>]+)>)/ig, "").replace(/\n{2,}/g, "\n"),
            productType: product.productType,
            vendor: product.vendor,
            tags: product.tags,
            totalInventory: product.totalInventory,
            price: product.variants.edges[0].node.price,
            compareAtPrice: product.variants.edges[0].node.compareAtPrice,
            images: product.images.edges.map(edge => edge.node.url),
            metafields: product.metafields.edges.map(edge => ({
                key: edge.node.key,
                value: edge.node.value,
                type: edge.node.type
            }))
        };
    }

    /**
     * Sends a request to the Shopify GraphQL API.
     * @param {string} url - The URL of the Shopify GraphQL API.
     * @param {string} token - The access token for authentication.
     * @param {string} query - The GraphQL query string.
     * @param {object} variables - The variables to be passed with the query.
     * @returns {Promise<object>} - A promise that resolves to the response data from the API.
     * @throws {Error} - If an error occurs during the request.
     */
    static async sendRequest(url, token, query, variables) {
        if (process.env.NODE_ENV == "test") {
            console.info(`[ShopifyGraphQLApiRequest]: Skipping request to Shopify API in test environment.`);
            return {product: {id: null}};
        }

        return await axios.request({
            url: ShopifyGraphQLApiRequest.#baseUrl(url),
            method: "POST",
            headers: {
                "X-Shopify-Access-Token": token,
                "Content-Type": "application/json"
            },
            data: {
                query: query,
                variables: variables
            }
        }).then((res) => {
            return res.data;
        }).catch((err) => {
            throw new Error(`[ShopifyGraphQLApiRequest]: ${err}`);
        });
    }

    /**
     * Fetches a product by its ID from the Shopify GraphQL API.
     * @param {Object} options - The options for fetching the product.
     * @param {Shop} options.shop - The shop details.
     * @param {string} options.id - The GraphQL ID of the product to fetch.
     */
    static async fetchProductById({shop, id}) {
        const query = `
        {
            product(id:"${id}") {
                id
                createdAt
                updatedAt
                status
                title
                descriptionHtml
                productType
                vendor
                tags
                totalInventory
                images(first:20) { edges { node { url } } }
                metafields(first: 20) { edges { node { key value type } } }
                variants(first: 1) { edges { node { price compareAtPrice } } }
            }
        }
        `;

        const variables = {};

        const response = await ShopifyGraphQLApiRequest.sendRequest(
            shop.url,
            shop.token,
            query,
            variables
        );

        const product = response.data.product;

        return ShopifyGraphQLApiRequest.#parseProduct(product);
    }
}

module.exports = ShopifyGraphQLApiRequest;
