const path = require("path");
const axios = require("axios");

const ProcessingTask = require("./ProcessingTask");
const FilesystemManager = require("../../services/FilesystemManager");

const ProductImageStorage = require("../../storage/ProductImageStorage");
const S3Storage = require("../../services/S3Storage");
const Mime = require("../../services/Mime");

class BackgroundImageUpdater extends ProcessingTask {
    static MAX_QUEUE_SIZE = 1;

    static STATIC_PRODUCTS_PATH = path.join(
        FilesystemManager.STATIC_PATH,
        "products"
    );

    static BASE_URL = process.env.REMBG_URL;

    constructor(data) {
        super(data);
    }

    async request(url, model) {
        return await axios.get(
            BackgroundImageUpdater.BASE_URL +
            `api/remove?model=${model}&url=${encodeURIComponent(url)}`,
            {responseType: "arraybuffer"}
        );
    }

    async countProducts() {
        return await ProductImageStorage.countUncropped();
    }

    async listProducts(prev_id, count = 1024) {
        return await ProductImageStorage.listUncropped(prev_id, count);
    }

    async processProduct(image) {
        if (image.has_cropped_version)
            return this.setProgress({progress: this.status.progress + 1});

        const url = `${S3Storage.OVH_S3_ENDPOINT}/${image.uuid}`;
        await Promise.all([
            this.#downloadAndUploadImage(url, "u2net", image.uuid),
            this.#downloadAndUploadImage(url, "u2netp", image.uuid)
        ]);

        await ProductImageStorage.setCropped(image.id);
        this.log(`Processed image #${image.id}`);
        return this.setProgress({progress: this.status.progress + 1});
    }

    async #downloadAndUploadImage(image_url, model, uuid) {
        const MAX_ATTEMPTS = 5;
        let response;
        this.log(`Processing ${image_url} with ${model}`);

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            try {
                response = await this.request(image_url, model);
                break;
            } catch (error) {
                this.log(`Error processing ${
                    image_url} with ${model}, attempt ${i + 1}/${MAX_ATTEMPTS}`
                );

                if (i === MAX_ATTEMPTS - 1)
                    throw new Error(`Failed to process ${
                        image_url} with ${model} after ${MAX_ATTEMPTS} attempts`
                    );

                await new Promise((resolve) => setTimeout(resolve, 1e3));
            }
        }

        const name = `${model}/${uuid}`;

        await S3Storage.upload(
            response.data,
            Mime.validateMime(response.headers["content-type"]),
            path.join(
                path.dirname(name),
                path.basename(name, path.extname(name))
            )
        );
    }

}

module.exports = BackgroundImageUpdater;
