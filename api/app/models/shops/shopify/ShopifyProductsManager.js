const axios = require("axios");
const readline = require("readline");

const Product = require("../../Product");
const ProductsManager = require("../../ProductsManager");
const Brand = require("../../Brand");
const Type = require("../../Type");
// eslint-disable-next-line no-unused-vars
const Shop = require("../Shop");

const FilesystemManager = require("../../../services/FilesystemManager");
const ListingIterator = require("../../../services/ListingIterator");
const Utils = require("../../../services/Utils");
const PriceManager = require("../../../services/PriceManager");
const ShopifyProductService = require("../../../business-services/shop/shopify/ShopifyProduct.service");
const DateUtils = require("../../../utils/Date.Utils");
const ShopifyConnectedShopExportService = require(
    "../../../business-services/shop/shopify/ShopifyConnectedShopExport.service"
);

const QUERIES = {
    LIST_PRODUCTS_ATTRIBUTES_BULK: `mutation { `
        + `bulkOperationRunQuery( query: """ { products { edges { node { `
        + `id productType vendor tags `
        + `metafields { edges { node { key value type } } }`
        + ` } } } } """ ) { `
        + `bulkOperation { id status } userErrors { field message } } }`,
    LIST_PRODUCTS_BULK: `mutation { `
        + `bulkOperationRunQuery( query: """ { `
        + `products(query: $QUERY) { edges { node { `
        + `id createdAt title descriptionHtml productType vendor tags totalInventory `
        + `images { edges { node { url } } }`
        + `metafields { edges { node { key value type } } } `
        + `variants { edges { node { price } } } `
        + `} } } } """ ) { `
        + `bulkOperation { id status } userErrors { field message } } }`,
    GET_BULK_OPERATION_STATUS: `query { currentBulkOperation { `
        + `id status rootObjectCount url `
        + `} }`
};

class ShopifyProductsManager extends ProductsManager {
    constructor(shop, channel) {
        super(channel);

        /** @type {Shop} */
        this.shop = shop;
        this.baseUrl = shop.baseUrl;
    }

