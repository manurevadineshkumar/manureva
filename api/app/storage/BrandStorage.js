const Storage = require("./Storage");

class BrandStorage extends Storage {
    static async create(name) {
        return (await Storage.query(
            `INSERT
                INTO brands (name)
                VALUES (?);`,
            name
        )).insertId;
    }

    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM brands
                WHERE id = ?;`,
            id
        ).then(rows => rows[0] || null);
    }

    static async getByName(name) {
        return await Storage.query(
            `SELECT *
                FROM brands
                WHERE name = ?;`,
            name
        ).then(rows => rows[0] || null);
    }

    static async listAll() {
        return await Storage.query(
            `SELECT * FROM brands;`
        );
    }

    static async delete(id) {
        return await Storage.query(
            `DELETE
                FROM brands
                WHERE id = ?`,
            id
        );
    }
}

module.exports = BrandStorage;
