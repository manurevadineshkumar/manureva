const CartStorage = require("../storage/CartStorage");
const ProductsGroup = require("./ProductsGroup");

class Cart {
    static CERTIFICATE_PRICE_CENTS = 1000;

    static PRODUCT_WEIGHT_GRAMS = 1000;

    constructor(data) {
        this.productsGroup = new ProductsGroup(data.products_group);
    }

    get userId() {
        return this.productsGroup.userId;
    }

    get productsCount() {
        return this.productsGroup.productsCount;
    }

    serialize() {
        return {
            products_group: this.productsGroup.serialize()
        };
    }

    static async create(user_id) {
        const data = await CartStorage.create({user_id});

        return new Cart(data);
    }

    static async getByUserId(id) {
        const data = await CartStorage.getByUserId(id);

        return data ? new Cart(data) : null;
    }

    async addProduct(product) {
        return await this.productsGroup.addProduct(product);
    }

    async removeProduct(product) {
        return await this.productsGroup.removeProduct(product);
    }

    /**
     * Get the total price of the cart with details
     * @param options {Object}
     * @param options.certificate_ids {Set} a set of products for which to add
     * authenticity certificates
     * @param options.shipping_type {Number} a shipping type
     * @param options.country {Country} a shipping country
     * @param options.coupons {Array} an array of coupons
     * @return {Promise<Object>}
     */
    async getPrices({
        certificate_ids,
        shipping_type,
        country,
        coupons: _
    }) {
        const products = await CartStorage.getTotalProductsPrice(this.userId);
        const certificates = Cart.CERTIFICATE_PRICE_CENTS
            * certificate_ids.size;
        const shipping = shipping_type == "DAP"
            ? await country.getShippingCosts({
                weight_grams: this.productsCount * Cart.PRODUCT_WEIGHT_GRAMS
            })
            : 0;
        const discount = 0;
        const total = products + certificates + shipping - discount;
        const vat = country.name == "France" ? total * .2 : null;

        return {
            products,
            certificates,
            shipping,
            vat,
            discount
        };
    }
}

module.exports = Cart;
