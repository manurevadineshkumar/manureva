const Storage = require("./Storage");

class StripeCustomersStorage extends Storage {
    static async create(user_id, stripe_customer_id) {
        return (await Storage.query(
            `INSERT
                INTO stripe_customers (user_id, stripe_customer_id)
                VALUES (?, ?);`,
            user_id, stripe_customer_id
        )).insertId;
    }

    static async getByUserId(user_id) {
        return await Storage.query(
            `SELECT *
                FROM stripe_customers
                WHERE user_id = ?;`,
            user_id
        ).then(rows => rows[0] || null);
    }

    static async listAll() {
        return await Storage.query(
            `SELECT * FROM stripe_customers;`
        );
    }
}

module.exports = StripeCustomersStorage;
