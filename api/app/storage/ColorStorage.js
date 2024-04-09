const Storage = require("./Storage");

class ColorStorage extends Storage {
    static async create(name) {
        return (await Storage.query(
            `INSERT
                INTO colors (name)
                VALUES (?);`,
            name
        )).insertId;
    }

    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM colors
                WHERE id = ?;`,
            id
        ).then(rows => rows[0] || null);
    }

    static async getByName(name) {
        return await Storage.query(
            `SELECT *
                FROM colors
                WHERE name = ?;`,
            name
        ).then(rows => rows[0] || null);
    }

    static async getByNames(names) {
        if (!names.length)
            return [];

        return await Storage.query(
            `SELECT *
                FROM colors
                WHERE name IN (?);`,
            names
        );
    }

    static async listAll() {
        return await Storage.query(
            `SELECT * FROM colors;`
        );
    }

    static async addForProduct(product_id, ids) {
        return await Storage.query(
            `INSERT IGNORE INTO product_colors
                (product_id, color_id)
                VALUES ?;`,
            ids.map(id => [product_id, id])
        );
    }

    static async removeForProduct(product_id) {
        return await Storage.query(
            `DELETE
                FROM product_colors
                WHERE product_id = ?`,
            product_id
        );
    }

    static async setColors(product_id, names) {
        const name_ids = Object.fromEntries(
            (await ColorStorage.getByNames(names)).map(
                ({id, name}) => [name, id]
            )
        );
        const ids = await Promise.all(names.map(async name =>
            name_ids[name] ?? await ColorStorage.create(name)
        ));

        await ColorStorage.setColorsByIds(product_id, ids);
    }

    static async setColorsByIds(product_id, ids) {
        await ColorStorage.removeForProduct(product_id);
        await ColorStorage.addForProduct(product_id, ids);
    }

    static async delete(id) {
        return await Storage.query(
            `DELETE
                FROM colors
                WHERE id = ?`,
            id
        );
    }
}

module.exports = ColorStorage;
