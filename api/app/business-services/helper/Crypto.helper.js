const crypto = require("crypto");

class CryptoHelper {
    /**
     * Verifies the Shopify HMAC for a given request.
     * @param {Object} options - The options for verification.
     * @param {Object} options.req - The request object.
     * @param {string} options.secret - The secret key for HMAC generation.
     * @returns {boolean} - Returns true if the HMAC is valid, false otherwise.
     */
    static verifyShopifyHmac({req, secret}) {
        const hmac = req.headers["x-shopify-hmac-sha256"];
        const value = req.rawBody;

        const token = crypto.createHmac("sha256", secret).update(value).digest().toString("base64");

        return hmac === token;
    }
}

module.exports = CryptoHelper;
