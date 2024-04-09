const ProcessingTask = require("./ProcessingTask");

// eslint-disable-next-line no-unused-vars
const Product = require("../../models/Product");
const SlackLogger = require("../../services/SlackLogger");
class ExportingTask extends ProcessingTask {
    static MIN_REQUEST_INTERVAL = 200;

    static MAX_QUEUE_SIZE = 10;

    constructor(data) {
        super(data);

        /**
         * Groups of queues, each queue having at most `MAX_QUEUE_SIZE` products
         * @type {Object.<
         *  string,
         *  {insert: Product[], update: Product[], delete: Product[]}
         * >}
         */
        this.queues = {};
        /**
         * Aliases to methods for inserting, updating and deleting products
         * @type {{insert: Function, update: Function, delete: Function}}
         */
        this.handlers = {
            insert: this.insertProductsBatch.bind(this),
            update: this.updateProductsBatch.bind(this),
            delete: this.deleteProductsBatch.bind(this)
        };
        /**
         * The name of the service
         * @type {?string}
         */
        this.serviceName = null;
        /**
         * The timestamp for the next request
         * @type {number}
         */
        this.nextRequest = Date.now();
    }

    /**
     * Wait to ensure an interval of MIN_REQUEST_INTERVAL between consecutive
     * calls
     * @returns {Promise<void>}
     */
    async waitForNextRequest() {
        await new Promise(resolve => {
            setTimeout(resolve, this.nextRequest - Date.now());
        });

        this.nextRequest = Date.now() + this.constructor.MIN_REQUEST_INTERVAL;
    }

    /**
     * Handle a product: push it to the appropriate queue and flush it if needed
     * @param product {Product}
     * @param action {"insert" | "update" | "delete"}
     * @returns {Promise<void>}
     */
    async handleProduct(product, action) {
        this.log(`Handling product ${product.id}... (${action})`);
        const group_name = this.getProductGroupName(product);

        if (!group_name)
            return;

        if (!this.queues[group_name])
            this.queues[group_name] = {insert: [], update: [], delete: []};

        const queue = this.queues[group_name][action];

        queue.push(product);

        if (queue.length >= this.constructor.MAX_QUEUE_SIZE)
            await this.flushQueue(group_name, action);
    }

    /**
     * Check if a product has already been uploaded to the current service
     * @param product {Product}
     * @returns {boolean}
     */
    productExists(product) {
        return !!product.externalIds[this.serviceName]?.id;
    }

    /**
     * Check if a product should be considered as available
     * @param product {Product}
     * @returns {boolean}
     */
    isProductAvailable(product) {
        return product.status == "ACTIVE";
    }

    /**
     * Get the group name of a product. Separate groups have separate queues.
     * @param _product {Product}
     * @returns {string}
     */
    getProductGroupName(_product) {
        return "default";
    }

    /**
     * Insert a batch of products
     * @abstract
     * @param _product {Product}
     * @param _group_name {string}
     * @returns {Promise<Object>}
     */
    async insertProductsBatch(_product, _group_name) {
        throw new Error(
            "ExportingTask.insertProductsBatch() is not overridden"
        );
    }

    /**
     * Update a batch of products
     * @abstract
     * @param _products {Product[]}
     * @param _group_name {string}
     * @returns {Promise<Object>}
     */
    async updateProductsBatch(_products, _group_name) {
        throw new Error(
            "ExportingTask.updateProductsBatch() is not overridden"
        );
    }

    /**
     * Delete a batch of products
     * @param products {Product[]}
     * @param group_name {string}
     * @returns {Promise<Object>}
     */
    async deleteProductsBatch(products, group_name) {
        return await this.updateProductsBatch(products, group_name);
    }

