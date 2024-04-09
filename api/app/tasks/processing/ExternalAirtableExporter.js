const Utils = require("../../services/Utils");
const ProductHelper = require("../../business-services/product/helper/Product.helper");

const AirtableExporter = require("./AirtableExporter");
const Product          = require("../../models/Product");

class ExternalAirtableExporter extends AirtableExporter {
    constructor(data) {
        super(data);
    }

    /** @override AirtableExporter.serializeProduct */
    serializeProduct(product) {
        const id = product.externalIds[this.serviceName]?.id;
        const formatTag = tag => Utils.capitalizeAll(tag.replaceAll("_", " "));
        const wholesalePriceCents = ProductHelper.getEffectiveWholesalePrice(product);

        return {
            ...(id ? {id} : {}),
            fields: {
                "ID":                  product.identifier,
                "Available?":          product.status == "ACTIVE",
                "Brand":               product.brand.name,
                "Name":                product.name,
                "Model":               product.model,
                "Type":                product.type.name,
                "Subtype":             product.subtype?.name,
                "Grade":               product.grade,
                "Size":                Object.entries(product.size).map(it =>
                    it.join(": ")
                ).join(", "),
                "Color(s)":            Object.values(product.colors)
                    .map(({name}) => formatTag(name)),
                "Material(s)":         Object.values(product.materials)
                    .map(({name}) => formatTag(name)),
                "Has serial number?":  !!product.hasSerial,
                "Has guarantee card?": !!product.hasGuaranteeCard,
                "Has box?":            !!product.hasBox,
                "Has dust bag?":       !!product.hasStorageBag,
                "Images":              product.imageUrls.map(url => ({url})),
                "Wholesale Price": Math.round(
                    wholesalePriceCents / 1e2 / 10
                ) * 10
            }
        };
    }

    getProductGroupName(product) {
        return product.brand.name;
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await Product.countUpdatedForService(this.serviceName, {});
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count) {
        return await Product.listUpdatedForService(
            this.serviceName,
            {},
            prev_id,
            count
        );
    }

    /** @override ExportingTask.insertProductsBatch */
    async insertProductsBatch(products, _brand) {
        await this.waitForNextRequest();

        return await this.base("PRODUCTS").create(
            products.map(product => this.serializeProduct(product)),
            {typecast: true}
        );
    }

    /** @override ExportingTask.updateProductsBatch */
    async updateProductsBatch(products, _brand) {
        await this.waitForNextRequest();

        return await this.base("PRODUCTS").update(
            products.map(product => this.serializeProduct(product)),
            {typecast: true}
        );
    }
}

module.exports = ExternalAirtableExporter;
