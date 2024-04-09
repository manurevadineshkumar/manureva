const path = require("path");

const ProcessingTask = require("./ProcessingTask");

const Product = require("../../models/Product");

const ProductHelper = require("../../business-services/product/helper/Product.helper");

const CSVGenerator = require("../../services/CSVGenerator");

const dump_config = require("../../const/openforvintage-dump.json");

class OpenForVintageUpdater extends ProcessingTask {
    static FILEPATH = path.join(__dirname, "../../../data/openforvintage.csv");

    constructor(data) {
        super(data);

        this.csvGenerator = new CSVGenerator(OpenForVintageUpdater.FILEPATH);
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
     * Processes a product and writes its data to a CSV file.
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

        if (!product.name || !retailPriceCents || product.gender === null) {
            this.log(`Product ${product.id} has no name, no price or no gender... Skipping...`);
            this.setProgress({progress: this.status.progress + 1});
            return;
        }

        const data = {
            "Unique Id": product.id + "",
            Name: product.name,
            "Image URL": product.imageUrls.slice(0, 20).join(","),
            Brand: product.brand.name,
            Description: product.getVerboseDescription(),
            Gender: dump_config.gender[product.gender ?? 1],
            Colour: Object.values(product.colors)[0]?.name,
            Material: Object.values(product.materials)[0]?.name,
            "Price (inc VAT)": Math.ceil(
                retailPriceCents * 1.2 / 100 / 5
            ) * 5,
            Quantity: +(product.status === "ACTIVE"),
            Availability: dump_config.availability[
                +(product.status === "ACTIVE")
            ],
            "Merchant Category Path": [
                "Catalog",
                product.type.name,
                product?.subtype?.name,
            ].filter(Boolean).join(" > "),
            "Link URL":
                "https://korvin.io/products/" +
                product.identifier.toLowerCase(),
            "Currency": dump_config.currency,
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

module.exports = OpenForVintageUpdater;
