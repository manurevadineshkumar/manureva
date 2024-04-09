const axios = require("axios");

const ExportingTask = require("./ExportingTask");

const Product = require("../../models/Product");

const ProductHelper = require("../../business-services/product/helper/Product.helper");
const Utils = require("../../services/Utils");
const ShopifyFieldService = require("../../business-services/shop/shopify/helper/ShopifyProductField.helper");

class ShopifyExporter extends ExportingTask {
    static MAX_QUEUE_SIZE = 1;

    static MIN_REQUEST_INTERVAL = 500;

    constructor(data) {
        super(data);

        this.baseUrl = "https://"
            + encodeURIComponent(this.params.store)
            + ".myshopify.com/admin/api/2023-01/";
        this.token = this.params.token;
        this.serviceName = "shopify:" + this.params.store;
        this.pendingRequests = {};
        this.finishCallback = null;

        this.insertCount = 0;
        this.updateCount = 0;
        this.deleteCount = 0;
    }

    request(endpoint, method, data = {}) {
        if (process.env.NODE_ENV == "test")
            return {product: {id: null}};

        return axios.request({
            method,
            url: this.baseUrl + endpoint,
            headers: {
                "X-Shopify-Access-Token": this.token,
                "Content-Type": "application/json"
            },
            data
        }).then(res => res.data);
    }

    serializeProduct(product, is_initial = true) {
        const body_html = ShopifyFieldService.createBodyHtml([
            ["Grade", product.grade],
            [
                "Colors",
                Object.values(product.colors)
                    .map(({name}) => name)
                    .join(", ")
            ],
            [
                "Materials",
                Object.values(product.materials)
                    .map(({name}) => name)
                    .join(", ")
            ]
        ]);

        const extras = {
            hasSerial: product.hasSerial,
            hasBox: product.hasBox,
            hasGuaranteeCard: product.hasGuaranteeCard,
            hasStorageBag: product.hasStorageBag,
        };

        const formatTag = tag => Utils.capitalizeAll(tag.replaceAll("_", " "));
        const getEntityNames = entities => Object.values(entities)
            .map(({name}) => name);

        const PRICES = {
            "wholesale": ProductHelper.getEffectiveWholesalePrice(product) / 100,
            "retail": ProductHelper.getEffectiveRetailPrice(product) / 100,
            "base": ProductHelper.getEffectivePurchasePrice(product) / 100,
        };
        const COMPARE_AT_PRICES = {
            "wholesale": product.wholesalePriceCents / 100,
            "retail": product.retailPriceCents / 100,
            "base": product.purchasePriceCents / 100,
        };

        return {
            sku: product.id,
            title: product.name,
            handle: product.identifier,
            body_html,
            product_type: Utils.capitalizeAll(
                (product.type.name || "").replaceAll("-", " ")
            ),
            vendor: product.brand.name,
            tags: [
                product.type.name, product.subtype?.name,
                ...getEntityNames(product.tags)
            ].filter(Boolean).map(formatTag),
            variants: [{
                price: Utils.round10(
                    PRICES[this.params.price_type] ?? PRICES["wholesale"]
                ),
                compare_at_price: Utils.round10(COMPARE_AT_PRICES[this.params.price_type] ?? PRICES["wholesale"]),
                inventory_policy: "deny",
                inventory_quantity: +(
                    product.status === "ACTIVE"
                    || product.status === "LOCKED"
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
                    id: product.externalIds[this.serviceName]?.id,
                }
            ),
        };
    }

    getProductUrl(product) {
        const id = product.externalIds[this.serviceName]?.id;

        return id ? `products/${encodeURIComponent(id)}.json` : null;
    }

    /** @override ExportingTask.isProductAvailable */
    isProductAvailable(product) {
        return product.status === "ACTIVE" || product.status === "LOCKED";
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await Product.countUpdatedForService(this.serviceName, {is_exportable: 1});
    }

    /**
     * @override ProcessingTask.countProducts
     * if is_exportable = 0 product can't be sold on S3cond
     */
    async listProducts(prev_id, count) {
        return await Product.listUpdatedForService(
            this.serviceName, {is_exportable: 1}, prev_id, count
        );
    }

    async runProductRequest(handler, product) {
        this.pendingRequests[product.id] = true;

        this.log(
            "ShopifyExporter: new request, current concurrency:",
            Object.keys(this.pendingRequests).length
        );

        try {
            await handler(product);

            this.setProgress({progress: this.status.progress + 1});
        } catch (err) {
            this.log("ShopifyExporter error:", err);

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

    /** @override ExportingTask.insertProductsBatch */
    async insertProductsBatch([product], _group_name) {
        this.log("ShopifyExporter: Trying to insert product, id:", product.id);

        void this.runProductRequest(async () => {
            const result = await this.request(
                "products.json",
                "POST",
                {product: this.serializeProduct(product)}
            );

            await product.setExternalServiceId(
                this.serviceName,
                result.product?.id
            );

            this.log("ShopifyExporter: product inserted, id:", product.id);
        }, product);

        this.insertCount++;
    }

    /** @override ExportingTask.updateProductsBatch */
    async updateProductsBatch([product], _group_name) {
        this.log("ShopifyExporter: Trying to update product, id:", product.id);

        void this.runProductRequest(async () => {
            await this.request(
                this.getProductUrl(product),
                "PUT",
                {product: this.serializeProduct(product, false)}
            );

            await this.updateProductTimestamp(product);

            this.log("ShopifyExporter: product updated, id:", product.id);
        }, product);

        this.updateCount++;
    }

    /** @override ExportingTask.deleteProductsBatch */
    async deleteProductsBatch([product], _group_name) {
        this.log("ShopifyExporter: Trying to delete product, id:", product.id);

        const url = this.getProductUrl(product);

        if (!url) {
            this.log("ShopifyExporter: product not found, skipping delete, id:", product.id);
            return;
        }

        void this.runProductRequest(async (product) => {
            await this.request(url, "DELETE");

            await product.setExternalServiceId(this.serviceName, null);

            this.log("ShopifyExporter: product deleted, id:", product.id);
        }, product);

        this.deleteCount++;
    }

    /** @override ExportingTask.getIdsMappings */
    getIdsMappings(_products, _result) {
        return {};
    }

    /** @override ExportingTask.finish */
    async finish() {
        this.log("ShopifyExporter: inserted", this.insertCount, "products");
        this.log("ShopifyExporter: updated", this.updateCount, "products");
        this.log("ShopifyExporter: deleted", this.deleteCount, "products");

        await new Promise(resolve => {
            if (!Object.keys(this.pendingRequests).length)
                return resolve();

            this.finishCallback = resolve;
        });
    }
}

module.exports = ShopifyExporter;
