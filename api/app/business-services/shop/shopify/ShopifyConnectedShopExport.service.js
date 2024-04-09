const {default: axios} = require("axios");

// eslint-disable-next-line no-unused-vars
const Product = require("../../../models/Product");
// eslint-disable-next-line no-unused-vars
const Shop = require("../../../models/shops/Shop");

const Utils = require("../../../services/Utils");
const ShopifyService = require("./Shopify.service");
const ShopifyBindingService = require("./ShopifyBinding.service");
const StringUtils = require("../../../services/StringUtils");
const ProductHelper = require("../../product/helper/Product.helper");

class ShopifyConnectedShopExportService {

    /**
     * Sends a request to the Shopify API.
     * @param {Shop} shop - The shop object.
     * @param {string} endpoint - The API endpoint.
     * @param {string} [method="GET"] - The HTTP method (default: "GET").
     * @param {Object} [data={}] - The request data (body or query parameters).
     * @param {boolean} [is_redirected=false] - Indicates if the request is redirected (default: false).
     * @returns {Promise<any>} - The response data.
     * @throws {Error} - If an error occurs during the request.
     */
    static async #sendRequest(shop, endpoint, method = "GET", data = {}, is_redirected = false) {
        if (process.env.NODE_ENV !== "production") {
            console.info(`[ShopifyConnectedShopExportService] Skip ${method} ${endpoint} ${JSON.stringify(data)}`);
            return {};
        }

        const has_body = ["POST", "PUT", "PATCH"].includes(method);

        const baseUrl = "https://" + shop.url + "/admin/api/2023-07";

        try {
            const response = await axios.request({
                method,
                url: is_redirected ? endpoint : baseUrl + endpoint,
                maxRedirects: 0,
                headers: {
                    "X-Shopify-Access-Token": shop.token,
                    ...(has_body ? {"Content-Type": "application/json"} : {})
                },
                ...(has_body ? {data} : {params: data})
            });

            return response.data;
        } catch (err) {
            if (
                !is_redirected
                && err.response?.status == 301
                && err.response?.headers?.location
            )
                return ShopifyConnectedShopExportService.#sendRequest(
                    shop,
                    err.response.headers.location,
                    method,
                    data,
                    true
                );

            throw err;
        }
    }

    /**
     * Tune the product data to fit custom attributes (bindings, name, descritpion...) before exporting to Shopify.
     * The changes are made directly on the product data object.
     * @param {Object} opt - The option for tuning the product data.
     * @param {Object} opt.data - The product data, created by ShopifyService.createShopifyProductDataFromKorvinProduct
     * @param {number} opt.exported_price - The exported price.
     * @param {string} opt.exported_name - The exported name.
     * @param {string} opt.exported_description - The exported description.
     * @param {string} opt.product_type - The product type.
     * @param {Set<string>} opt.tags - The tags.
     * @param {Object} opt.metafields - The metafields.
     */
    static #tuneProductData({
        data,
        exported_price,
        exported_name,
        exported_description,
        product_type,
        tags,
        metafields
    }) {
        data.title = exported_name ? exported_name : data.title;
        data.body_html = exported_description ? Utils.escapeHTML(exported_description) : data.body_html;
        data.body_html = `<p>${data.body_html.replace(/\n/g, "<br/>")}</p>`;
        data.product_type = product_type ? product_type : data.product_type;
        data.product_type = StringUtils.titlize(data.product_type);
        data.tags = [...data.tags, ...tags];
        data.variants[0].price = exported_price / 100;
        data.variants[0].compare_at_price = exported_price / 100;

        if (!data.metafields) {
            data.metafields = [];
        }

        data.metafields = [
            ...data.metafields
                .map(metafield => ({...metafield, namespace: "korvin"})),
            ...Object.entries(metafields).map(([name, items]) => ({
                namespace: "custom",
                key: name,
                type: "list.single_line_text_field",
                value: JSON.stringify([...items])
            }))
        ];
    }

    /**
     * Export a product to a Shopify shop.
     * @param {Object} options - The options for exporting the product.
     * @param {Product} options.product - The product to be exported.
     * @param {Shop} options.shop - The Shopify shop to export the product to.
     * @param {number} options.exported_price - The exported price of the product.
     * @param {number} [options.external_id] - The external ID of the product.
     * @param {string} [options.exported_name] - The exported name of the product.
     * @param {string} [options.exported_description] - The exported description of the product.
     * @returns {Promise} - A promise that resolves when the product is exported.
     */
    static async exportProduct({
        product,
        shop,
        exported_price,
        external_id,
        exported_name,
        exported_description
    }) {
        if (!ProductHelper.isForSale(product)) {
            return await ShopifyConnectedShopExportService.removeExportedProduct(shop, product.id, external_id);
        }

        if (!exported_price) {
            return;
        }

        const bindings = await ShopifyBindingService.getExportBindings({
            shop,
            korvin_entities: [
                ["genders", product.gender],
                ["types", product.type?.id || null],
                ["brands", product.brand?.id || null],
                // @ts-ignore
                ...(Object.keys(product.colors).map(id => ["colors", +id])),
                // @ts-ignore
                ...(Object.keys(product.materials).map(id => ["materials", +id]))
            ]
        });

        const {product_type, tags, metafields} = ShopifyBindingService.buildProductFields(bindings);

        const data = await ShopifyService.createShopifyProductDataFromKorvinProduct({
            product,
            external_id,
        });

        ShopifyConnectedShopExportService.#tuneProductData({
            data,
            exported_price,
            exported_name,
            exported_description,
            product_type,
            tags,
            metafields
        });

        const result = await ShopifyConnectedShopExportService.#sendRequest(
            shop,
            external_id
                ? `/products/${encodeURIComponent(external_id)}.json`
                : "/products.json",
            external_id ? "PUT" : "POST",
            {product: data}
        );

        if (!external_id && result.product?.id) {
            await shop.updateExportedProductData(
                product.id,
                {external_id: result.product.id}
            );
        }
    }

    /**
     * Removes an exported product from a Shopify shop.
     * @param {Shop} shop - The Shopify shop object.
     * @param {number} productId - The Korvin ID of the product to be removed.
     * @param {number} externalId - The Shopify ID of the product.
     * @returns {Promise<void>} - A promise that resolves when the product is removed.
     */
    static async removeExportedProduct(shop, productId, externalId) {
        if (!externalId) {
            return;
        }

        try {
            await ShopifyConnectedShopExportService.#sendRequest(
                shop,
                `/products/${encodeURIComponent(externalId)}.json`,
                "DELETE"
            );
        } catch (err) {
            console.error(`Failed to remove product ${productId} from Shopify shop ${shop.id}.`, err);
        }

        await shop.removeExportedProductsByIds([productId]);
    }
}

module.exports = ShopifyConnectedShopExportService;
