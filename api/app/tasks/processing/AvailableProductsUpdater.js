const Task = require("./../Task");

const Product = require("../../models/Product");

/**
 * @class AvailableProductsUpdater
 * This task is responsible for updating the availability of products in the database.
 * If the product is in the input group, it will be marked as active.
 * If not, the product's updatedAt will not be updated and the product will be marked as disabled.
 */
class AvailableProductsUpdater extends Task {
    static BATCH_SIZE = 1024;

    constructor(data) {
        super(data);
    }

    async popTasksBatch() {
        return await this.group.popInputBatch(
            AvailableProductsUpdater.BATCH_SIZE
        );
    }

    async run() {
        const total = await this.group.getInputSize();

        this.setProgress({total});

        for (
            let tasks = await this.popTasksBatch();
            tasks.length;
            tasks = await this.popTasksBatch()
        ) {
            try {
                await Product.setAvailableBatch(tasks.map(data => data.params.id));

                await this.group.completeEntries(tasks.map(({uuid}) => uuid));

                this.setProgress({progress: this.status.progress + tasks.length});
            } catch (err) {
                this.log(`Error processing tasks:`, err);

                this.setProgress({
                    progress: this.status.progress + tasks.length,
                    failed: this.status.failed + tasks.length
                });
            }
        }

        const unavailable = await Product.deprecateAvailability(
            this.group.startDate
        );

        this.log(`=== ${this.status.progress} product(s) available ===`);
        this.log(`=== ${unavailable} product(s) unavailable ===`);
    }
}

module.exports = AvailableProductsUpdater;
