const path = require("path");

const ProductHelper = require("../../business-services/product/helper/Product.helper");

const ProcessingTask = require("./ProcessingTask");

const Product = require("../../models/Product");

const CSVGenerator = require("../../services/CSVGenerator");

const dump_config = require("../../const/cxmp-dump.json");

class CXMPUpdater extends ProcessingTask {
    static FILEPATH = path.join(__dirname, "../../../data/cxmp.csv");

    constructor(data) {
        super(data);

        this.csvGenerator = new CSVGenerator(CXMPUpdater.FILEPATH);
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await Product.countSearch({tag_ids: [this.params.tag_id]});
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count = 1024) {
        return await Product.search(
            {tag_ids: [this.params.tag_id]},
            prev_id,
            count
        );
    }

    /** @override ProcessingTask.init */
    async init() {
        await this.csvGenerator.createWriteStream();

        await this.csvGenerator.write(dump_config.fields);
    }

    /**
     * Process a product and generate CSV data.
     * @override ProcessingTask.processProduct
     * @param {Product} product - The product to process.
     * @returns {Promise<void>} - A promise that resolves when the processing is complete.
     */
    async processProduct(product) {
        if (!product.isExportable) {
            this.log(`Product ${product.id} is not exportable... Skipping...`);
            this.setProgress({progress: this.status.progress + 1});
            return;
        }

        if (!product.name || !product.retailPriceCents)
            return this.setProgress({progress: this.status.progress + 1});

        const wholesalePriceCents = ProductHelper.getEffectiveWholesalePrice(product);
        const retailPriceCents = ProductHelper.getEffectiveRetailPrice(product);

        const data = {
            "EAN": product.identifier,
            "title": product.name,
            "description": product.getVerboseDescription(),
            "wholesale-price": (wholesalePriceCents / 100).toFixed(2),
            "retail-price": (retailPriceCents / 100).toFixed(2),
            "images": product.imageUrls.join(";")
        };

        this.log(`Writing product ${product.id} to csv...`);

        await this.csvGenerator.write(
            dump_config.fields.map(name => data[name] ?? "")
        );

        this.setProgress({progress: this.status.progress + 1});
    }

    /** @override ProcessingTask.finish */
    async finish() {
        await this.csvGenerator.finish();
    }
}

module.exports = CXMPUpdater;
