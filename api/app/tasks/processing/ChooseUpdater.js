const Product = require("../../models/Product");
const ProcessingTask = require("./ProcessingTask");
const dump_config = require("../../const/choose-dump.json");
const CSVGenerator = require("../../services/CSVGenerator");
const path = require("path");
const ProductHelper = require("../../business-services/product/helper/Product.helper");

class ChooseUpdater extends ProcessingTask {
    static FILEPATH = path.join(__dirname, "../../../data/choose.csv");

    constructor(data) {
        super(data);

        this.csvGenerator = new CSVGenerator(
            ChooseUpdater.FILEPATH
        );
    }

    /** @override ProcessingTask.countProducts */
    async listProducts(prev_id, count = 1024){

        return await Product.search({group_id: 50}, prev_id, count);
    }

    /** @override ProcessingTask.init */
    async init() {
        await this.csvGenerator.createWriteStream();

        await this.csvGenerator.write(dump_config.fields);
    }

    /**
     * Processes a product and generates data for CSV export.
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

        const colorNames = [];

        const productId = `${product.id}`.padStart(6, "0");

        for (let color of Object.values(product.colors)) {
            colorNames.push(color.name);
        }
        const color = colorNames.join(", ");

        const material = Object.values(product.materials)[0]?.name;

        const shopifyId = `${product.brand.name.slice(0,3).toLowerCase()}`
            + "-" + `${productId}`;

        const type = product.type.name[0].toUpperCase()
            + product.type.name.slice(1);

        const availableStock = product.status === "ACTIVE"
            || product.status === "LOCKED" ? 1 : 0;

        const countryOfOrigin = {
            "BALENCIAGA": "France",
            "BOTTEGA VENETA": "Italie",
            "BURBERRY": "UK",
            "CELINE": "France",
            "CHANEL": "France",
            "CHRISTIAN DIOR": "France",
            "FENDI": "Italie",
            "GUCCI": "Italie",
            "HERMES": "France",
            "LOEWE": "Espagne",
            "LOUIS VUITTON": "France",
            "PRADA": "Italie",
            "SALVATORE FERRAGAMO": "Italie",
            "STELLA MCCARTNEY": "UK"
        };

        let data;

        if (
            !product.retailPriceCents
            || !color || !material
        ) {
            data = {"SKU": product.id, "Inventory": 0};
        } else {

            const grade_rank = "SABC".indexOf(product.grade[0]);

            const size = JSON.stringify(product.size).replace(/[{}]/g, "");

            let discount;
            if (product.boughtPriceDiscounted) {
                discount = Math.ceil(
                    (product.boughtPrice - product.boughtPriceDiscounted)
                        / product.boughtPrice * 100);
            } else {
                discount = "";
            }

            const condition = [
                "Jamais porté",
                "Très bon état",
                "Bon état",
                "Satisfaisant"
            ][grade_rank] ?? "Bon état";

            const retailPrice = ProductHelper.getEffectiveRetailPrice(product) / 100;
            const wholesalePrice = ProductHelper.getEffectiveWholesalePrice(product) / 100;
            const purchasePrice = ProductHelper.getEffectivePurchasePrice(product) / 100;

            data = {
                "Nom Produit": product.name,
                "Type de produit": type,
                "Marque": product.brand.name,
                "Pointure": product.type.name === "shoes" ? size : "",
                "Dimension": product.type.name !== "shoes" ? size : "",
                "Couleur": color,
                "Matière": material,
                "Etat": condition,
                "Boite d'origine OUI/NON": product.hasBox ? "OUI" : "NON",
                "Certificat d'authentification OUI/NON": "OUI",
                "Description": "",
                "Url": `http://s3cond.com/products/${shopifyId}`,
                "Pays de Fabrication": countryOfOrigin[product.brand.name],
                "Stock": availableStock,
                "Variant_id": "",
                "Sku": product.id,
                "Base Price": purchasePrice,
                "Retail Price": retailPrice,
                "Wholesale Price": wholesalePrice,
                "Status": product.status,
                "Prix après remise TTC": "",
                "Discount (%) recommandé": "",
                "Discount Korvin": discount ? `${discount}%` : "",
                "Prix Choose TTC recommandé": "",
                "Prix de rétrocession HT": "",
                "Frais de port": "Offerts"
            };

            this.log(`Writing product ${product.id} to csv...`);

            await this.csvGenerator.write(
                dump_config.fields.map(name => data[name] ?? "")
            );
        }
    }

    /** @override ProcessingTask.finish */
    async finish() {
        await this.csvGenerator.finish();
    }
}

module.exports = ChooseUpdater;
