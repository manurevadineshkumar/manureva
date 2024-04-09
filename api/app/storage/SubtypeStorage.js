const Storage = require("./Storage");

class SubtypeStorage extends Storage {
    static async create(name) {
        return (await Storage.query(
            `INSERT
                INTO subtypes (name)
                VALUES (?);`,
            name
        )).insertId;
    }

    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM subtypes
                WHERE id = ?;`,
            id
        ).then(rows => rows[0] || null);
    }

    static async getByName(name) {
        return await Storage.query(
            `SELECT *
                FROM subtypes
                WHERE name = ?;`,
            name
        ).then(rows => rows[0] || null);
    }

    static async listAll() {
        return await Storage.query(
            `SELECT *
                FROM subtypes;`
        );
    }
}

module.exports = SubtypeStorage;
