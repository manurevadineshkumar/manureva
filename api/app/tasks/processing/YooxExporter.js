const path = require("path");

const ProcessingTask = require("./ProcessingTask");

const Product = require("../../models/Product");

const Utils = require("../../services/Utils");
const CSVGenerator = require("../../services/CSVGenerator");

class YooxExporter extends ProcessingTask {
    static CSV_TEMPLATE = path.join(
        __dirname,
        "../../const/export-yoox-template.csv"
    );
    static FILEPATH = path.join(__dirname, "../../../data/yoox.csv");

    constructor(data) {
        super(data);

        this.csvGenerator = new CSVGenerator(
            YooxExporter.FILEPATH
        );
        this.fields = [];
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
        this.fields = await this.csvGenerator.getHeader(
            YooxExporter.CSV_TEMPLATE
        );
    }

    static insertMaterials(data, materials) {
        const fields = ["MAT1", "MAT2", "MAT3", "MAT4", "MAT5"];
        const names = Object.values(materials).map(material => material.name);

        fields.forEach((fieldKey, index) => {
            if (index < names.length) {
                data[fieldKey] = names[index];
                if (data[fieldKey].includes("fur"))
                    data["HCAT_492"] = "made of fur";
            }
        });
    }

    static insertImageUrls(data, imageUrls) {
        const fields = [
            "FIRST_IMAGE",
            "SECOND_IMAGE",
            "THIRD_IMAGE",
            "FOURTH_IMAGE",
            "FIFTH_IMAGE",
            "SIXTH_IMAGE"
        ];

        for (let i = 0; i < fields.length; i++) {
            data[fields[i]] = imageUrls[i];
        }
    }

    static insertItemCondition(data, grade) {
        const item = {
            "S": "Excellent",
            "SA": "Excellent",
            "A": "Very good",
            "AB": "Very good",
            "B": "Good",
            "BC": "Good",
            "C": "OK"
        };

        data["PREOWNED_CONDITION"] = item[grade];
    }

    /**
     * Processes a product and writes its data to a CSV file.
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

        let data = {
            SHOP_SKU: product.id,
            CATEGORY: product.type.name,
            TITLE: Utils.capitalizeAll(((
                product.name?.startsWith(product.brand.name)
                    ? product.name.substring(product.brand.name.length + 1)
                    : product.name
            ) || "").toLocaleLowerCase()),
            VARIAN_GROUP_ID: product.id,
            GENDER: ["Women", "Men", "Unisex"][product.gender ?? 2],
            BRAND: product.brand.name,
            FILTER_COLOR: Object.values(product.colors)
                .map(({name}) => name)
                .join(", "),
            ITEM_DESCRIPTION_ENG: product.getVerboseDescription(),
            HCAT_492: "not made of fur"
        };

        YooxExporter.insertMaterials(data, product.materials);
        YooxExporter.insertImageUrls(data, product.imageUrls);
        YooxExporter.insertItemCondition(data, product.grade);

        if (data["HCAT_492"] === "made of fur") {
            this.log(`Product ${product.id} is made of fur... Skipping...`);
            this.setProgress({progress: this.status.progress + 1});
            return;
        }

        if (product.type.name === "bags") {
            data["CAT_111"] = product.subtype.name;
        }

        this.log(`Writing product ${product.id} to csv...`);

        await this.csvGenerator.write(
            this.fields.map(name => data[name] ?? "")
        );

        this.setProgress({progress: this.status.progress + 1});
    }

    /** @override ProcessingTask.finish */
    async finish() {
        await this.csvGenerator.finish();
    }
}

module.exports = YooxExporter;
