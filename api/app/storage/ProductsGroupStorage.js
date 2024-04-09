const Storage = require("./Storage");

class ProductsGroupStorage {
    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM products_groups
                WHERE id = ?;`,
            id
        ).then(rows => rows[0] || null);
    }

    static async create({user_id, is_system}) {
        return await Storage.query(
            `INSERT
                INTO products_groups (user_id, is_system)
                VALUES (?, ?);`,
            user_id, is_system
        ).then(res => res.insertId);
    }

    static async getProductByExternalId(products_group_id, external_id) {
        return await Storage.query(
            `SELECT *
                FROM products_group_products
                WHERE (products_group_id, product_external_id) = (?, ?);`,
            products_group_id, external_id
        ).then(rows => rows[0] || null);
    }

    static async addProduct(
        products_group_id, product_id,
        product_external_id = null,
        metadata = null
    ) {
        return await Storage.query(
            `INSERT INTO products_group_products
                (product_id, products_group_id, product_external_id, metadata)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY
                    UPDATE
                        product_external_id = ?,
                        metadata = ?,
                        last_update = CURRENT_TIMESTAMP;`,
            product_id,
            products_group_id,
            product_external_id,
            metadata,
            product_external_id,
            metadata
        );
    }

    static async addProductIds(products_group_id, product_ids) {
        return (await Storage.query(
            `INSERT IGNORE
                INTO products_group_products (products_group_id, product_id)
                VALUES ?;`,
            product_ids.map(id => [products_group_id, id])
        )).affectedRows;
    }

    static async removeProduct(id, product_id) {
        return await Storage.query(
            `DELETE
                FROM products_group_products
                WHERE (products_group_id, product_id) =  (?, ?)`,
            id,
            product_id
        );
    }

    static async removeProductIds(products_group_id, product_ids) {
        if (!product_ids.length)
            return 0;

        return (await Storage.query(
            `DELETE
                FROM products_group_products
                WHERE products_group_id = ? AND product_id IN (?);`,
            products_group_id,
            product_ids
        )).affectedRows;
    }

    static async setProductMetadata(id, product_id, metadata = null) {
        return await Storage.query(
            `UPDATE products_group_products
                SET
                    metadata = ?,
                    last_update = IF(
                        metadata = ?,
                        last_update,
                        CURRENT_TIMESTAMP
                    )
                WHERE (products_group_id, product_id) = (?, ?);`,
            metadata,
            metadata,
            product_id,
            id,
        );
    }

    static async update(id, data) {
        return await Storage.query(
            `UPDATE products_groups
                SET ?
                WHERE id = ?`,
            data,
            id
        );
    }

    static async delete(id) {
        return await Storage.query(
            `DELETE
                FROM products_groups
                WHERE id = ?;`,
            id
        );
    }
}

module.exports = ProductsGroupStorage;
