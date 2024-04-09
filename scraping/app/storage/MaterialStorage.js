const Storage = require("./Storage");

class MaterialStorage extends Storage {
    static async getAll() {
        return await Storage.query(
            `SELECT name
                FROM materials`
        ).then(rows => rows.map(row => row.name));
    }

    static async getByName(name) {
        return await Storage.query(
            `SELECT *
                FROM materials
                WHERE name = ?;`,
            name
        ).then(rows => rows[0] || null);
    }

    static async getByNames(names) {
        if (!names.length)
            return [];

        return await Storage.query(
            `SELECT *
                FROM materials
                WHERE name IN (?)`,
            names
        );
    }

    static async createMaterial(name) {
        return (await Storage.query(
            `INSERT
                INTO materials (name)
                VALUES (?);`,
            name
        )).insertId;
    }

    static async addForProduct(product_id, ids) {
        if (!ids.length)
            return;

        return await Storage.query(
            `INSERT IGNORE INTO product_materials
                (product_id, material_id)
                VALUES ?;`,
            ids.map(id => [product_id, id])
        )
    }

    static async removeForProduct(product_id) {
        return await Storage.query(
            `DELETE
                FROM product_materials
                WHERE product_id = ?`,
            product_id
        );
    }

    static async setMaterials(product_id, names) {
        console.log("NAMES", names);
        const name_ids = Object.fromEntries(
            (await MaterialStorage.getByNames(names)).map(
                ({id, name}) => [name, id]
            )
        );
        const ids = await Promise.all(names.map(async name =>
            name_ids[name] ?? await MaterialStorage.createMaterial(name)
        ));

        await MaterialStorage.removeForProduct(product_id);
        await MaterialStorage.addForProduct(product_id, ids);
    }
}

module.exports = MaterialStorage;
