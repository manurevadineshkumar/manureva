const axios = require("axios");
const ObjectUtils = require("../../utils/Object.Utils");

class ShopifyRestApiRequest {
    static API_VERSION = "2024-01";

    static #baseUrl(store) {
        return `https://${encodeURIComponent(store)}.myshopify.com/admin/api/${ShopifyRestApiRequest.API_VERSION}/`;
    }

    /**
     * Sends a request to the Shopify API.
     * @param {string} store - The name of the Shopify store.
     * @param {string} token - The access token for the Shopify store.
     * @param {string} endpoint - The API endpoint to send the request to.
     * @param {string} method - The HTTP method for the request.
     * @param {object} data - The data to send with the request (default: {}).
     * @returns {Promise<object>} - A promise that resolves to the response data from the API.
     */
    static async sendRequest(store, token, endpoint, method, data = {}) {
        if (process.env.NODE_ENV == "test") {
            console.info(`[ShopifyRestApiRequest] Skip ${method} ${endpoint} ${store} ${JSON.stringify(data)}`);
            return {product: {id: null}};
        }

        return axios.request({
            method,
            url: ShopifyRestApiRequest.#baseUrl(store) + endpoint,
            headers: {
                "X-Shopify-Access-Token": token,
                "Content-Type": "application/json"
            },
            ...(ObjectUtils.isEmpty(data) ? {} : {data})
        }).then(res => res.data);
    }

    static async fetchAccessScopes(url, token) {
        const baseUrl = `https://${url}/admin/oauth`;

        return axios.request({
            method: "GET",
            url: baseUrl + "/access_scopes.json",
            headers: {
                "X-Shopify-Access-Token": token,
                "Content-Type": "application/json"
            },
        }).then(res => res.data);
    }
    /**
     * Fetches shop details from Shopify API.
     * Called before adding a shop to the database.
     * @param {string} url - The Shopify store URL.
     * @param {string} token - The access token for authentication.
     * @returns {Promise<Object>} - A promise that resolves to the shop details.
     */
    static async fetchShopDetails(url, token) {
        const baseUrl = `https://${url}/admin/api/${ShopifyRestApiRequest.API_VERSION}`;

        return axios.request({
            method: "GET",
            url: baseUrl + "/shop.json",
            headers: {
                "X-Shopify-Access-Token": token,
                "Content-Type": "application/json"
            },
        }).then(res => res.data);
    }
}

module.exports = ShopifyRestApiRequest;
