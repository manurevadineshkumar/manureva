const Storage = require("./Storage");
const Utils = require("../services/Utils");

class ShopExportedProductsStorage extends Storage {
    static parseProduct(data) {
        if (!data) {
            return null;
        }

        data.image_urls = JSON.parse(data.image_urls);
        data.colors = Utils.buildObjByKey(JSON.parse(data.colors));
        data.materials = Utils.buildObjByKey(JSON.parse(data.materials));
        data.tags = Utils.buildObjByKey(JSON.parse(data.tags));
        data.brand = JSON.parse(data.brand);
        data.type = JSON.parse(data.type);
        data.size = data.size ? JSON.parse(data.size) : null;
        data.shop_exported_products_infos = JSON.parse(data.shop_exported_products_infos);
        return data;
    }

    static async listAvailableExportedProductsByShop(shopId, prevId, batchSize = 1024) {
        const results = await Storage.query(
            `SELECT p.*,
                JSON_OBJECT('id', b.id, 'name', b.name) AS brand,
                JSON_OBJECT('id', ty.id, 'name', ty.name) AS type,
                (
                    SELECT IFNULL(
                        JSON_ARRAYAGG(JSON_OBJECT('id', m.id, 'name', m.name)), '[]'
                    )
                    FROM product_materials pm
                    JOIN materials m
                        ON pm.material_id = m.id
                    WHERE pm.product_id = p.id
                    ORDER BY m.id
                ) AS materials,
                (
                    SELECT IFNULL(
                        JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'name', c.name)), '[]'
                    )
                    FROM product_colors pc
                    JOIN colors c
                        ON pc.color_id = c.id
                    WHERE pc.product_id = p.id
                    ORDER BY c.id
                ) AS colors,
                (
                    SELECT IFNULL(
                        JSON_ARRAYAGG(JSON_OBJECT(
                            'id', t.id,
                            'name', t.name,
                            'owner_id', pg.user_id
                        )), '[]'
                    )
                    FROM products_group_products pgp
                    JOIN tags t
                        ON t.products_group_id = pgp.products_group_id
                    JOIN products_groups pg
                        ON pgp.products_group_id = pg.id
                    WHERE pgp.product_id = p.id
                    ORDER BY t.id
                ) AS tags,
                (
                    SELECT IFNULL(JSON_ARRAYAGG(pi.uuid), '[]')
                    FROM product_images pi
                    WHERE product_id = p.id
                ) AS image_urls,
                (
                    SELECT IFNULL(
                        JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'shop_id', sep.shop_id,
                                'external_id', sep.external_id,
                                'last_update', sep.last_update,
                                'archived', sep.archived,
                                'exported_price', sep.exported_price
                            )
                        ), '[]'
                    )
                    FROM shop_exported_products sep
                    WHERE product_id = p.id AND shop_id = ?
                ) AS shop_exported_products_infos
                FROM products p
                JOIN shop_exported_products sep ON p.id = sep.product_id
                JOIN brands b ON p.brand_id = b.id
                JOIN types ty ON ty.id = p.type_id
                WHERE sep.shop_id = ?
                    AND p.id > ?
                    AND sep.external_id IS NOT NULL
                LIMIT ?;`,
            shopId,
            shopId,
            prevId,
            batchSize
        );

        return results.map(
            data => ShopExportedProductsStorage.parseProduct(data));
    }

    static async setArchived(productId, shopId, externalId) {
        if (externalId === null) {
            return await Storage.query(
                `UPDATE shop_exported_products
                    SET archived = 1
                    WHERE product_id = ?
                        AND shop_id = ?;`,
                productId,
                shopId
            );
        }
    }

    static async getExternalIds(shopId, productIds) {
        if (!shopId || !productIds.length) {
            return null;
        }

        const result = await Storage.query(
            `SELECT
                sep.external_id, sep.product_id
                FROM shop_exported_products sep
                WHERE sep.shop_id = ? AND sep.product_id IN (?);`,
            shopId,
            productIds
        );

        return result.map((row) => row);
    }

    static async setExternalId(productId, shopId, externalId) {
        if (externalId === null) {
            this.setArchived(productId, shopId, externalId);
        }

        return await Storage.query(
            `INSERT
                INTO shop_exported_products (
                    product_id, shop_id, external_id, last_update
                ) VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE external_id = ?, last_update = NOW();`,
            productId,
            shopId,
            externalId,
            externalId
        ).then(result => result.insertId);
    }

    static async countUpdatedForShop(shopId, filters = {}) {
        const filterEntries = Object.entries(filters);
        const filterConditionals = "AND p.?? = ? ".repeat(
            filterEntries.length
        );

        const rows = await Storage.query(
            `SELECT
                COUNT(*) AS count
            FROM products p
            LEFT JOIN shop_exported_products sep ON
                id = product_id AND sep.shop_id = ?
            WHERE sep.last_update < p.last_update
                ${filterConditionals};`,
            shopId,
            ...filterEntries.flat()
        );
        return rows[0].count;
    }

    static async removeProductById(shopId, productId) {
        return await Storage.query(
            `DELETE FROM shop_exported_products
                WHERE shop_id = ? AND product_id = ?`,
            shopId,
            productId
        ).then(res => res.affectedRows);
    }

    static async listArchivedProducts(shopId) {
        const result = await Storage.query(
            `SELECT sep.product_id
                FROM shop_exported_products sep
                WHERE sep.archived = 1 AND sep.shop_id = ?;`,
            shopId
        );
        return result.map((row) => row.product_id);
    }
}

module.exports = ShopExportedProductsStorage;
