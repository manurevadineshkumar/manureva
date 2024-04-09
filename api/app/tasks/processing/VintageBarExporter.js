const axios = require("axios");

const ExportingTask = require("./ExportingTask");

const Product = require("../../models/Product");

const tvb_const = require("../../const/tvb-dump.json");
const ProductHelper = require("../../business-services/product/helper/Product.helper");
const SlackLogger = require("../../services/SlackLogger");

class VintageBarExporter extends ExportingTask {
    static MIN_REQUEST_INTERVAL = 5000;

    static MAX_QUEUE_SIZE = 125;

    static BASE_URL = process.env.VINTAGE_BAR_URL;

    static TOKEN = process.env.VINTAGE_BAR_TOKEN;

    constructor(data) {
        super(data);

        this.serviceName = "vintage-bar";

        this.deleteCount = 0;
        this.successfulDeleteCount = 0;
    }

    request(endpoint, method, data) {
        console.info(`[VintageBarExporter] ${method} ${endpoint} ${JSON.stringify(data)}`);
        if (process.env.NODE_ENV !== "production") {
            console.info("[VintageBarExporter] request mock in dev:");
            return {requestId: 0};
        }

        return axios.request({
            headers: {
                "Api-Key": VintageBarExporter.TOKEN
            },
            url: VintageBarExporter.BASE_URL + endpoint,
            method,
            data
        }).then(res => {
            this.log(`TVB [${method}] result:`, res.data);
            return res.data;
        });
    }

    static serializeProduct(product, is_initial = true) {
        const retailPriceCents = ProductHelper.getEffectiveRetailPrice(product);
        const category = tvb_const.categories[product.type.name]
            || "Accessories";
        const condition = (grade => {
            if (grade[0] == "S")
                return "New, with tags";

            if ("AB".includes(grade[0]))
                return "Excellent";

            if (grade[0] == "D")
                return "Worn with love";

            return "Good but used";
        })(product.grade);
        const size = ["Shoes", "Clothing"].includes(category)
            ? Object.entries(product.size).find(it =>
                it[0] == "Manufacturer size"
            )?.[1]
            : null;
        const price = Math.ceil(retailPriceCents * 1.25 / 100);

        return {
            sku: "" + product.id,
            title: product.name,
            description: product.getVerboseDescription(),
            main_image: product.imageUrls[0],
            ...(is_initial
                ? {additional_images: product.imageUrls.slice(1).join(",")}
                : {}
            ),
            stock: 1,
            currency: "EUR",
            price: is_initial
                ? Math.ceil(price / 5) * 5
                : Math.ceil(Math.trunc(price * .9) / 5) * 5,
            brand: product.brand.name,
            category,
            ...(size ? {size} : {}),
            condition,
            color: Object.values(product.colors)
                .map(({name}) => tvb_const.colors[name])
                .filter(Boolean)
                .join("/") || "Multicolor",
            material: Object.values(product.materials)
                .map(({name}) => tvb_const.materials[name])
                .filter(Boolean)
                .join("/") || "Other"
        };
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return await Product.countUpdatedForService(this.serviceName, {});
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count) {
        return await Product.listUpdatedForService(
            this.serviceName, {}, prev_id, count
        );
    }

    async getRequestStatus(request_id) {
        const MAX_ATTEMPTS = 60;
        const DELAY = 1000;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; ) {
            await new Promise(resolve => setTimeout(resolve, DELAY));

            this.log(`TVB [getRequestStatus] ${request_id} attempt ${attempt} / ${MAX_ATTEMPTS}`);
            try {
                return await this.request(
                    "/request/status?requestId=" +
                        encodeURIComponent(request_id),
                    "GET"
                );
            } catch {
                attempt++;
            }
        }

        return null;
    }

    /** @override ExportingTask.insertProductsBatch */
    async insertProductsBatch(products, _group_name) {
        this.log("TVB [POST]:", products.map(product => product.id));
        const {requestId: request_id} = await this.request(
            "/products",
            "POST",
            products.map(product =>
                VintageBarExporter.serializeProduct(product)
            )
        );

        await this.getRequestStatus(request_id);

        return await this.updateProductsBatch(products);
    }

    /** @override ExportingTask.updateProductsBatch */
    async updateProductsBatch(products, _group_name) {
        this.log("TVB [PUT]:", products.map(product => product.id));
        const {requestId: request_id} = await this.request(
            "/products",
            "PUT",
            products.map(product =>
                VintageBarExporter.serializeProduct(product, false)
            )
        );

        return await this.getRequestStatus(request_id);
    }

    /** @override ExportingTask.deleteProductsBatch */
    async deleteProductsBatch(products, _group_name) {
        this.log("TVB [DELETE]:", products.map(product => product.id));
        const responseData = await this.request(
            "/products",
            "DELETE",
            products.map(product => product.id)
        );

        Object.entries(responseData).forEach(([_id, verdict]) => {
            this.deleteCount++;
            if (verdict.toLocaleLowerCase().startsWith("success")) {
                this.successfulDeleteCount++;
            }
        });

        return responseData;
    }

    /** @override ExportingTask.getIdsMappings */
    getIdsMappings(products, result) {
        return Object.fromEntries(products.map(product => {
            const verdict = result[product.id];

            if (!verdict || verdict.toLocaleLowerCase().startsWith("fail:"))
                return [product.id, null];

            return [product.id, verdict];
        }));
    }

    /** @override ExportingTask.finish */
    async finish() {
        await super.finish();

        await SlackLogger.sendMessage({
            channel_id: process.env.SLACK_LOGS_CHANNEL_ID,
            text: `[${new Date().toUTCString()}] Exporting to *${this.serviceName}* finished.\n`
                + `\t- ${this.deleteCount} products to delete\n`
                + `\t- ${this.successfulDeleteCount} products successfully deleted.`
        });
    }
}

module.exports = VintageBarExporter;
