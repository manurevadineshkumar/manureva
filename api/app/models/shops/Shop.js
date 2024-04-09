const ShopStorage = require("../../storage/ShopStorage");
const ShopBindingStorage = require("../../storage/ShopBindingStorage");

const LogChannel = require("../LogChannel");
const PriceRanges = require("../PriceRanges");
const ShopAttribute = require("./ShopAttribute");

const Utils = require("../../services/Utils");
const Product = require("../Product");
const ShopDiscountRangeModel = require("../ShopDiscountRange.model");
const ShopDiscountRangesService = require("../../business-services/shop/ShopDiscountRanges.service");

class Shop {
    /**
     * The associated ProductsManager class
     * @abstract
     * @type {typeof ProductsManager}
     */
    static ProductsManager = null;
    static LA_RENAISSANCE_ID = 14;
    static EXPENSIVE_BAGS_ID = 29;
    static DEMO_POOLDAY_ID = 13;

    constructor(data) {
        this.id = +data.id;
        this.ownerId = data.owner_id;
        this.importedProductsCount = data.imported_products_count;
        this.exportedProductsCount = data.exported_products_count;
        this.name = data.name;
        this.isImporting = !!data.is_importing;
        this.isExporting = !!data.is_exporting;
        this.platform = data.platform;
        this.currency = data.currency;
        this.original_url = data.original_url;
        this.url = data.url;
        this.token = data.token;
        this.metadata = data.metadata;
        this.lastImport = data.last_import ? new Date(data.last_import) : null;
        this.lastExport = data.last_export ? new Date(data.last_export) : null;
        this.logChannels = null;
        this.importBindings = {};
        this.priceRanges = new PriceRanges({
            target_type: "shop",
            target_id: this.id,
            ranges: data.ranges
        });
        /** @type {ShopDiscountRangeModel} */
        this.discountRanges = new ShopDiscountRangeModel(data.discount_ranges);

        switch (data.id) {
        case Shop.LA_RENAISSANCE_ID :
            this.exportedSlots = 250;
            break;
        case Shop.EXPENSIVE_BAGS_ID :
            this.exportedSlots = 110;
            break;
        case Shop.DEMO_POOLDAY_ID :
            this.exportedSlots = 250;
            break;
        default:
            this.exportedSlots = 20;
        }
    }

    serialize() {
        return {
            id: +this.id,
            owner_id: this.ownerId,
            imported_products_count: this.importedProductsCount,
            exported_products_count: this.exportedProductsCount,
            exported_slots: this.exportedSlots,
            name: this.name,
            ...(
                this.isImporting
                    ? {is_importing: 1, last_import: this.lastImport}
                    : {}
            ),
            ...(
                this.isExporting
                    ? {is_exporting: 1, last_export: this.lastExport}
                    : {}
            ),
            platform: this.platform,
            currency: this.currency,
            url: this.url,
            original_url: this.original_url,
            token: this.token ? ("•".repeat(22) + this.token.slice(-2)) : null,
            ...(this.logChannels ? {log_channels: this.logChannels} : {}),
            tmp: this.priceRanges.ranges,
            ranges: this.priceRanges.serialize(),
            discount_ranges: this.discountRanges.serialize(),
        };
    }

