const path = require("path");

const ProcessingTask = require("./ProcessingTask");

const CSVGenerator = require("../../services/CSVGenerator");

const dump_config = require("../../const/maison-guava-dump.json");
const {default: axios} = require("axios");

const airtableVariantAPI = process.env.GUAVA_AIRTABLE_VARIANT;
const airtableStockAPI = process.env.GUAVA_AIRTABLE_STOCK;
const guavaToken = process.env.GUAVA_AIRTABLE_ACCESS_TOKEN;

class MaisonGuavaUpdater extends ProcessingTask {
    static FILEPATH = path.join(__dirname, "../../../data/guava.csv");

    constructor(data) {
        super(data);

        this.guavaProductStockSellers = [];
        this.csvGenerator = new CSVGenerator(MaisonGuavaUpdater.FILEPATH);
    }

    /** @override ProcessingTask.countProducts */
    async listProducts(prev_id, _count = 1024) {
        const filter = "?filterByFormula={Quantity}>0";
        let offset = "";
        const products = [];

        while (offset !== null) {
            const guavaProductVariant = await axios.request({
                headers: {"Authorization": `Bearer ${guavaToken}`},
                url: airtableVariantAPI + filter + offset,
                method: "get"
            });

            if (guavaProductVariant.data.offset) {
                offset = "&offset=" + guavaProductVariant.data.offset;
            } else {
                offset = null;
            }

            products.push(...guavaProductVariant.data.records);
        }

        return products;
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        const allProducts = await this.listProducts(0);

        return allProducts.length;
    }

    async setProductSellers() {
        let offset = "";
        const filters =
            "?fields[]=Seller&fields[]=TVA&fields[]=sku produit&filterByFormula={Quantity}>0&fields[]=Quantity";

        while (offset !== null) {
            const guavaProductStock = await axios.request({
                headers: {"Authorization": `Bearer ${guavaToken}`},
                url: airtableStockAPI + filters + offset,
                method: "get"
            });

            if (guavaProductStock.data.offset) {
                offset = "&offset=" + guavaProductStock.data.offset;
            } else {
                offset = null;
            }

            this.guavaProductStockSellers.push(...guavaProductStock.data.records.map(stock => {
                return {seller: stock.fields.Seller, tva: stock.fields.TVA, sku: stock.fields["sku produit"]};
            }));

        }
    }

    /** @override ProcessingTask.init */
    async init() {
        await this.csvGenerator.createWriteStream();

        await this.csvGenerator.write(dump_config.fields);

        await this.setProductSellers();
    }

    /**
     * Processes a product and generates data for CSV generation.
     * @override ProcessingTask.processProduct
     * @param {Object} product - The product to be processed. The product IS NOT a korvin product
     * @returns {Promise<void>} - A promise that resolves when the processing is complete.
     */
    async processProduct(product) {

        const stockSeller = this.guavaProductStockSellers
            .find(stock => stock.sku[0] === product.fields.sku[0]);
        const images = product.fields["Images (from Produit)"]?.map(image => image.url) ?? [];
        const brand = product.fields["Brand  (from Produit)"]
            ? product.fields["Brand  (from Produit)"][0]
            : "";
        const data = {
            sku: product.fields.sku[0],
            name: product.fields.Name,
            brand: brand,
            size: product.fields.Size,
            quantity: product.fields.Quantity,
            retailPrice: product.fields.PDV,
            category: product.fields["Catégorie (from Produit)"].join(","),
            "image-0": images[0],
            "image-1": images[1],
            "image-2": images[2],
            "image-3": images[3],
            margin: product.fields.Marge,
            vendorType: stockSeller?.seller[0],
            TVA: stockSeller?.tva,
        };

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

module.exports = MaisonGuavaUpdater;
