const Storage = require("./Storage");

class TypeStorage extends Storage {
    static async create(name) {
        return (await Storage.query(
            `INSERT
                INTO types (name)
                VALUES (?);`,
            name
        )).insertId;
    }

    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM types
                WHERE id = ?;`,
            id
        ).then(rows => rows[0] || null);
    }

    static async getByName(name) {
        return await Storage.query(
            `SELECT *
                FROM types
                WHERE name = ?;`,
            name
        ).then(rows => rows[0] || null);
    }

    static async listAll(prev_id, batch_size) {
        return await Storage.query(
            `SELECT *
                FROM types
                WHERE id > ?
                LIMIT ?;`,
            prev_id,
            batch_size
        );
    }
}

module.exports = TypeStorage;
