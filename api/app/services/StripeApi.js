const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const ProductsGroup = require("../models/ProductsGroup");
const Order = require("../models/Order");

const OrderHandler = require("./OrderHandler");

const HttpError = require("../errors/HttpError");

const stripe_fields = require("../const/stripe-fields.json");
const StripeCustomer = require("../models/StripeCustomer");

const BACKOFFICE_URL = process.env.NODE_ENV == "production"
    ? "https://backoffice.korvin.io"
    : "http://127.0.0.1:8383";

class StripeApi {
    static WHOLESALE_CHANNEL = 7;

    static BATCH_SIZE = 25;

    /**
     * Create a customer on stripe API
     * @param {*} user
     * @returns {Promise<string>} The customer id
     */
    static async createCustomer(user) {
        let customer;

        try {
            customer = await stripe.customers.create({
                email: user.email,
                metadata: {user_id: user.id}
            });
        } catch (error) {
            console.error("Stripe API call failed", error);
            throw new HttpError(500, error.message);
        }

        return customer.id;
    }

    static async #getOrCreateCustomerId(user) {
        let customer_id = await StripeCustomer.getCustomerId(user.id);

        if (!customer_id) {
            customer_id = await StripeApi.createCustomer(user);
            await StripeCustomer.create(user.id, customer_id);
        }

        return customer_id;
    }

    static async listCustomerPaymentMethods(user) {
        const customer_id = await StripeApi.#getOrCreateCustomerId(user);

        let payment_methods;
        try {
            payment_methods = await stripe.customers
                .listPaymentMethods(customer_id);
        } catch (error) {
            console.error("Stripe API call failed", error);
            throw new HttpError(500, error.message);
        }

        return payment_methods.data;
    }

    static async addCustomerPaymentMethod(user) {
        const customer_id = await StripeCustomer.getCustomerId(user.id);

        return await StripeApi.#createCheckoutSessionSetup(customer_id);
    }

    static async deleteCustomerPaymentMethod(pm_id) {
        try {
            return await stripe.paymentMethods.detach(pm_id);
        } catch (error) {
            console.error("Stripe API call failed", error);
            throw new HttpError(500, error.message);
        }
    }

    static async #createCheckoutSessionSetup(customer_id) {
        let session;
        try {
            session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "setup",
                customer: customer_id,
                success_url: `${BACKOFFICE_URL}/profile`,
                cancel_url: `${BACKOFFICE_URL}/profile`
            });
        } catch (error) {
            console.error("Stripe API call failed", error);
            throw new HttpError(500, error.message);
        }

        return {url: session.url};
    }

    static async createPaymentLink(user, prices) {
        let customer_id = await StripeApi.#getOrCreateCustomerId(user);

        const items = [];

        for (const {id, name, description, price} of prices) {
            if (price <= 0)
                continue;

            items.push(await stripe.products.create({
                name,
                description,
                images: [
                    "https://backoffice.korvin.io/img/payment/"
                        + encodeURIComponent(id) + ".png"
                ],
                metadata: {user_id: user.id},
                default_price_data: {
                    currency: "eur",
                    unit_amount: price
                }
            }));
        }

        const line_items = items.map(product => ({
            price: product.default_price,
            quantity: 1
        }));

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: line_items,
            success_url: stripe_fields.redirect_url,
            customer: customer_id,
            metadata: {user_id: user.id}
        });

        return session;
    }

    static async retrievePayment(user, hash) {
        let payment;

        try {
            payment = await stripe.checkout.sessions.retrieve(hash);
        } catch (err) {
            throw new HttpError(400, err.raw?.message || "payment failed");
        }

        if (payment.status === "open")
            throw new HttpError(400, "payment is not finished");
        if (payment.status === "expired")
            throw new HttpError(400, "payment has expired");
        if (payment.status !== "complete")
            throw new HttpError(
                400,
                "payment is not completed, please contact support"
            );

        const group = await ProductsGroup.getById(user.cartProductsGroupId);

        if (!group)
            throw new HttpError(404, "Product group not found");

        const items = [];
        const failed_products = [];

        for await (const batch of group.iterateProductsBatch({
            batch_size: StripeApi.BATCH_SIZE
        })) {
            await Promise.all(batch.map(async product => {
                try {
                    const order = await Order.create({
                        product,
                        user,
                        channel_id: StripeApi.WHOLESALE_CHANNEL
                    });

                    await OrderHandler.dispatch(order);
                    await product.update({status: "SOLD"});
                } catch (error) {
                    return failed_products.push(product);
                }

                items.push(product);
            }));
        }

        await group.removeProductIds(items.map(product => product.id));

        return {
            products_count: group.productsCount,
            failed_products
        };
    }
}

module.exports = StripeApi;
