const ProcessingTask = require("./ProcessingTask");

const PriceManager = require("../../services/PriceManager");
const Translator = require("../../services/Translator");
const Utils = require("../../services/Utils");

const Product = require("../../models/Product");
const Order = require("../../models/Order");

const Tag = require("../../models/Tag");
const LogProduct = require("../../models/LogProduct");

const title_config = require("../../const/title.json");

/**
 * @class ProductsUpdater
 * This task is responsible for updating the products in the database.
 * It updates the product's name, model, and prices.
 * It also updates the `new` tag.
 * If the force_all parameter is set to true, it will update all products.
 * If not, it will only update the available products.
 */
class ProductsUpdater extends ProcessingTask {
    constructor(data) {
        super(data);
    }

    /** @override ProcessingTask.countProducts */
    async countProducts() {
        return this.params.force_all
            ? await Product.countAll()
            : await Product.countAvailable();
    }

    /** @override ProcessingTask.listProducts */
    async listProducts(prev_id, count = 1024) {
        return this.params.force_all
            ? await Product.listAll(prev_id, count)
            : await Product.listAvailable(prev_id, count);
    }

    async updateStatusOrder(product_id) {
        const order = await Order.getById(product_id);
        if (!order || this.lastOrder === true) {
            return;
        }

        if (order.status === "DELIVERED" && order.korvin_reception_date) {
            const now = new Date();
            const diffTime = Math.abs(now - order.korvin_reception_date);
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 15)
                await order.update({status: "WAITING_FOR_PAYMENT"});
        }
    }

    /**
     * Processes a product by updating its status, prices, and name.
     * @override ProcessingTask.processProduct
     * @param {Product} product - The product to be processed.
     * @returns {Promise<void>} - A promise that resolves when the product processing is complete.
     */
    async processProduct(product) {
        if (product.status === "SOLD")
            await this.updateStatusOrder(product.id);

        const {
            purchase_price_cents,
            purchase_price_cents_discounted,
            retail_price_cents,
            retail_price_cents_discounted,
            wholesale_price_cents,
            wholesale_price_cents_discounted
        } = await PriceManager.computePrices({product});

        let name;
        let model;
        if (product.ownerId === 7) { // a.k.a. Reclo
            model = await Translator.getModelByTitle(product.originalName) || null;

            const nameString = [
                model || product.brand.name.toLocaleLowerCase(),
                title_config.subtypes[product.subtype?.name] || product.subtype?.name
            ].filter(Boolean).join(" ");
            name = Utils.capitalizeAll(nameString);
        } else {
            model = null;
            name = Utils.capitalizeAll(product.originalName);
        }

        if (
            purchase_price_cents !== null
            && purchase_price_cents !== product.purchasePriceCents
        ) {
            await LogProduct.create(
                this.group.logger.session.id,
                product.id,
                "price_updated",
                purchase_price_cents
            );
            this.group.updatedProductsCount++;
        }

        if (
            purchase_price_cents_discounted !== null
            && purchase_price_cents_discounted !== product.purchasePriceCentsDiscounted
        ) {
            await LogProduct.create(
                this.group.logger.session.id,
                product.id,
                "price_updated",
                purchase_price_cents_discounted
            );
            this.group.updatedProductsCount++;
        }

        this.log(
            "Updating product: ", product.id, name, model, purchase_price_cents,
            purchase_price_cents_discounted, retail_price_cents, retail_price_cents_discounted,
            wholesale_price_cents, wholesale_price_cents_discounted
        );

        await product.update({
            name,
            model,
            purchase_price_cents,
            purchase_price_cents_discounted,
            retail_price_cents,
            retail_price_cents_discounted,
            wholesale_price_cents,
            wholesale_price_cents_discounted
        });

        this.setProgress({progress: this.status.progress + 1});
    }

    async finish() {
        await Tag.updateNewTag();
    }
}

module.exports = ProductsUpdater;
