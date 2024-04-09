const ProcessingTask = require("./ProcessingTask");

const ProductImageStorage = require("../../storage/ProductImageStorage");
const S3Storage = require("../../services/S3Storage");

class BackgroundImageRemover extends ProcessingTask {
    constructor(data) {
        super(data);
    }

    async countProducts() {
        return await ProductImageStorage.countCropped();
    }

    async listProducts(prev_id, count = 1024) {
        return await ProductImageStorage.listCropped(prev_id, count);
    }

    async processProduct(image) {
        await S3Storage.delete([
            `u2net/${image.uuid}`,
            `u2netp/${image.uuid}`
        ]);

        await ProductImageStorage.setCropped(image.id, false);
        this.log(`Removing background from image #${image.id}`);
        return this.setProgress({progress: this.status.progress + 1});
    }
}

module.exports = BackgroundImageRemover;
