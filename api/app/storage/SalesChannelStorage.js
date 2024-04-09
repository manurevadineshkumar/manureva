const Storage = require("./Storage");

class SalesChannelStorage extends Storage {
    static async listAll(prev_id, batch_size) {
        return await Storage.query(
            `SELECT *
                FROM sales_channels
                WHERE id > ?
                LIMIT ?;`,
            prev_id,
            batch_size
        );
    }

    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM sales_channels
                WHERE id = ?;`,
            id
        ).then(rows => rows[0] || null);
    }
}
module.exports = SalesChannelStorage;
