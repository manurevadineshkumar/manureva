const Storage = require("./Storage");

class OrderStorage extends Storage {
    static async create({
        product_id,
        user_id,
        price_eur,
        placement_date,
        channel_id,
    }) {
        return await Storage.query(
            `INSERT
                INTO orders
                SET ?;`,
            {product_id,
                user_id,
                price_eur,
                placement_date,
                channel_id,
            }
        ).then((result) => result.insertId);
    }

    static async countAll() {
        return await Storage.query(
            `SELECT
                COUNT(*) AS count
                FROM orders;`
        ).then((result) => result[0].count);
    }

    static async listAll(prev_id = 0, batch_size = 16) {
        const data = await Storage.query(
            `SELECT
                o.*,
                u.username AS username
                FROM orders o
                LEFT JOIN users u ON user_id = u.id
                WHERE o.id < ? ${prev_id ? "" : "OR 1"}
                ORDER BY o.id DESC
                LIMIT ?;`,
            prev_id,
            batch_size
        );

        return data.map(({user_id, username, ...result}) => ({
            ...result,
            user: {id: user_id, username},
        }));
    }

    static async listSoldOrders(prev_id = 0, batch_size = 16, user_id) {
        let queryParams = [user_id];

        let query = `SELECT o.id,
                        o.product_id,
                        o.user_id,
                        p.bought_price,
                        o.placement_date,
                        o.channel_id,
                        o.status,
                        o.comment_user
                    FROM orders o
                    INNER JOIN products p ON o.product_id = p.id
                    WHERE p.owner_id = ?`;

        if (prev_id > 0) {
            query += ` AND o.id < ?`;
            queryParams.push(prev_id);
        }
        query += ` ORDER BY o.id DESC
                LIMIT ?`;
        queryParams.push(batch_size);
        const data = await Storage.query(query, ...queryParams);
        return data.map(({user_id, username, ...result}) => ({
            ...result,
            user: {id: user_id, username},
        }));
    }

    static async listBoughtOrders(prev_id = 0, batch_size = 16, user_id) {
        const data = await Storage.query(
            `SELECT
                o.*,
                u.username AS username
                FROM orders o
                LEFT JOIN users u ON user_id = u.id
                WHERE (o.id ${prev_id ? "<" : ">"} ? AND user_id = ?)
                ORDER BY o.id DESC
                LIMIT ?;`,
            prev_id,
            user_id,
            batch_size
        );
        return data.map(({user_id, username, ...result}) => ({
            ...result,
            user: {id: user_id, username},
        }));
    }

    static async getByProductId(product_id) {
        const data = await Storage.query(
            `SELECT
                o.*,
                u.username AS username
                FROM orders o
                LEFT JOIN users u ON user_id = u.id
                WHERE product_id = ?;`,
            product_id
        );
        return data.map(({user_id, username, ...result}) => ({
            ...result,
            user: {id: user_id, username},
        }));
    }
    static async getById(order_id) {
        const data = await Storage.query(
            `SELECT
                o.*,
                u.username AS username
                FROM orders o
                LEFT JOIN users u ON user_id = u.id
                WHERE o.id = ?;`,
            order_id
        );

        return data[0]
            ? {
                ...data[0],
                user: {id: data[0].user_id, username: data[0].username},
            }
            : null;
    }

    static async updateById(id, data) {
        return await Storage.query(
            `UPDATE orders
                SET ?
                WHERE id = ?`,
            data,
            id
        );
    }

    static async getDocument(id, is_admin = false) {
        const field = is_admin ? "filename_admin" : "filename_user";
        const data = await Storage.query(
            `SELECT ?? FROM orders WHERE id = ?`,
            field,
            id
        );
        return data[0][field];
    }
    static async updateDocument(id, file_name, is_admin = false) {
        const column = is_admin ? "filename_admin" : "filename_user";

        return await Storage.query(
            `UPDATE orders
                SET ?? = ?
                WHERE id = ?`,
            column,
            file_name,
            id
        );
    }
}

module.exports = OrderStorage;
