const path = require("path");

class ProductsManager {
    static DUMP_PATH = path.join(__dirname, "../../../../data/product-feeds/");

    constructor(channel) {
        this.channel = channel;
        this.status = {progress: 0, total: null};
    }

    /**
     * Set current progress and broadcast it to the channel if changed
     * @param {Object} options - The options object.
     * @param {number} [options.progress] - The progress value to set.
     * @param {number} [options.total] - The total value to set.
     * @returns {void}
     */
    setProgress({progress, total}) {
        const is_modified = (
            progress !== undefined && progress !== this.status.progress
            || total !== undefined && total !== this.status.total
        );

        if (progress !== undefined && progress !== this.status.progress)
            this.status.progress = progress;

        if (total !== undefined && total !== this.status.total)
            this.status.total = total;

        if (is_modified)
            return this.channel.log(this.status);
    }

    /**
     * Lists and update product-related bindings
     * @return {Promise<void>}
     */
    async getBindings() {}

    /**
     * Imports products to Korvin
     * @return {Promise<void>}
     */
    async import() {}

    /**
     * Exports products from Korvin
     * @return {Promise<void>}
     */
    async export() {}

    /**
     * Writes a feeed of the products of this Marketplace to the response stream
     * @param _res {Response}
     * @return {Promise<void>}
     */
    async sendProducts(_res) {}
}

module.exports = ProductsManager;
