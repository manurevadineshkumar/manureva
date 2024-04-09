const ProcessingTask = require("./ProcessingTask");

const ProductImageStorage = require("../../storage/ProductImageStorage");
const S3Storage = require("../../services/S3Storage");

class S3ImageUpdater extends ProcessingTask {
    constructor(data) {
        super(data);
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await ProductImageStorage.countAll();
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count = 1024) {
        return await ProductImageStorage.listAll(prev_id, count);
    }

    /** @override ProcessingTask.processProduct */
    async processProduct(image) {
        const {uuid} = await S3Storage.uploadFromUrl(image.uuid);

        await ProductImageStorage.setUuidById(image.id, uuid);
        this.log(`Processed ${image.uuid}`);
        return this.setProgress({progress: this.status.progress + 1});
    }

}

module.exports = S3ImageUpdater;
