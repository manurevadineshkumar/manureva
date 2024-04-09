const axios = require("axios");

const ExportingTask = require("./ExportingTask");

const Product = require("../../models/Product");

const rebelle_const = require("../../const/rebelle-product.json");
const ProductHelper = require("../../business-services/product/helper/Product.helper");

class RebelleExporter extends ExportingTask {
    static MAX_QUEUE_SIZE = 1;

    static BASE_URL = process.env.REBELLE_URL;
    static EMAIL = process.env.REBELLE_EMAIL;
    static TOKEN = process.env.REBELLE_TOKEN;

    constructor(data) {
        super(data);

        this.serviceName = "rebelle";
    }

    request(endpoint, method, data) {
        return axios.request({
            headers: {
                "Authorization":
                    `Token token="${RebelleExporter.TOKEN}", ` +
                    `email="${RebelleExporter.EMAIL}"`
            },
            url: RebelleExporter.BASE_URL + endpoint,
            method,
            data
        }).then(res => {
            this.log(`REBELLE [${method}] result:`, res.data);
            return res.data;
        });
    }

    serializeProduct(product) {
        const retailPriceCents = ProductHelper.getEffectiveRetailPrice(product);
        return {
            "power_seller": {
                "title": product.name,
                "initial_title": product.name,
                "initial_description": product.getVerboseDescription(),
                "price": (Math.ceil(
                    (retailPriceCents / 100 * 1.2) / 10
                ) * 10) + "",
                "brand_id": rebelle_const.brand_ids[product.brand.name] + "",
                "external_id": product.id + "",
                "material_id": (rebelle_const.material_ids[
                    Object.values(product.materials)[0]?.name
                ] || rebelle_const.material_ids["OTHER"]) + "",
                "color_id": (rebelle_const.color_ids[
                    Object.values(product.colors)[0]?.name
                ] || rebelle_const.color_ids["OTHER"]) + "",
                "season_id": rebelle_const.season_id + "",
                "type_id": rebelle_const.type_ids[product.type.name] + "",
                "subtype_id": (rebelle_const.subtype_ids[product.subtype.name]
                    || rebelle_const.subtype_ids["OTHER"]) + "",
                "condition_id": rebelle_const.condition_ids[product.grade] + "",
                "images": product.imageUrls,
            }
        };
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

    /** @override ExportingTask.insertProductsBatch */
    async insertProductsBatch([product]) {
        this.log("REBELLE [POST]:", product.id);
        const serialized = this.serializeProduct(product);

        if (Object.values(serialized.power_seller).includes("undefined")) {
            this.log("REBELLE [POST] Failed because contains undefined:", product);
            return this.setProgress({failed: this.status.failed + 1});
        }

        const result = await this.request(
            "/api/v3/power_sellers",
            "POST",
            this.serializeProduct(product)
        );

        return result?.power_seller?.id;
    }

    /** @override ExportingTask.updateProductsBatch */
    async updateProductsBatch([product]) {
        this.log("REBELLE [PUT]:", product.id);
        const retailPriceCents = ProductHelper.getEffectiveRetailPrice(product);

        await this.request(
            `/api/v3/power_sellers/${product.id}`,
            "PUT",
            {
                power_seller: {
                    price: (Math.ceil(
                        (retailPriceCents / 100 * 1.2) / 10
                    ) * 10) + ""
                }
            }
        );

        return {
            [product.id]: product.id,
        };
    }

    /** @override ExportingTask.deleteProductsBatch */
    async deleteProductsBatch([product]) {
        this.log("REBELLE [DELETE]:", product.id);

        await this.request(
            `/api/v3/power_sellers/${product.id}`,
            "DELETE"
        );

        return {
            [product.id]: product.id,
        };
    }

    /** @override ExportingTask.getIdsMappings */
    getIdsMappings([product], external_id) {
        if (typeof external_id === "object" && external_id !== null) {
            return {[product.id]: Object.values(external_id)[0]};
        } else {
            return {[product.id]: external_id};
        }
    }
}

module.exports = RebelleExporter;
