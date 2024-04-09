const Storage = require("./Storage");

class LoggerStorage extends Storage {
    static TABLENAME = {
        sessions: "log_sessions",
        modules: "log_modules",
        products: "log_products"
    };

    static async create(table_name, values) {
        return (await Storage.query(
            `INSERT INTO ?? SET ?;`,
            table_name,
            values
        )).insertId;
    }

    static async update(table_name, id, values) {

        return (await Storage.query(
            `UPDATE ?? SET ? WHERE id = ?;`,
            table_name,
            values,
            id
        )).affectedRows > 0;
    }

    static async delete(table_name, id) {
        return (await Storage.query(
            `DELETE FROM ?? WHERE id = (?);`,
            table_name,
            id
        )).affectedRows > 0;
    }

    static async getById(table_name, id) {
        return (await Storage.query(
            `SELECT * FROM ?? WHERE id = ?;`,
            table_name,
            id
        ))[0] || null;
    }

    static async get(table_name, prev_id, batch_size) {
        const session = await LoggerStorage.getById(table_name, prev_id);

        if (prev_id > 0)
            return await Storage.query(
                `SELECT * FROM ?? WHERE id < ? ORDER BY id DESC LIMIT ?;`,
                table_name,
                session?.id || 0,
                batch_size
            );
        return await Storage.query(
            `SELECT * FROM ?? ORDER BY id DESC LIMIT ?;`,
            table_name,
            batch_size
        );
    }

    static async getModulesBySessionId(prevId, batchSize, sessionId) {
        return await Storage.query(
            `SELECT * FROM ?? WHERE session_id = ? AND id > ? LIMIT ?;`,
            LoggerStorage.TABLENAME.modules,
            sessionId,
            prevId,
            batchSize
        );
    }

    static async getProductsBySessionId(prevId, batchSize, sessionId) {
        return await Storage.query(
            `SELECT *
                FROM ??
                WHERE session_id = ?
                AND id > ?
                LIMIT ?;`,
            LoggerStorage.TABLENAME.products,
            sessionId,
            prevId,
            batchSize
        );
    }

    static async getLogProductPrices(prevId, batchSize = 16, productId) {
        return await Storage.query(
            `SELECT *
                FROM ??
                WHERE product_id = ?
                AND id > ?
                LIMIT ?;`,
            LoggerStorage.TABLENAME.products,
            productId,
            prevId,
            batchSize
        );
    }

}

module.exports = LoggerStorage;
