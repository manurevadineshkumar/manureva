const Storage = require("./Storage");

class CartStorage extends Storage {
    static parseCart(data) {
        if (!data)
            return null;

        if (data.products_group)
            data.products_group = JSON.parse(data.products_group);

        return data;
    }

    static async getByUserId(user_id) {
        return await Storage.query(
            `SELECT
                JSON_OBJECT(
                    'id', pg.id,
                    'user_id', pg.user_id,
                    'products_count', pg.products_count,
                    'is_system', pg.is_system,
                    'last_dump', pg.last_dump
                ) AS products_group
                FROM products_groups pg
                JOIN users u ON pg.id = cart_products_group_id
                WHERE pg.user_id = ?;`,
            user_id
        ).then(rows => CartStorage.parseCart(rows[0]) || null);
    }

    static async getTotalProductsPrice(user_id) {
        return await Storage.query(
            `SELECT SUM(
                CASE
                    WHEN p.wholesale_price_cents_discounted IS NOT NULL THEN p.wholesale_price_cents_discounted
                    ELSE p.wholesale_price_cents
                END
            ) AS count
            FROM products p
            JOIN products_group_products pgp ON p.id = pgp.product_id
            JOIN users u ON u.cart_products_group_id = pgp.products_group_id
            WHERE u.id = ?;`,
            user_id
        ).then(rows => rows[0].count);
    }

    static async create({user_id}) {
        await Storage.runTransaction(async query => {
            await query(
                `INSERT INTO products_groups (user_id) VALUES (?);`,
                user_id
            );
            await query(
                `UPDATE
                    users
                    SET cart_products_group_id = LAST_INSERT_ID()
                    WHERE id = ?;`,
                user_id
            );
        });

        return await CartStorage.getByUserId(user_id);
    }
}

module.exports = CartStorage;
