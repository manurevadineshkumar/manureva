const Airtable = require("airtable");

const Utils = require("../../services/Utils");

const ProductHelper = require("../../business-services/product/helper/Product.helper");

const ExportingTask = require("./ExportingTask");

const Product = require("../../models/Product");

class AirtableExporter extends ExportingTask {
    static MIN_REQUEST_INTERVAL = 100;

    static MAX_QUEUE_SIZE = 10;

    constructor(data) {
        super(data);

        this.serviceName = "airtable:" + (this.params.seller || "korvin");
        this.base = new Airtable({
            apiKey: this.params.access_token
        }).base(this.params.base_id);
    }

    serializeProduct(product) {
        const id = product.externalIds[this.serviceName]?.id;
        const formatTag = tag => Utils.capitalizeAll(tag.replaceAll("_", " "));
        const retailPrice = ProductHelper.getEffectiveRetailPrice(product) / 100;
        const wholesalePrice = ProductHelper.getEffectiveWholesalePrice(product) / 100;

        return {
            ...(id ? {id} : {}),
            fields: {
                "ID":              product.identifier,
                "Available?":      product.status == "ACTIVE",
                "Name":            product.name,
                "Original URL":    product.originalUrl,
                "Model":           product.model,
                "Vendor":          product.vendor,
                "Original Name":   product.originalName,
                "Bought Price":    product.boughtPrice,
                "Bought Currency": product.boughtCurrency,
                "Retail Price":    retailPrice,
                "Wholesale Price": wholesalePrice,
                "Grade":           product.grade,
                "Size":            Object.entries(product.size).map(it =>
                    it.join(": ")
                ).join(", "),
                "Color(s)":        Object.values(product.colors)
                    .map(({name}) => formatTag(name)),
                "Material(s)":     Object.values(product.materials)
                    .map(({name}) => formatTag(name)),
                ...(id ? {} : {"Images": product.imageUrls.map(url => ({url}))})
            }
        };
    }

    getProductGroupName(product) {
        return product.brand.name;
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await Product.countUpdatedForService(
            this.serviceName,
            {type_id: this.params.type_id}
        );
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count) {
        return await Product.listUpdatedForService(
            this.serviceName,
            {type_id: this.params.type_id},
            prev_id,
            count
        );
    }

    /** @override ExportingTask.insertProductsBatch */
    async insertProductsBatch(products, brand) {
        await this.waitForNextRequest();

        return await this.base(brand).create(
            products.map(product => this.serializeProduct(product)),
            {typecast: true}
        );
    }

    /** @override ExportingTask.updateProductsBatch */
    async updateProductsBatch(products, brand) {
        await this.waitForNextRequest();

        return await this.base(brand).update(
            products.map(product => this.serializeProduct(product)),
            {typecast: true}
        );
    }

    /** @override ExportingTask.getIdsMappings */
    getIdsMappings(products, result) {
        return Object.fromEntries(products.map((product, i) => [
            product.id,
            result?.[i]?.id || null
        ]));
    }
}

module.exports = AirtableExporter;
