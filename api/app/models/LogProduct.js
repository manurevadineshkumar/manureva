const LoggerStorage = require("../storage/LoggerStorage");
const Product = require("./Product");
const HttpError = require("../errors/HttpError");

class LogProduct {

    static TABLENAME = LoggerStorage.TABLENAME.products;

    constructor(data) {
        this.id = +data.id;
        this.sessionId = +data.session_id;
        this.eventType = data.event_type;
        this.newPrice = +data.new_price;
        this.productId = +data.product_id;
    }

    serialize() {
        return {
            id: this.id,
            session_id: this.sessionId,
            event_type: this.eventType,
            new_price: this.newPrice,
            product_id: this.productId
        };
    }

    static async getById(id) {
        const product = await LoggerStorage.getById(LogProduct.TABLENAME, id);

        if (!product) {
            throw new HttpError(404, `Product with id ${id} not found`);
        }

        return new LogProduct(product);
    }

    static async list(prevId = 0, batchSize = 8) {
        const products = await LoggerStorage.get(
            LogProduct.TABLENAME, prevId, batchSize + 1
        );

        return {
            items: products
                .slice(0, batchSize)
                .map(product => new LogProduct(product).serialize()),
            ...(products.length < batchSize + 1 ? {is_last_batch: 1} : {})
        };
    }

    static async listBySessionId(prevId = 0, batchSize = 16, sessionId) {
        const products = (await LoggerStorage.getProductsBySessionId(
            prevId,
            batchSize,
            sessionId
        )).map(product => (new LogProduct(product)).serialize());

        const serializedProducts = await Promise.all(
            products.map(async (product) => {
                return {
                    log: product,
                    product: (await Product.getById(
                        product.product_id
                    )).serialize()
                };
            })
        );

        return {
            items: serializedProducts,
            ...(serializedProducts.length < batchSize
                ? {is_last_batch: 1}
                : {})
        };
    }

    static async create(sessionId, productId, eventType, newPrice) {
        return await LoggerStorage.create(
            LoggerStorage.TABLENAME.products,
            {
                session_id: sessionId,
                product_id: productId,
                event_type: eventType,
                new_price: newPrice
            }
        );
    }

    static async getLogProductPrices(prevId, batchSize = 16, productId) {
        const prices = await LoggerStorage.getLogProductPrices(
            prevId,
            batchSize,
            productId
        );

        return {
            items: prices,
            ...(prices.length < batchSize ? {is_last_batch: 1} : {})
        };
    }
}

module.exports = LogProduct;