    async request(endpoint, method = "GET", data = {}, is_redirected = false) {
        const has_body = ["POST", "PUT", "PATCH"].includes(method);

        try {
            const response = await axios.request({
                method,
                url: is_redirected ? endpoint : this.baseUrl + endpoint,
                maxRedirects: 0,
                headers: {
                    "X-Shopify-Access-Token": this.shop.token,
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
                return this.request(
                    err.response.headers.location,
                    method,
                    data,
                    true
                );

            throw err;
        }
    }

    static async #processLines(lines, callback) {
        for await (const line of lines) {
            try {
                await callback(line);
            } catch (err) {
                console.error(err);
            }
        }
    }

    async runBulkOperation(query, callback, has_postprocessing = false) {
        const {
            data: {bulkOperationRunQuery: {bulkOperation: operation}}
        } = await this.request(
            "/graphql.json",
            "POST",
            {query: query, variables: {}}
        );

        if (!operation)
            return null;

        const {id} = operation;
        const {count: total} = await this.request("/products/count.json");
        const INTERVAL = 1e3;
        let prev_time = Date.now();

        const wait = () => new Promise(resolve =>
            setTimeout(resolve, prev_time + INTERVAL - Date.now())
        ).then(() => {
            prev_time = Date.now();
        });

        this.setProgress({
            total: has_postprocessing ? total * 2 : total
        });

        for (
            let status = "CREATED";
            status == "CREATED" || status == "RUNNING";
            await wait()
        ) {
            const {
                data: {currentBulkOperation: operation}
            } = await this.request(
                "/graphql.json",
                "POST",
                {query: QUERIES.GET_BULK_OPERATION_STATUS, variables: {}}
            );

            if (operation?.id != id)
                return null;

            this.setProgress({progress: +operation.rootObjectCount});

            if (operation.status == "COMPLETED") {
                if (!operation.url)
                    return [];

                const filepath = FilesystemManager.getRandomTmpFilename();

                await FilesystemManager.downloadFile(operation.url, filepath);

                this.setProgress({
                    total: has_postprocessing
                        ? operation.rootObjectCount * 2
                        : +operation.rootObjectCount,
                    progress: +operation.rootObjectCount
                });

                const stream = FilesystemManager.createReadStream(filepath);
                const lines = readline.createInterface({input: stream});

                try {
                    await ShopifyProductsManager.#processLines(lines, callback);
                } finally {
                    stream.destroy();

                    await FilesystemManager.unlink(filepath);
                }

                return;
            }

            status = operation.status;
        }

        return null;
    }

    addBinding(binding, ...values) {
        const {bindings} = this.bindingState;

        if (!bindings[binding])
            bindings[binding] = new Set();

        values.forEach(value => bindings[binding].add(value));
    }

    async #processBindingLine(line) {
        const data = JSON.parse(line);

        if (data.productType)
            this.addBinding("type", data.productType);

        if (data.vendor)
            this.addBinding("vendor", data.vendor);

        if (data.tags?.length)
            this.addBinding("tag", ...data.tags);

        if (data.__parentId && data.type && data.key && data.value) {
            const values = data.type.startsWith("list.")
                ? JSON.parse(data.value)
                : [data.value];

            this.addBinding("metafield:" + data.key, ...values);
        }
    }

    async getBindings() {
        this.bindingState = {
            bindings: {}
        };

        await this.runBulkOperation(
            QUERIES.LIST_PRODUCTS_ATTRIBUTES_BULK,
            this.#processBindingLine.bind(this)
        );

        return this.bindingState.bindings;
    }

    /**
     * Flushes the imported product data.
     * @param {Object} data - The imported product data.
     * @returns {Promise<Product>} - The updated or created product.
     */
    async #flushImportedProduct(data) {
        const product = await Product.getByShopExternalId(
            this.shop.id, data.id
        );

        const PRIORITIES = {
            type: 3,
            vendor: 2,
            tag: 0,
            default: 1
        };

        const getHighestPriorityId = function(bindings) {
            const sortedBindings = bindings.sort((a, b) => b.priority - a.priority);
            return sortedBindings.length > 0 ? sortedBindings[0].id : null;
        };

        const binding_categories = {
            genders: [],
            types: [],
            brands: [],
            colors: [],
            materials: []
        };

        await Promise.all(Object.entries(data.bindings)
            .map(async ([name, values]) => {
                await Promise.all(values.map(async value => {
                    const bindings = await this.shop.getImportBinding(name, value);

                    bindings.forEach(({category, korvin_id}) => {
                        binding_categories[category].push({
                            id: korvin_id,
                            priority: PRIORITIES[name] || PRIORITIES.default
                        });
                    });
                }));
            })
        );

        const brand_id = getHighestPriorityId(binding_categories.brands);
        const type_id = getHighestPriorityId(binding_categories.types);
        const raw_data = {
            owner_id: this.shop.ownerId,
            gender: getHighestPriorityId(binding_categories.genders),
            name: data.title,
            description: data.description,
            status: data.status,
            is_exportable: 0,
            bought_currency: "EUR",
            bought_price: data.bought_price,
            purchase_price_cents: null,
            retail_price_cents: null,
            wholesale_price_cents: null,
            grade: "B",
            color_ids: binding_categories.colors.map(({id}) => id),
            material_ids: binding_categories.materials.map(({id}) => id)
        };

        if (!brand_id || !type_id || !raw_data.bought_price)
            throw new Error("products must have type, brand and price");

        const brand = new Brand({id: brand_id});
        const type = new Type({id: type_id});

        let returned_product;
        if (product) {
            await product.update(raw_data, brand, type);
            returned_product = product;
        } else {
            returned_product = await Product.create(raw_data, brand, type);
        }

        const prices = await PriceManager.computePrices({
            product: returned_product,
            shop: this.shop,
            createdOnShopAt: data.createdAt
        });

        returned_product.update({
            purchase_price_cents: prices.purchase_price_cents,
            purchase_price_cents_discounted: prices.purchase_price_cents_discounted,
            retail_price_cents: prices.retail_price_cents,
            retail_price_cents_discounted: prices.retail_price_cents_discounted,
            wholesale_price_cents: prices.wholesale_price_cents,
            wholesale_price_cents_discounted: prices.wholesale_price_cents_discounted,
        });

        return returned_product;
    }

    async #flushImportedProductsBatch() {
        const products_batch = Object.values(this.importState.products);

