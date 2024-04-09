const path = require("path");

const ProcessingTask = require("./ProcessingTask");

const Product = require("../../models/Product");

const Utils        = require("../../services/Utils");
const ProductHelper = require("../../business-services/product/helper/Product.helper");
const CSVGenerator = require("../../services/CSVGenerator");

const dump_config = require("../../const/miinto-dump.json");

class MiintoUpdater extends ProcessingTask {
    static FILEPATH = path.join(__dirname, "../../../data/miinto.tsv");

    constructor(data) {
        super(data);

        this.csvGenerator = new CSVGenerator(
            MiintoUpdater.FILEPATH,
            {delimiter: "\t"}
        );
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await Product.countAvailable();
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count = 1024) {
        return await Product.listAvailable(prev_id, count);
    }

    /** @override ProcessingTask.init */
    async init() {
        await this.csvGenerator.createWriteStream();

        await this.csvGenerator.write(dump_config.fields);
    }

    /**
     * Processes a product and generates CSV data for Miinto.
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

        const brand = dump_config.brands[product.brand.name];

        const retailPriceCents = ProductHelper.getEffectiveRetailPrice(product);
        if (!brand || !product.name || !retailPriceCents)
            return this.setProgress({progress: this.status.progress + 1});

        const price = Math.ceil(retailPriceCents * 1.25 / 500) * 500;

        const data = {
            id: product.id,
            brand,
            item_group_id: product.identifier,
            title: Utils.capitalizeAll(((
                product.name?.startsWith(product.brand.name)
                    ? product.name.substring(product.brand.name.length + 1)
                    : product.name
            ) || "").toLocaleLowerCase()),
            product_type: Utils.capitalizeAll(product.type.name || ""),
            gender: product.gender === null ? "U" : "FM"[product.gender],
            color: Utils.capitalizeAll(
                Object.values(product.colors)
                    .map(({name}) => name)
                    .join(", ")
            ),
            size: "One size",
            image_link: product.imageUrls[0],
            additional_image_link: product.imageUrls.slice(1).join(","),
            "c:stock_level:integer": 1,
            "c:season_tag:string": "NOOS",
            description: product.getVerboseDescription(),
            material: JSON.stringify({
                "en_EN.utf8": Utils.capitalizeAll(
                    Object.values(product.materials)
                        .map(({name}) => name)
                        .join(", ")
                )
            }),
            "c:retail_price_EUR:integer": price,
            "c:discount_retail_price_EUR:integer": Math.round(price * .9)
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

module.exports = MiintoUpdater;
