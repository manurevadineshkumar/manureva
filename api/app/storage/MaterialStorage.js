const Storage = require("./Storage");

class MaterialStorage extends Storage {
    static async create(name) {
        return (await Storage.query(
            `INSERT
                INTO materials (name)
                VALUES (?);`,
            name
        )).insertId;
    }

    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM materials
                WHERE id = ?;`,
            id
        ).then(rows => rows[0] || null);
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

    static async listAll() {
        return await Storage.query(
            `SELECT * FROM materials;`
        );
    }

    static async addForProduct(product_id, ids) {
        return await Storage.query(
            `INSERT IGNORE INTO product_materials
                (product_id, material_id)
                VALUES ?;`,
            ids.map(id => [product_id, id])
        );
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
        const name_ids = Object.fromEntries(
            (await MaterialStorage.getByNames(names)).map(
                ({id, name}) => [name, id]
            )
        );
        const ids = await Promise.all(names.map(async name =>
            name_ids[name] ?? await MaterialStorage.create(name)
        ));

        await MaterialStorage.setMaterialsByIds(product_id, ids);
    }

    static async setMaterialsByIds(product_id, ids) {
        await MaterialStorage.removeForProduct(product_id);
        await MaterialStorage.addForProduct(product_id, ids);
    }

    static async delete(id) {
        return await Storage.query(
            `DELETE
                FROM materials
                WHERE id = ?`,
            id
        );
    }
}

module.exports = MaterialStorage;