    /**
     * Creates a new shop.
     * @param {Object} data - The data for creating the shop.
     * @param {string} data.owner_id - The ID of the shop owner.
     * @param {string} data.name - The name of the shop.
     * @param {boolean} data.is_importing - Indicates if the shop is importing.
     * @param {boolean} data.is_exporting - Indicates if the shop is exporting.
     * @param {string} data.platform - The platform of the shop.
     * @param {string} data.currency - The currency of the shop.
     * @param {string} data.url - The URL of the shop.
     * @param {string} data.original_url - The original URL of the shop.
     * @param {string} data.token - The token of the shop.
     * @param {string} data.api_secret - The API secret of the shop.
     * @param {Array} data.day_ranges - The day ranges of the shop.
     * @param {Array} data.price_ranges - The price ranges of the shop.
     * @param {Array<Array<number>>} data.discount_values - The discount values of the shop.
     * @returns {Promise<Shop>} A promise that resolves with the created shop.
     */
    static async create({
        owner_id,
        name,
        is_importing,
        is_exporting,
        platform,
        currency,
        url,
        original_url,
        token,
        api_secret,
        day_ranges,
        price_ranges,
        discount_values
    }) {
        url = url && this.processUrl(url);
        original_url = url && this.processUrl(original_url);

        const data = await ShopStorage.create({
            owner_id,
            name,
            is_importing,
            is_exporting,
            platform,
            currency,
            url,
            original_url,
            token,
            api_secret
        });

        /**
         * Persist the discount ranges to database
         * @type {ShopDiscountRangeModel}
        */
        const discount_ranges = await ShopDiscountRangesService.create({
            shopId: data.id,
            dayRanges: day_ranges,
            priceRanges: price_ranges,
            discountValues: discount_values
        });

        /**
         * Convert the new discount ranges to the old format (price_ranges).
         * Reduce to select only the first discount for each price_to.
         * Map to convert the price_to to cents.
         * @deprecated
         * @type {{to: number, percent: number}[]}
         * @example [
         *   {day_to: 30, price_to: 10, discount: 10},
         *   {day_to: null, price_to: 10, discount: 20},
         *   {day_to: 30, price_to: null, discount: 30},
         *   {day_to: null, price_to: null, discount: 40},
         * ] -> [
         *   {to: 1000, percent: 10},
         *   {to: null, percent: 30}
         * ]
         */
        const deprecated_ranges = discount_ranges.discountRanges
            .reduce((accumulator, current) => {
                if (!accumulator.find((item) => item.price_to === current.price_to)) {
                    accumulator.push(current);
                }
                return accumulator;
            }, [])
            .map(({price_to, discount}) => {
                return {
                    to: price_to ? price_to * 100 : null,
                    percent: discount
                };
            });

        /**
         * @deprecated
         * @type {PriceRanges}
         */
        const ranges = await PriceRanges.setForShop(data.id, deprecated_ranges);

        return new this({
            ...data,
            ranges: ranges.ranges,
            discount_ranges: discount_ranges.discountRanges,
        });
    }

    static async listAllConnectedAndExporting(prev_id, batch_size) {
        return await ShopStorage.listAllConnectedAndExporting(prev_id, batch_size);
    }

    static async countAllConnectedAndExporting(prev_id, batch_size) {
        return await ShopStorage.countAllConnectedAndExporting(prev_id, batch_size);
    }

    /**
     * Processes a shop url: remove its scheme and hash/query parameters.
     * @param url {String} the shop's URL
     * @return {String}
     */
    static processUrl(url) {
        if (!url)
            return url;

        url = url
            .toLowerCase()
            .split("?")[0]
            .split("#")[0];

        if (url.startsWith("http://") || url.startsWith("https://"))
            url = url.substring(url.indexOf(":") + 3);

        while (url.endsWith("/"))
            url = url.slice(0, -1);

        return url;
    }

    /**
     * Loads the log channels for the shop
     * @return {Promise<void>}
     */
    async loadLogChannels() {
        const [setup, _import, _export] = await Promise.all([
            LogChannel.getUuidByAlias("shop-setup:" + this.id),
            LogChannel.getUuidByAlias("shop-import:" + this.id),
            LogChannel.getUuidByAlias("shop-export:" + this.id)
        ]);

        this.logChannels = {
            setup,
            import: _import,
            export: _export
        };
    }

    /**
     * Retrieves the import binding for a given shop attribute name and value.
     * If the bindings has already been retrieved, use the cached one.
     * @param {string} shop_attribute_name - The name of the shop attribute.
     * @param {string} shop_attribute_value - The value of the shop attribute.
     * @returns {Promise<Array>} - A promise that resolves to the import binding.
     */
    async getImportBinding(shop_attribute_name, shop_attribute_value) {
        if (!this.importBindings[shop_attribute_name]) {
            this.importBindings[shop_attribute_name] = {};
        }

        if (!this.importBindings[shop_attribute_name][shop_attribute_value]) {
            this.importBindings[shop_attribute_name][shop_attribute_value] =
                ShopBindingStorage.getImportBindings(
                    this.id,
                    shop_attribute_name,
                    shop_attribute_value
                );
        }

        return await this.importBindings[shop_attribute_name][shop_attribute_value];
    }

    /**
     * Updates the shop
     * @param params {Object} the attributes to update
     * @param params.name {?String}
     * @param params.is_importing {?Boolean}
     * @param params.is_exporting {?Boolean}
     * @param params.last_import {?Date}
     * @param params.last_export {?Date}
     * @param params.platform {?String}
     * @param params.url {?String}
     * @param params.token {?String}
     * @return {Promise<void>}
     */
    async update({
        name, is_importing, is_exporting, last_import, last_export,
        platform, url, token
    }) {
        const fields = Utils.removeUndefinedValues({
            name, is_importing, is_exporting, last_import, last_export,
            platform, url, token
        });

        if (fields.url)
            fields.url = this.constructor.processUrl(fields.url);

        if (Object.keys(fields).length)
            await ShopStorage.update(this.id, fields);

        Object.assign(this, Utils.removeUndefinedValues({
            isImporting: is_importing,
            isExporting: is_exporting,
            lastImport: last_import, lastExport: last_export,
            name, platform, url, token
        }));
    }

