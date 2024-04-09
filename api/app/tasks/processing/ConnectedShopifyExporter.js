const axios = require("axios");

const ExportingTask = require("./ExportingTask");

const ProductHelper = require("../../business-services/product/helper/Product.helper");
const Utils = require("../../services/Utils");
const ShopExportedProductsService = require(
    "../../business-services/shop/ShopExportedProducts.service");
const ShopifyFieldService = require("../../business-services/shop/shopify/helper/ShopifyProductField.helper");
const Product = require("../../models/Product");

class ConnectedShopifyExporter extends ExportingTask {
    static MAX_QUEUE_SIZE = 1;

    static MIN_REQUEST_INTERVAL = 500;

    constructor(data) {
        super(data);

        this.baseUrl = "https://"
            + encodeURIComponent(this.params.store)
            + ".myshopify.com/admin/api/2023-01/";
        this.token = this.params.token;
        this.pendingRequests = {};
        this.finishCallback = null;
        this.shopId = this.params.id;
    }

    request(endpoint, method, data = {}) {
        if (process.env.NODE_ENV == "test")
            return {product: {id: null}};

        return axios
            .request({
                method,
                url: this.baseUrl + endpoint,
                headers: {
                    "X-Shopify-Access-Token": this.token,
                    "Content-Type": "application/json"
                },
                data
            })
            .then(res => {
                return res.data;
            });
    }

    serializeProduct(product, is_initial = true) {

        const formatTag = function(tag) {
            return Utils.capitalizeAll(tag.replaceAll("_", " "));
        };

        const getEntityNames = function(entities) {
            return Object.values(entities).map(({name}) => name);
        };

        const PRICES = {
            "wholesale": ProductHelper.getEffectiveWholesalePrice(product) / 100,
            "retail": ProductHelper.getEffectiveRetailPrice(product) / 100,
            "base": ProductHelper.getEffectivePurchasePrice(product) / 100,
        };

        let price;
        if (product.exportedPriceCents) {
            price = product.exportedPriceCents / 100;
        } else {
            price = Utils.round10(PRICES[this.params.price_type] ?? PRICES["wholesale"]);
            price = price * Product.WHOLESALE_TO_DROPSHIPPING_RATE;
        }

        const extras = {
            hasSerial: product.hasSerial,
            hasBox: product.hasBox,
            hasGuaranteeCard: product.hasGuaranteeCard,
            hasStorageBag: product.hasStorageBag,
        };

        return {
            sku: product.id,
            title: product.name,
            handle: product.identifier,
            product_type: Utils.capitalizeAll(
                (product.type.name || "").replaceAll("-", " ")
            ),
            vendor: product.brand.name,
            tags: [
                product.type.name, product.subtype?.name,
                ...getEntityNames(product.tags)
            ].filter(Boolean).map(formatTag),
            variants: [{
                price: price,
                inventory_policy: "deny",
                inventory_quantity: +(
                    product.status == "ACTIVE"
                    || product.status == "LOCKED"
                ),
                weight: 1,
                weight_unit: "kg"
            }],
            ...(is_initial
                ? {
                    images: product.imageUrls.map(src => ({src})),
                    metafields: [
                        {
                            namespace: "custom",
                            key: "colors",
                            type: "list.single_line_text_field",
                            value: JSON.stringify(
                                getEntityNames(product.colors)
                            )
                        },
                        {
                            namespace: "custom",
                            key: "materials",
                            type: "list.single_line_text_field",
                            value: JSON.stringify(
                                getEntityNames(product.materials)
                            )
                        },
                        {
                            namespace: "custom",
                            key: "grade",
                            type: "single_line_text_field",
                            value: product.grade
                        },
                        ShopifyFieldService.createMetafieldSize(product.size),
                        ShopifyFieldService.createMetafieldExtras(extras)
                    ].filter(Boolean)
                }
                : {
                    id: product.external_id,
                }
            ),
        };
    }

    getProductUrl(product) {
        const id = product.external_id;
        return id ? `products/${encodeURIComponent(id)}.json` : null;
    }

    isProductAvailable(product) {

        if (product.archived) {
            return false;
        }
        return product.status == "ACTIVE"
        || product.status == "LOCKED";
    }

    /**
     * Check if a product has already been uploaded to the current service
     * @param {ShopExportedProducts}
     * @returns {boolean}
    */
    async productExists(product) {
        return !!product.external_id;
    }

    async countProducts() {
        return await ShopExportedProductsService.countUpdatedForShop(this.shopId, {});
    }

    async listProducts(prev_id, count) {

        const products = await ShopExportedProductsService
            .listAvailableExportedProductsByShop(this.shopId, prev_id, count);
        return products;
    }

    async runProductRequest(handler, product) {
        this.pendingRequests[product.id] = true;

        this.log(
            "ConnectedShopifyExporter: new request, current concurrency:",
            Object.keys(this.pendingRequests).length
        );

        try {
            await handler(product);

            this.setProgress({progress: this.status.progress + 1});
        } catch (err) {
            this.log("ConnectedShopifyExporter error:", err);

            if (err.response?.data)
                this.log("Error data:", err.response.data);

            this.setProgress({
                progress: this.status.progress + 1,
                failed: this.status.failed + 1
            });
        }

        delete this.pendingRequests[product.id];

        if (!Object.keys(this.pendingRequests).length && this.finishCallback)
            this.finishCallback();
    }

    async insertProductsBatch(_product, _group_name) {
        return;
    }

    async updateProductsBatch([product], _group_name) {
        this.runProductRequest(async () => {
            await this.request(
                this.getProductUrl(product),
                "PUT",
                {product: this.serializeProduct(product, false)}
            );

            await this.updateProductTimestamp(product);
        }, product);
    }

    async deleteProductsBatch([product], _group_name) {
        const url = this.getProductUrl(product);

        if (!url)
            return;

        void this.runProductRequest(async () => {
            await this.request(url, "DELETE");
            if (product.status === "ACTIVE" && product.archived) {
                await ShopExportedProductsService.removeProductById(this.shopId, product.id);
            } else {
                await ShopExportedProductsService.setExternalId(product.id, product.shop_id, null);
            }
        }, product);
    }

    async updateProductTimestamp(product) {

        await ShopExportedProductsService
            .setExternalId(
                product.id, product.shop_id, product.external_id || null);
    }

    getIdsMappings(_products, _result) {
        return {};
    }

    async finish() {
        await new Promise(resolve => {
            if (!Object.keys(this.pendingRequests).length)
                return resolve();

            this.finishCallback = resolve;
        });
    }
}

module.exports = ConnectedShopifyExporter;
