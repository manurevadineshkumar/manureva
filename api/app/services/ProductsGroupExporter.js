const CSVGenerator = require("./CSVGenerator");

const dump_config = require("../const/korvin-dump.json");

const Product = require("../models/Product");

const FilesystemManager = require("../services/FilesystemManager");
const ListingIterator = require("./ListingIterator");

class ProductsGroupExporter {
    static MIN_INTERVAL = 60 * 1e3;

    constructor(products_group, batch_size = 1024) {
        this.productsGroup = products_group;
        this.products = new ListingIterator(
            (prev_id, batch_size) => Product.search(
                {group_id: this.productsGroup.id},
                prev_id,
                batch_size
            ),
            batch_size
        );
        this.csvGenerator = null;
    }

    async export(res = null) {
        res?.set("Content-Type", "text/csv");
        res?.set(
            "Content-Disposition",
            "attachment; filename=\"products.csv\""
        );

        if (
            this.productsGroup.lastDump
            && +this.productsGroup.lastDump + ProductsGroupExporter.MIN_INTERVAL
            > Date.now()
        )
            return await new Promise(resolve =>
                res?.sendFile(this.productsGroup.csvFilepath, resolve)
            );

        await FilesystemManager.touch(this.productsGroup.csvFilepath);

        this.csvGenerator = new CSVGenerator(this.productsGroup.csvFilepath);

        await this.csvGenerator.createWriteStream();

        if (res)
            this.csvGenerator.stream.pipe(res);

        await this.writeCsv();

        await this.productsGroup.update({last_dump: new Date});
    }

    static serializeProduct(product) {
        return {
            identifier: product.identifier,
            name: product.name,
            brand: dump_config.brands[product.brand.name] || product.brand.name,
        };
    }

    async writeCsv() {
        this.csvGenerator.write(dump_config.fields);

        for await (const product of this.products) {
            const data = ProductsGroupExporter.serializeProduct(product);

            this.csvGenerator.write(
                dump_config.fields.map(name => data[name] ?? "")
            );
        }

        await this.csvGenerator.finish();
    }
}

module.exports = ProductsGroupExporter;
