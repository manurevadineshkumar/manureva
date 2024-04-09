const StripeCustomersStorage = require("../storage/StripeCustomersStorage");

class StripeCustomer {
    constructor(data) {
        this.id = +data.id;
        this.user_id = +data.user_id;
        this.stripe_customer_id = data.stripe_customer_id;
    }

    serialize() {
        return {
            user_id: +this.user_id,
            stripe_customer_id: this.stripe_customer_id
        };
    }

    static async create(user_id, stripe_customer_id) {
        const id = await StripeCustomersStorage.create(
            user_id,
            stripe_customer_id
        );

        return new StripeCustomer({id, user_id, stripe_customer_id});
    }

    static async getByUserId(user_id) {
        const data = await StripeCustomersStorage.getByUserId(user_id);

        if (!data) {
            return null;
        }

        return new StripeCustomer(data);
    }

    /**
     * Retrieve the stripe customer id from db
     * @param {*} user_id
     * @returns {Promise<string | null>}
     * Return the customer_id, or null if not found
     */
    static async getCustomerId(user_id) {
        const stripe_record = await StripeCustomer.getByUserId(user_id);

        if (!stripe_record) {
            return null;
        }

        return stripe_record.stripe_customer_id;
    }
}

module.exports = StripeCustomer;
