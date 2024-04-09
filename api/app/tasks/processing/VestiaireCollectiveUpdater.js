const path = require("path");

const ProcessingTask = require("./ProcessingTask");

const Product = require("../../models/Product");

const CSVGenerator = require("../../services/CSVGenerator");

const dump_config = require("../../const/vc-dump.json");
const ProductHelper = require("../../business-services/product/helper/Product.helper");

class VestiaireCollectiveUpdater extends ProcessingTask {
    static FILEPATH = path.join(__dirname, "../../../data/vestiaire.csv");

    constructor(data) {
        super(data);

        this.csvGenerator = new CSVGenerator(
            VestiaireCollectiveUpdater.FILEPATH
        );
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await Product.countUpdatedForService(
            "vestiaire_collective", {is_exported_vc: 1}
        );
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count = 1024) {
        return await Product.listUpdatedForService(
            "vestiaire_collective", {is_exported_vc: 1}, prev_id, count
        );
    }

    /** @override ProcessingTask.init */
    async init() {
        await this.csvGenerator.createWriteStream();

        await this.csvGenerator.write(dump_config.fields);
    }

    /**
     * Processes a product and generates data for CSV generation.
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

        const brand = dump_config.brands[product.brand.name]
            ?? product.brand.name;
        const categories = dump_config.categories[
            [
                (product.gender === 0 ? "women" : "men"),
                product.type.name,
                product.subtype?.name
            ].filter(Boolean).join("/")
        ];
        const color = dump_config.colors[
            Object.values(product.colors)[0]?.name
        ];
        const material = dump_config.materials[
            Object.values(product.materials)[0]?.name
        ];
        let data;

        const retailPriceCents = ProductHelper.getEffectiveRetailPrice(product);
        if (
            !brand || !retailPriceCents
            || !material || !color || !categories
        ) {
            data = {"SKU": product.id, "Inventory": 0};
        } else {
            const price = Math.round(retailPriceCents * 1.1 / 500) * 5;

            const grade_rank = "SABC".indexOf(product.grade[0]);

            const condition = [
                "Never worn",
                "Very good condition",
                "Good condition",
                "Fair condition"
            ][grade_rank] ?? "Good condition";

            data = {
                "SKU": product.id,
                "Universe": product.gender === 0 ? "Women" : "Men",
                "Category ": categories[0],
                "Brand": brand,
                "Subcategory": categories[1],
                "Sub Sub Category ": categories[2],
                "Material": material,
                "Color": color,
                "Model": product.model || "",
                "Images": product.imageUrls.join(";"),
                "Currency": "EUR",
                "Price": price,
                "Description": product.getVerboseDescription(),
                "Vintage": grade_rank > 1 ? "vintage" : "",
                "Condition": condition,
                "Inventory": +(product.status == "ACTIVE")
            };
        }

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

module.exports = VestiaireCollectiveUpdater;
