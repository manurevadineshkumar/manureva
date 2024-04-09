const path = require("path");

const ProductsManager = require("../../ProductsManager");
const Product = require("../../Product");

const CSVGenerator = require("../../../services/CSVGenerator");
const ListingIterator = require("../../../services/ListingIterator");

const dump_config = require("../../../const/vc-dump.json");

const FilesystemManager = require("../../../services/FilesystemManager");

class VestiaireProductsManager extends ProductsManager {
    static DUMP_PATH = path.join(
        __dirname,
        "../../../../data/marketplace-products/"
    );

    constructor(marketplace, channel) {
        super(channel);

        this.marketplace = marketplace;
        this.filepath = path.join(
            VestiaireProductsManager.DUMP_PATH,
            `${+marketplace.id}.csv`
        );
        this.csvGenerator = new CSVGenerator(this.filepath);
        this.listingFilters = {marketplace_id: marketplace.id};
        this.iterator = new ListingIterator(async (prev_id, batch_size) => {
            const [products, metadata] = await Promise.all([
                Product.search(this.listingFilters, prev_id, batch_size),
                this.marketplace.listExportedProducts(prev_id, batch_size)
            ]);

            return products.map((product, i) =>
                ({product, metadata: metadata[i]})
            );
        });
    }

    async sendProducts(res) {
        if (!await FilesystemManager.exists(this.filepath)) {
            res.set("Content-Type", "text/plain");

            return res.status(400).send("Feed not generated");
        }

        res.set("Content-Type", "text/csv");

        await new Promise(resolve => res.sendFile(this.filepath, resolve));
    }

    async export() {
        this.setProgress({
            total: await Product.countSearch(this.listingFilters)
        });

        await this.csvGenerator.createWriteStream();
        await this.csvGenerator.write(dump_config.fields);

        for await (const data of this.iterator)
            await this.processProduct(data);

        await this.csvGenerator.finish();
    }

    async processProduct({product, metadata}) {
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

        const price = this.marketplace.priceRanges.addPercent(
            metadata.exported_price
        ) / 100;
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
            "Category ": categories?.[0],
            "Brand": brand,
            "Subcategory": categories?.[1],
            "Sub Sub Category ": categories?.[2],
            "Material": material,
            "Color": color,
            "Model": product.model || "",
            "Images": product.imageUrls.join(";"),
            "Currency": "EUR",
            "Price": price,
            "Description": metadata.exported_description,
            "Vintage": grade_rank > 1 ? "vintage" : "",
            "Condition": condition,
            "Inventory": +(product.status == "ACTIVE")
        };

        await this.csvGenerator.write(
            dump_config.fields.map(name => data[name] ?? "")
        );

        this.setProgress({progress: this.status.progress + 1});
    }
}

module.exports = VestiaireProductsManager;
