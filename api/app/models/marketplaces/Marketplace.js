const crypto = require("crypto");

const MarketplaceStorage = require("../../storage/MarketplaceStorage");

const LogChannel = require("../LogChannel");
const PriceRanges = require("../PriceRanges");

const Utils = require("../../services/Utils");

class Marketplace {
    /**
     * The associated ProductsManager class
     * @abstract
     * @type {typeof ProductsManager}
     */
    static ProductsManager = null;

    constructor(data) {
        this.id = +data.id;
        this.ownerId = data.owner_id;
        this.platform = data.platform;
        this.name = data.name;
        this.token = data.token;
        this.exportedProductsCount = data.exported_products_count;
        this.lastExport = data.last_export ? new Date(data.last_export) : null;
        this.logChannel = null;
        this.priceRanges = new PriceRanges({
            target_type: "marketplace",
            target_id: this.id,
            ranges: data.ranges
        });
    }

    serialize() {
        return {
            id: +this.id,
            owner_id: this.ownerId,
            platform: this.platform,
            name: this.name,
            token: this.token,
            exported_products_count: this.exportedProductsCount,
            ...(this.logChannel ? {log_channel: this.logChannel} : {}),
            ranges: this.priceRanges.serialize()
        };
    }

    static getRandomToken() {
        return crypto.randomBytes(16).toString("base64url");
    }

    /**
     * Create a new Marketplace
     * @param data {Object} the shop's parameters
     * @param data.owner_id {Number}
     * @param data.platform {String}
     * @param data.name {String}
     * @param data.ranges {Array}
     * @return {Promise<Marketplace>}
     */
    static async create({owner_id, platform, name, ranges}) {
        const token = Marketplace.getRandomToken();
        const id = await MarketplaceStorage.create({
            owner_id, platform, name, token
        });

        const price_ranges = await PriceRanges.setForMarketplace(id, ranges);

        return new this({
            id, owner_id, platform, name, token,
            ranges: price_ranges.ranges
        });
    }

    /**
     * Computes the changed price of a product according to the price ranges
     * associated with the marketplace
     * @param price {Number}
     * @return {Number}
     */
    getChangedPrice(price) {
        return Math.round(this.priceRanges.addPercent(price));
    }

    /**
     * Loads the log channels for the marketplace
     * @return {Promise<void>}
     */
    async loadLogChannel() {
        this.logChannel = await LogChannel.getUuidByAlias(
            "marketplace-export:" + this.id
        );
    }

    /**
     * Updates the marketplace
     * @param params {Object} the attributes to update
     * @param params.name {?String}
     * @param params.rotate_token {?Boolean}
     * @param params.last_export {?Date}
     * @param params.ranges {?Array}
     * @return {Promise<void>}
     */
    async update({
        name, rotate_token, last_export, ranges
    }) {
        const token = rotate_token ? Marketplace.getRandomToken() : undefined;
        const fields = Utils.removeUndefinedValues({
            name, token, last_export
        });

        if (Object.keys(fields).length)
            await MarketplaceStorage.update(this.id, fields);

        if (ranges)
            await this.priceRanges.update(ranges);

        Object.assign(this, Utils.removeUndefinedValues({
            name, token, ranges,
            lastExport: last_export
        }));
    }

    /**
     * Adds exported products to this marketplace by their IDs
     * @param product_ids {Number[]} product IDs to add
     * @return {Promise<Number>}
     */
    async addExportedProductsByIds(product_ids) {
        return await MarketplaceStorage.addExportedProductsByIds(
            this.id, product_ids
        );
    }

    /**
     * Updates the price of an exported product
     * @param product_id {Number}
     * @param data {Object}
     * @return {Promise<void>}
     */
    async updateExportedProductData(product_id, data) {
        return await MarketplaceStorage.updateExportedProductData(
            this.id, product_id, data
        );
    }

    /**
     * Lists exported products for this marketplace
     * @param prev_id {Number}
     * @param batch_size {Number}
     * @return {Promise<Object[]>}
     */
    async listExportedProducts(prev_id, batch_size) {
        const products = await MarketplaceStorage.listExportedProducts(
            this.id, prev_id, batch_size
        );

        return products.map(data => ({
            exported_price: this.priceRanges.addPercent(data.purchase_price_cents),
            ...data
        }));
    }

    /**
     * Removes an exported product from this marketplace by its ID
     * @param product_ids {Number[]} product IDs to remove
     * @return {Promise<void>}
     */
    async removeExportedProductsByIds(product_ids) {
        return await MarketplaceStorage.removeExportedProductsByIds(
            this.id, product_ids
        );
    }

    /**
     * Runs an async operation to export products from Korvin to this
     * marketplace
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
     * Writes a feeed of the products of this Marketplace to the response stream
     * @param res {Response}
     * @return {Promise<void>}
     */
    async sendProducts(res) {
        const manager = new this.constructor.ProductsManager(this);

        await manager.sendProducts(res);
    }

    /**
     * Deletes this marketplace
     * @return {Promise<void>}
     */
    async delete() {
        await this.priceRanges.delete();
        await MarketplaceStorage.delete(this.id);
    }
}

module.exports = Marketplace;
