const path = require("path");

const ProcessingTask = require("./ProcessingTask");

const ProductHelper = require("../../business-services/product/helper/Product.helper");

const Product = require("../../models/Product");

const CSVGenerator = require("../../services/CSVGenerator");

const dump_config = require("../../const/jolicloset-dump.json");

class JoliClosetUpdater extends ProcessingTask {
    static FILEPATH = path.join(__dirname, "../../../data/jolicloset.csv");

    constructor(data) {
        super(data);

        this.csvGenerator = new CSVGenerator(JoliClosetUpdater.FILEPATH);
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await Product.countAll();
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count = 1024) {
        return await Product.listAll(prev_id, count);
    }

    /** @override ProcessingTask.init */
    async init() {
        await this.csvGenerator.createWriteStream();

        await this.csvGenerator.write(dump_config.fields);
    }

    /**
     * Processes a product and generates CSV data.
     * @override ProcessingTask.processProduct
     * @param {Product} product - The product object to process.
     * @returns {Promise<void>} - A promise that resolves when the processing is complete.
     */
    async processProduct(product) {
        if (!product.isExportable) {
            this.log(`Product ${product.id} is not exportable... Skipping...`);
            this.setProgress({progress: this.status.progress + 1});
            return;
        }

        const retailPriceCents = ProductHelper.getEffectiveRetailPrice(product);
        if (!product.name || !retailPriceCents)
            return this.setProgress({progress: this.status.progress + 1});

        const data = {
            id:             product.id,
            images:         product.imageUrls.join(","),
            category:       dump_config.genders[product.gender] ?? "",
            sub_cat:        product.type.name,
            brand:          product.brand.name,
            dimensions:     product.size,
            item_condition: dump_config.conditions[product.grade[0]],
            colors:         Object.values(product.colors)
                .map(({name}) => name)
                .join(","),
            fabrics:        Object.values(product.materials)
                .map(({name}) => name)
                .join(","),
            title:          product.name,
            text:           product.getVerboseDescription(),
            sell_price:     Math.ceil(
                retailPriceCents * 1.2 / 100 / 5
            ) * 5,
            available:      "" + (product.status == "ACTIVE"),
            lastUpdated:    +product.lastUpdate
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

module.exports = JoliClosetUpdater;
