const Product = require("../models/Product");
const Cart = require("../models/Cart");
const User = require("../models/User");
const Country = require("../models/Country");

const ProductsGroupExporter = require("../services/ProductsGroupExporter");
const StripeApi = require("../services/StripeApi");

const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

class Route {
    static async #getCart(user, user_id = null) {
        await user.assertPermission(PERMISSIONS.CART_LIST_PRODUCTS);

        const target_user = await User.getById(user_id || user.id);

        if (!target_user)
            throw new HttpError(404, "no such user");

        if (user.id !== target_user.id)
            await user.assertPermission(PERMISSIONS.CART_LIST_ALL);

        return await Cart.getByUserId(target_user.id)
            || await Cart.create(target_user.id);
    }

    static async getCartByUserId({user, path: {user_id}}) {
        return (await Route.#getCart(user, user_id)).serialize();
    }

    static async getCartTotal({
        user,
        query: {
            certificate_ids,
            shipping_type,
            country_id,
            coupon_codes
        }
    }) {
        const cart = await Route.#getCart(user);
        const certificates_ids_set = new Set(
            certificate_ids
                .split("-")
                .map(v => +v)
                .filter(n => n && !isNaN(n))
        );
        const coupons = coupon_codes.split("-");

        const country = await Country.getById(country_id);

        if (!country)
            throw new HttpError(404, "no such country");

        return await cart.getPrices({
            certificate_ids: certificates_ids_set,
            shipping_type,
            country,
            coupons
        });
    }

    static async createCartPayment({
        user,
        body: {
            certificate_ids,
            shipping_type,
            country_id,
            // coupon_codes
        }
    }) {
        const cart = await Route.#getCart(user);
        const certificates_ids_set = new Set(certificate_ids);
        const coupons = [];

        const country = await Country.getById(country_id);

        if (!country)
            throw new HttpError(404, "no such country");

        const prices = await cart.getPrices({
            certificate_ids: certificates_ids_set,
            shipping_type,
            country,
            coupons
        });

        return await StripeApi.createPaymentLink(user, [
            {
                id: "products",
                name: "Products",
                description: cart.productsCount
                    + " product" + (cart.productsCount == 1 ? "" : "s"),
                price: prices.products
            },
            {
                id: "certificates",
                name: "Authenticity certificates",
                description: "for " + certificates_ids_set.size
                    + " product" + (certificates_ids_set.size == 1 ? "" : "s"),
                price: prices.certificates
            },
            {
                id: "shipping",
                name: "Shipping",
                description: `to ${country.name}`,
                price: prices.shipping
            },
            ...(prices.vat ? [{
                id: "vat",
                name: "VAT",
                description: `in ${country.name}`,
                price: prices.vat
            }] : [])
        ]);
    }

    static async getCartPayment({user, path: {hash}}) {
        return await StripeApi.retrievePayment(user, hash);
    }

    static async listCartByUserId({
        user,
        path: {user_id},
        query: {prev_id, batch_size}
    }) {
        const cart = await Route.#getCart(user, user_id);

        const products = await cart.productsGroup.listProducts({
            prev_id,
            batch_size
        });

        return {
            items: await Promise.all(
                products.map(
                    async product => await product.serializeForUser(user)
                )),
            ...(products.length < batch_size ? {is_last_batch: 1} : {})
        };
    }

    static async addProductToCart({user, path: {product_id}}) {
        await user.assertPermission(PERMISSIONS.CART_ADD_PRODUCT);

        let cart = await Cart.getByUserId(user.id);

        if (!cart)
            cart = await Cart.create(user.id);

        const product = await Product.getById(product_id);

        if (!product)
            throw new HttpError(404, "no such product");

        if (product.status !== "ACTIVE")
            throw new HttpError(
                400,
                "Only active products can be added to cart"
            );

        await cart.addProduct(product);

        return {"success": true};
    }

    static async removeProductFromCart({user, path: {product_id}}) {
        await user.assertPermission(PERMISSIONS.CART_REMOVE_PRODUCT);

        const cart = await Cart.getByUserId(user.id);

        const product = await Product.getById(product_id);

        if (!product)
            throw new HttpError(404, "no such product");

        await cart.removeProduct(product);

        return {"success": true};
    }

    static async downloadCartCSV({res, path: {user_id}, query: {token}}) {
        const cart = await Cart.getByUserId(user_id);

        if (!cart)
            throw new HttpError(404, "no such cart");

        if (cart.productsGroup.token != token)
            throw new HttpError(401, "invalid token");

        const exporter = new ProductsGroupExporter(cart.productsGroup);

        await exporter.export(res);
    }
}

module.exports = Route;
