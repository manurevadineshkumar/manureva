const Storage = require("./Storage");

class UserStoreStorage extends Storage {
    static async getById(user_id, id) {
        return await Storage.query(
            `SELECT *
                FROM user_stores
                WHERE user_id = ? AND id = ?;`,
            user_id, id
        ).then(rows => rows[0] || null);
    }

    static async getByName(user_id, name) {
        return await Storage.query(
            `SELECT *
                FROM user_stores
                WHERE user_id = ? AND name = ?;`,
            user_id, name
        ).then(rows => rows[0] || null);
    }

    static async listForUser(user_id, prev_id, batch_size) {
        return await Storage.query(
            `SELECT *
                FROM user_stores
                WHERE user_id = ? AND id > ?
                LIMIT ?;`,
            user_id,
            prev_id,
            batch_size
        );
    }

    static async create({user_id, name, type}) {
        return await Storage.query(
            `INSERT
                INTO user_stores (user_id, name, type)
                VALUES (?, ?, ?);`,
            user_id, name, type
        ).then(res => res.insertId);
    }

    static async update(id, data) {
        return await Storage.query(
            `UPDATE user_stores
                SET ?
                WHERE id = ?`,
            data,
            id
        );
    }

    static async delete(id) {
        return await Storage.query(
            `DELETE
                FROM user_stores
                WHERE id = ?;`,
            id, id
        );
    }
}

module.exports = UserStoreStorage;
