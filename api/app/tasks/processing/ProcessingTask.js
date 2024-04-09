const Task = require("../Task");
const Product = require("../../models/Product");
const ListingIterator = require("../../services/ListingIterator");

class ProcessingTask extends Task {
    constructor(data) {
        super(data);

        /**
         * The products iterator
         * @type {ListingIterator}
         */
        this.products = new ListingIterator(this.listProducts.bind(this));
    }

    /**
     * Count available products
     * @returns {Promise<number>}
     */
    async countProducts() {
        return await Product.countAll();
    }

    /**
     * List available products
     * @param prev_id {number}
     * @param count {number}
     * @returns {Promise<Product[]>}
     */
    async listProducts(prev_id, count = 1024) {
        return await Product.listAll(prev_id, count);
    }

    /** Process a single product
     * @abstract
     * @param _product {Product}
     * @returns {Promise<void>}
     */
    async processProduct(_product) {
        throw new Error("ProcessingTask.processProduct() is not overridden");
    }

    /**
     * Performs initialization before the processing starts
     * @return {Promise<void>}
     */
    async init() {}

    /**
     * Performs cleanup after the processing ends
     * @return {Promise<void>}
     */
    async finish() {}

    /**
     * Iterates over products and calls `processProduct` for each one
     * @override Task.run
     * @return {Promise<void>}
     */
    async run() {
        const total = await this.countProducts();

        this.setProgress({total});

        try {
            await this.init();
        } catch (err) {
            this.log("Error initializing products processing:", err);

            this.setProgress({
                failed: this.status.total - this.status.progress
            });
        }

        for await (const product of this.products) {
            try {
                await this.processProduct(product);
            } catch ( err ) {
                this.log(
                    `Error processing product #${product.id}:`, err
                );

                this.setProgress({
                    progress: this.status.progress + 1,
                    failed: this.status.failed + 1
                });
            }
        }

        try {
            await this.finish();
        } catch (err) {
            this.log("Error finishing products processing:", err);

            this.setProgress({
                progress: this.status.total,
                failed: this.status.total - this.status.progress
            });
        }
    }
}

module.exports = ProcessingTask;