    /**
     * Link products to the service given a `result` returned by
     * `getIdsMappings()`
     * @param products {Product[]}
     * @param result {Object}
     * @returns {Promise<void>}
     */
    async linkProducts(products, result) {
        const ids = this.getIdsMappings(products, result);
        const products_by_id = Object.fromEntries(products.map(p => [p.id, p]));

        let failed_count = 0;

        await Promise.all(Object.entries(ids).map(
            async ([product_id, external_id]) => {
                const product = products_by_id[product_id];

                if (!product)
                    return;

                if (!external_id)
                    return failed_count++;

                await product.setExternalServiceId(
                    this.serviceName,
                    external_id
                );
            }
        ));

        this.setProgress({
            progress: this.status.progress + products.length,
            failed: this.status.failed + failed_count
        });
    }

    /**
     * Unlink an array of products from the service
     * @param products {Product[]}
     * @returns {Promise<void>}
     */
    async unlinkProducts(products) {
        await Promise.all(products.map(async product =>
            product.setExternalServiceId(this.serviceName, null)
        ));
        this.setProgress({progress: this.status.progress + products.length});
    }

    /**
     * Get mappings of product ids to external ids from a result returned by
     * `insertProductsBatch()`, `updateProductsBatch()` or
     * `deleteProductsBatch()`
     * @abstract
     * @param _products {Product[]}
     * @param _result {Object}
     * @returns {Object.<Number, string | Number>}
     */
    getIdsMappings(_products, _result) {
        throw new Error("ExportingTask.getIdsMappings() is not overridden");
    }

    /**
     * Set last_update of an external product id to the current timestamp
     * @param product {Product}
     * @return {Promise<void>}
     */
    async updateProductTimestamp(product) {
        await product.setExternalServiceId(
            this.serviceName,
            product.externalIds[this.serviceName]?.id || null
        );
    }

    /**
     * Flush a product queue: call the appropriate handler method with the queue
     * and clear it
     * @param group_name {string}
     * @param action {"insert" | "update" | "delete"}
     * @return {Promise<void>}
     */
    async flushQueue(group_name, action) {
        const queue = this.queues[group_name][action];
        const handler = this.handlers[action];

        if (!queue.length)
            return;

        try {
            await this.waitForNextRequest();

            /** @type {number | Object<number, number> | null} */
            const result = await handler(queue, group_name);

            if (result) {
                if (action == "delete")
                    await this.unlinkProducts(queue);
                else if (result)
                    await this.linkProducts(queue, result);
            }
        } catch (err) {
            this.log("Error processing batch:", err);

            this.setProgress({
                progress: this.status.progress + queue.length,
                failed:   this.status.failed + queue.length
            });
        } finally {
            queue.length = 0;
        }
    }

    /**
     * Processes a product for exporting.
     * @param {Product} product - The product to be processed.
     * @returns {Promise<void>} - A promise that resolves when the product processing is complete.
     */
    async processProduct(product) {
        if (!product.isExportable) {
            this.log(`Product ${product.id} is not exportable... Skipping...`);
            this.setProgress({progress: this.status.progress + 1});
            return;
        }

        const is_available = this.isProductAvailable(product);

        if (this.productExists(product)) {
            if (is_available)
                await this.handleProduct(product, "update");
            else
                await this.handleProduct(product, "delete");
        } else {
            if (is_available)
                await this.handleProduct(product, "insert");
            else {
                this.log(`Product ${product.id} is not exported to the service and not available... Nothing to do...`);
                await this.updateProductTimestamp(product);
                this.setProgress({progress: this.status.progress + 1});
            }
        }
    }

    /**
     * Flush remaining product queues. If finish() is overridden, this should
     * still be called (via `await super.finish();`)
     * @returns {Promise<void>}
     */
    async finish() {
        for (const [group_name, queues] of Object.entries(this.queues)) {
            for (const action of Object.keys(queues))
                await this.flushQueue(group_name, action);
        }

        await SlackLogger.sendMessage({
            channel_id: process.env.SLACK_LOGS_CHANNEL_ID,
            text: `[${new Date().toUTCString()}] Exporting to *${this.serviceName}* finished.\n`
                + `\t- ${this.status.progress} products *processed*,\n`
                + `\t- ${this.status.failed} products *failed*.`
        });
    }
}

module.exports = ExportingTask;