    /**
     * Adds an imported product to this shop
     * @param product_id {Number} a product ID
     * @param external_id {String} additional product metadata
     * @param created_at {Date} the date when the product was imported
     * @return {Promise<Boolean>}
     */
    async addImportedProductById(product_id, external_id, created_at) {
        return await ShopStorage.addImportedProductById(
            this.id, product_id, external_id, created_at
        );
    }

    /**
     * Lists imported products for this shop
     * @param prev_id {Number}
     * @param batch_size {Number}
     * @return {Promise<Object[]>}
     */
    async listImportedProducts(prev_id, batch_size) {
        return await ShopStorage.listImportedProducts(
            this.id, prev_id, batch_size
        );
    }

    /**
     * Removes an imported product from this shop by its ID
     * @param product_id {Number} the product's ID
     * @return {Promise<void>}
     */
    async removeImportedProductById(product_id) {
        return await ShopStorage.removeImportedProductById(this.id, product_id);
    }

    /**
     * Removes an imported product from this shop by its external ID
     * @param external_id {String} the product's external ID
     * @return {Promise<void>}
     */
    async removeImportedProductByExternalId(external_id) {
        return await ShopStorage.removeImportedProductByExternalId(
            this.id, external_id
        );
    }

    /**
     * @param productId {number}
     * @param shopId {number}
     * @param value {boolean}
     */
    async changeExportedProductArchived(productIds, shopId, value) {
        return await ShopStorage.changeArchived(productIds, shopId, value);
    }

    /**
     * Adds exported products to this shop by their IDs
     * @param product_ids {Number[]} product IDs to add
     * @return {Promise<Number>}
     */
    async addExportedProductsByIds(product_ids) {
        const products = await Product.search(
            {ids: product_ids},
            0,
            product_ids.length
        );

        return await ShopStorage.addExportedProducts(
            this.id,
            products.map(p => ({
                id: p.id,
                description: p.getVerboseDescription()
            }))
        );
    }

    /**
     * Updates the price of an exported product
     * @param product_id {Number}
     * @param data {Object}
     * @return {Promise<void>}
     */
    async updateExportedProductData(product_id, data) {
        return await ShopStorage.updateExportedProductData(
            this.id, product_id, data
        );
    }

    /**
     * Lists exported products for this shop
     * @param prev_id {Number}
     * @param batch_size {Number}
     * @return {Promise<Object[]>}
     */
    async listExportedProducts(prev_id, batch_size) {
        return await ShopStorage.listExportedProducts(
            this.id, prev_id, batch_size, Product.WHOLESALE_TO_DROPSHIPPING_RATE
        );
    }

    /**
     * Removes an exported product from this shop by its ID
     * @param product_ids {Number[]} product IDs to remove
     * @return {Promise<void>}
     */
    async removeExportedProductsByIds(product_ids) {
        return await ShopStorage.removeExportedProductsByIds(
            this.id, product_ids
        );
    }

    /**
     * Runs an async operation to list and update shop bindings
     * @param channel {LogChannel} a channel for logging
     * @return {Promise<void>}
     */
    async updateBindings(channel) {
        const manager = new this.constructor.ProductsManager(this, channel);
        const bindings = await manager.getBindings();

        await ShopAttribute.setForShop(this.id, Object.keys(bindings));

        const attributes = await ShopAttribute.listForShop(this.id);

        await Promise.all(attributes.map(async attr => {
            const values = bindings[attr.name];

            if (values)
                await attr.setValues([...values].map(value => ({value})));
        }));

        await this.update({last_import: null, last_export: null});
    }

    /**
     * Runs an async operation to import products from shop to Korvin
     * @param channel {LogChannel} a channel for logging
     * @return {Promise<void>}
     */
    async importProducts(channel) {
        const start_date = new Date;
        const manager = new this.constructor.ProductsManager(this, channel);

        await manager.import();
        await this.update({last_import: start_date});
    }

    /**
     * Runs an async operation to export products from Korvin to this shop
     * @param channel {LogChannel} a channel for logging
     * @return {Promise<void>}
     */
    async exportProducts(channel) {
        const start_date = new Date;
        const manager = new this.constructor.ProductsManager(this, channel);

        await manager.export();
        await this.update({last_export: start_date});
    }

    /**
     * Deletes this shop
     * @return {Promise<void>}
     */
    async delete() {
        await this.priceRanges.delete();
        await ShopStorage.setUnavailableProducts(this.id);
        await ShopStorage.delete(this.id);
    }
}

module.exports = Shop;