        for (let data of products_batch) {
            try {
                const product = await this.#flushImportedProduct(data);

                if (await this.shop.addImportedProductById(product.id, data.id, data.createdAt))
                    await product.storeImages(data.image_urls);
            } catch (err) {
                console.error("Product error:", err);
            }

            this.setProgress({progress: this.status.progress + 1});
        }
    }

    async #processImportLine(line) {
        const ID_PREFIX = "gid://shopify/Product/";
        const BATCH_SIZE = 256;

        const data = JSON.parse(line);

        if (data.id?.startsWith(ID_PREFIX)) {
            if (!data.totalInventory)
                return;

            const id = data.id.substring(ID_PREFIX.length);

            this.importState.products[id] = {
                id,
                createdAt: new Date(data.createdAt),
                title: data.title,
                description: data.descriptionHtml
                    .replace(/(<([^>]+)>)/ig, "")
                    .replace(/\n{2,}/g, "\n"),
                bindings: {
                    type: [data.productType],
                    vendor: [data.vendor],
                    tag: data.tags
                },
                status: "ACTIVE",
                image_urls: [],
                bought_price: null
            };

            if (++this.importState.products_count >= BATCH_SIZE) {
                await this.#flushImportedProductsBatch();
                this.importState = {
                    products: {},
                    products_count: 0
                };
            }
        }

        const parent_product = this.importState.products[
            data.__parentId?.substring(ID_PREFIX.length)
        ] || null;

        if (!parent_product)
            return;

        if (data.price)
            parent_product.bought_price = Math.trunc(data.price) || null;

        if (data.type && data.key && data.value) {
            const metafield_key = "metafield:" + data.key;

            if (!parent_product.bindings[metafield_key])
                parent_product.bindings[metafield_key] = [];

            parent_product.bindings[metafield_key].push(...(
                data.type.startsWith("list.")
                    ? JSON.parse(data.value)
                    : [data.value]
            ));
        }

        if (data.url)
            parent_product.image_urls.push(data.url);
    }

    async import() {
        this.importState = {
            products: {},
            products_count: 0,
        };

        await this.runBulkOperation(
            QUERIES.LIST_PRODUCTS_BULK.replace(
                "$QUERY",
                JSON.stringify(
                    this.shop.lastImport
                        ? `updated_at:>${this.shop.lastImport.toISOString()}`
                        : ""
                )
            ),
            this.#processImportLine.bind(this),
            true
        );

        await this.#flushImportedProductsBatch();
    }

    /**
     * Adds products to the shipping policy.
     * @returns {Promise<void>} A promise that resolves when the products are added to the shipping policy.
     */
    async #addProductsToShippingPolicy() {
        const iterator = new ListingIterator(async (prev_id, batch_size) => {
            return await this.shop.listExportedProducts(
                prev_id, batch_size
            );
        });

        const externalIds = [];

        const today = new Date();
        for await (const data of iterator) {
            const exportedAtDate = data.exported_at;

            if (exportedAtDate && DateUtils.sameDay(today, exportedAtDate)) {
                externalIds.push(data.external_id);
            }
        }

        if (externalIds.length) {
            await ShopifyProductService
                .addProductsToDeliveryProfile(this.shop.original_url, this.shop.token, externalIds);
        }
    }

    /**
     * Export products to a Shopify store.
     * This method retrieves the exported products from the store,
     * searches for corresponding products in the local database,
     * and exports them using the ShopifyConnectedShopExportService.
     * It also updates the progress of the export operation.
     * @returns {Promise<void>} A promise that resolves when the export is complete.
     */
    async export() {
        const iterator = new ListingIterator(async (prev_id, batch_size) => {
            const batch = await this.shop.listExportedProducts(
                prev_id, batch_size
            );
            const products = await Product.search(
                {ids: batch.map(({id}) => id)}, 0, batch_size
            );
            const productsIndex = Utils.buildIndex(products);

            return batch.map(data =>
                ({...data, product: productsIndex[data.id]})
            );
        });

        this.setProgress({total: this.shop.exportedProductsCount});

        for await (const data of iterator) {
            try {
                await ShopifyConnectedShopExportService.exportProduct({
                    product: data.product,
                    shop: this.shop,
                    exported_price: data.exported_price,
                    external_id: data.external_id,
                    exported_name: data.exported_name,
                    exported_description: data.exported_description
                });
            } catch (err) {
                console.error(err);
            }

            this.setProgress({progress: this.status.progress + 1});
        }

        await this.#addProductsToShippingPolicy();
    }
}

module.exports = ShopifyProductsManager;
