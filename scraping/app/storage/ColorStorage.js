const Storage = require("./Storage");

class ColorStorage extends Storage {
    static async getAll() {
        return await Storage.query(
            `SELECT name
                FROM colors`
        ).then(rows => rows.map(row => row.name));
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

    static async createColor(name) {
        return (await Storage.query(
            `INSERT
                INTO colors (name)
                VALUES (?);`,
            name
        )).insertId;
    }

    static async addForProduct(product_id, ids) {
        if (!ids.length)
            return;

        return await Storage.query(
            `INSERT IGNORE INTO product_colors
                (product_id, color_id)
                VALUES ?;`,
            ids.map(id => [product_id, id])
        )
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
            name_ids[name] ?? await ColorStorage.createColor(name)
        ));

        await ColorStorage.removeForProduct(product_id);
        await ColorStorage.addForProduct(product_id, ids);
    }
}

module.exports = ColorStorage;
