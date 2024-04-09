const Storage = require("./Storage");
const S3Storage = require("../services/S3Storage");

class MarketplaceStorage extends Storage {
    static parseMarketplace(data) {
        if (!data)
            return null;

        data.ranges = JSON.parse(data.ranges) ?? [];

        return data;
    }

    static parseProduct(data) {
        if (!data)
            return null;

        if (data.image_urls)
            data.image_urls = JSON.parse(data.image_urls).map(url =>
                S3Storage.OVH_S3_ENDPOINT + "/" + url
            );

        return data;
    }

    static async create({owner_id, name, platform, token}) {
        return await Storage.query(
            `INSERT INTO marketplaces SET ?;`,
            {owner_id, name, platform, token}
        ).then(res => res.insertId);
    }

    static async getById(id, user_id, skip_ownership_check = false) {
        const predicate = skip_ownership_check
            ? "m.id = ?"
            : "(m.id, m.owner_id) = (?, ?)";

        return await Storage.query(
            `SELECT
                m.*,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'to', spr.price_to,
                            'percent', spr.percent
                        )
                    )
                    FROM price_ranges spr
                    WHERE (spr.target_type, spr.target_id) = (
                        'marketplace', m.id
                    )
                    ORDER BY spr.price_to
                ) AS ranges
                FROM marketplaces m
                WHERE ${predicate};`,
            id, ...(skip_ownership_check ? [] : [user_id])
        ).then(rows => MarketplaceStorage.parseMarketplace(rows[0]) || null);
    }

    static async listForUser(user_id, prev_id, limit) {
        return await Storage.query(
            `SELECT
                s.*,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'to', spr.price_to,
                            'percent', spr.percent
                        )
                    )
                    FROM price_ranges spr
                    WHERE (spr.target_type, spr.target_id) = (
                        'marketplace', s.id
                    )
                    ORDER BY spr.price_to
                ) AS ranges
                FROM marketplaces s
                WHERE s.owner_id = ? AND s.id > ?
                GROUP BY s.id
                LIMIT ?;`,
            user_id,
            prev_id,
            limit
        ).then(rows => rows.map(MarketplaceStorage.parseMarketplace));
    }

    static async update(id, data) {
        return await Storage.query(
            `UPDATE marketplaces
                SET ?
                WHERE id = ?`,
            data,
            id
        );
    }

    static async listExportedProducts(marketplace_id, prev_id, batch_size) {
        return await Storage.query(
            `SELECT
                id, name, status, purchase_price_cents, external_id,
                IFNULL(exported_name, p.name) AS exported_name,
                IFNULL(
                    exported_description, p.description
                ) AS exported_description,
                (
                    SELECT IFNULL(JSON_ARRAYAGG(pi.uuid), '[]')
                    FROM product_images pi
                    WHERE product_id = p.id
                ) AS image_urls
                FROM products p
                JOIN marketplace_exported_products sep ON p.id = sep.product_id
                WHERE sep.marketplace_id = ? AND p.id > ?
                LIMIT ?;`,
            marketplace_id, prev_id, batch_size
        ).then(rows => rows.map(MarketplaceStorage.parseProduct));
    }

    static async addExportedProductsByIds(marketplace_id, product_ids) {
        if (!product_ids.length)
            return 0;

        const exported_ids = new Set(await Storage.query(
            `SELECT id
                FROM products
                WHERE owner_id = (
                    SELECT owner_id FROM marketplaces WHERE id = ?
                ) AND id IN (?);`,
            marketplace_id, product_ids
        ).then(rows => rows.map(({id}) => id)));

        return await Storage.query(
            `INSERT IGNORE INTO marketplace_exported_products
                (marketplace_id, product_id)
                VALUES ?;`,
            product_ids
                .filter(id => exported_ids.has(id))
                .map(id => [marketplace_id, id])
        ).then(res => res.affectedRows);
    }

    static async updateExportedProductData(marketplace_id, product_id, data) {
        return await Storage.query(
            `UPDATE marketplace_exported_products
                SET ?
                WHERE (marketplace_id, product_id) = (?, ?);`,
            data, marketplace_id, product_id
        );
    }

    static async removeExportedProductsByIds(marketplace_id, product_ids) {
        if (!product_ids.length)
            return 0;

        return await Storage.query(
            `DELETE FROM marketplace_exported_products
                WHERE marketplace_id = ? AND product_id IN (?)`,
            marketplace_id,
            product_ids
        ).then(res => res.affectedRows);
    }

    static async delete(id) {
        return await Storage.query(
            `DELETE FROM marketplaces WHERE id = ?;`,
            id
        );
    }
}

module.exports = MarketplaceStorage;
