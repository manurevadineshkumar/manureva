const path = require("path");

const ProcessingTask = require("./ProcessingTask");

const Product = require("../../models/Product");

const ProductHelper = require("../../business-services/product/helper/Product.helper");

const CSVGenerator = require("../../services/CSVGenerator");

const dump_config = require("../../const/grailed-dump.json");

const CurrencyConverter = require("../../data-access/exchangeRate/CurrencyConverter");

class GrailedUpdater extends ProcessingTask {
    static FILEPATH = path.join(__dirname, "../../../data/grailed.csv");

    constructor(data) {
        super(data);

        this.csvGenerator = new CSVGenerator(GrailedUpdater.FILEPATH);
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
     * Processes a product and generates data for CSV generation.
     * @override ProcessingTask.processProduct
     * @param {Product} product - The product to be processed.
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

        const rate = (await CurrencyConverter.getCurrencyRates(
            "USD"
        ))?.EUR ?? null;

        if (!rate) {
            this.log(`Product ${product.id} has no valid currency rate... Skipping...`);
            return this.setProgress({progress: this.status.progress + 1});
        }

        const gender = product.gender
            ? "men"
            : "women";

        const category = dump_config[
            gender + "_category"
        ][product?.subtype?.name ?? "OTHER"];

        const brand = dump_config.brands[product?.brand?.name];

        if (!category || !brand) {
            this.log(`Product ${product.id} has no valid category or brand... Skipping...`);
            return this.setProgress({progress: this.status.progress + 1});
        }

        const manufacturerSize = product.size
            ? Object.entries(product.size)[0]?.[1]?.trim()
            : "";

        const parentCategory = category?.split(".")[0];

        const size = typeof dump_config[
            gender + "_size"
        ][parentCategory] === "string"
            ? dump_config[gender + "_size"][parentCategory]
            : dump_config[gender + "_size"][parentCategory]?.[manufacturerSize]
            ?? dump_config[gender + "_size"][parentCategory]?.OTHER;

        if (!size) {
            this.log(`Product ${product.id} has no size... Skipping...`);
            return this.setProgress({progress: this.status.progress + 1});
        }

        const data = {
            external_seller_reference: product.id + "",
            inventory: +(product.status === "ACTIVE"),
            title: product.name,
            description: product.getVerboseDescription(),
            category: category,
            designer: brand,
            size: gender === "men" ? size : null,
            exact_size: gender === "women" ? size : null,
            condition: dump_config.conditions[product.grade],
            color: Object.values(product.colors)[0]?.name,
            price: Math.ceil(
                retailPriceCents * 1.09 / 100 / rate / 5
            ) * 5,
            tags: dump_config.tags.join(","),
            photo_urls: product.imageUrls.slice(0, 20).join(","),
            shipping_us: Math.ceil(40 * rate),
            shipping_ca: Math.ceil(40 * rate),
            shipping_uk: Math.ceil(20 * rate),
            shipping_eu: Math.ceil(35 * rate),
            shipping_asia: Math.ceil(55 * rate),
            shipping_au: Math.ceil(55 * rate),
            shipping_other: Math.ceil(55 * rate),
        };

        this.log(`Writing product ${product.id} to csv...`);

        await this.csvGenerator.write(
            dump_config.fields.map(name => data[name] ?? "")
        );

        this.setProgress({progress: this.status.progress + 1});
    }

    async finish() {
        await this.csvGenerator.finish();
    }
}

module.exports = GrailedUpdater;
