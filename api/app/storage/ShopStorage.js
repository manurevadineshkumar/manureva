const Storage = require("./Storage");
const S3Storage = require("../services/S3Storage");

const SELECT_PRICE_RANGE = `(
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'to', spr.price_to,
            'percent', spr.percent
        )
    )
    FROM price_ranges spr
    WHERE (spr.target_type, spr.target_id) = ('shop', s.id)
) AS ranges`;

const SELECT_DISCOUNT_RANGE = `(
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'price_to', sdr.price_to,
            'day_to', sdr.day_to,
            'discount', sdr.discount
        )
    )
    FROM shop_discount_ranges sdr
    WHERE sdr.shop_id = s.id
) AS discount_ranges`;

class ShopStorage extends Storage {
    static parseShop(data) {
        if (!data)
            return null;

        data.ranges = JSON.parse(data.ranges) ?? [];
        data.discount_ranges = JSON.parse(data.discount_ranges) ?? [];

        return data;
    }

    static parseProduct(data) {
        if (!data)
            return null;

        if (data.image_urls)
            data.image_urls = JSON.parse(data.image_urls).map(url =>
                S3Storage.OVH_S3_ENDPOINT + "/" + url
            );
        if (data.tags)
            data.tags = JSON.parse(data.tags);

        if (data.brand) {
            data.brand = JSON.parse(data.brand);
        }
        return data;
    }

    static async create({
        owner_id,
        name,
        is_importing,
        is_exporting,
        platform,
        currency,
        url,
        original_url,
        token,
        api_secret
    }) {
        const id = await Storage.query(
            `INSERT INTO shops SET ?;`,
            {
                owner_id,
                name,
                is_importing,
                is_exporting,
                platform,
                currency,
                url,
                original_url,
                token,
                api_secret
            }
        ).then(res => res.insertId);

        return await ShopStorage.getById(id, owner_id);
    }

    static async listAllConnectedAndExporting(prev_id, batch_size) {
        // Korvin and Les Divins
        const internalShopId = [1, 3];

        return await Storage.query(
            `SELECT *
                FROM shops
                WHERE is_exporting = 1
                    AND id NOT IN (?)
                    AND id > ?
                LIMIT ?;`,
            internalShopId,
            prev_id,
            batch_size
        );
    }

    static async countAllConnectedAndExporting(prev_id, batch_size) {
        // Korvin and Les Divins
        const internalShopId = [1, 3];

        const row = await Storage.query(
            `SELECT 
                COUNT(*) AS count
                FROM shops
                WHERE is_exporting = 1
                    AND id NOT IN (?)
                    AND id > ?
                LIMIT ?;`,
            internalShopId,
            prev_id,
            batch_size
        );

        return row[0].count;
    }

    static async getById(id, user_id, skip_ownership_check = false) {
        const predicate = skip_ownership_check
            ? "s.id = ?"
            : "(s.id, s.owner_id) = (?, ?)";

        return await Storage.query(
            `SELECT
                s.*,
                ${SELECT_PRICE_RANGE},
                ${SELECT_DISCOUNT_RANGE}
            FROM shops s
            WHERE ${predicate};`,
            id, ...(skip_ownership_check ? [] : [user_id])
        ).then(rows => ShopStorage.parseShop(rows[0]) || null);
    }

    static async getByName(name, user_id) {
        return await Storage.query(
            `SELECT
                s.*,
                ${SELECT_PRICE_RANGE},
                ${SELECT_DISCOUNT_RANGE}
            FROM shops s
            WHERE (s.name, s.owner_id) = (?, ?);`,
            name, user_id
        ).then(rows => ShopStorage.parseShop(rows[0]) || null);
    }

    static async getByUrl(url) {
        return await Storage.query(
            `SELECT
                s.*,
                ${SELECT_PRICE_RANGE},
                ${SELECT_DISCOUNT_RANGE}
            FROM shops s
            WHERE s.url = ?;`,
            url
        ).then(rows => ShopStorage.parseShop(rows[0]) || null);
    }

    static async listForUser(user_id, prev_id, limit, filters) {
        let predicate = "";

        if (filters.is_importing)
            predicate += " AND is_importing";

        if (filters.is_exporting)
            predicate += " AND is_exporting";

        return await Storage.query(
            `SELECT
                s.*,
                ${SELECT_PRICE_RANGE},
                ${SELECT_DISCOUNT_RANGE}
            FROM shops s
            WHERE s.owner_id = ? AND s.id > ?${predicate}
            GROUP BY s.id
            LIMIT ?;`,
            user_id,
            prev_id,
            limit
        ).then(rows => rows.map(ShopStorage.parseShop));
    }

    static async update(id, data) {
        return await Storage.query(
            `UPDATE shops
                SET ?
                WHERE id = ?`,
            data,
            id
        );
    }

    static async setUnavailableProducts(id) {
        return await Storage.query(
            `UPDATE products p
                JOIN shop_imported_products sip ON p.id = sip.product_id
                SET p.status = 'DISABLED', p.last_update = CURRENT_TIMESTAMP
                WHERE sip.shop_id = ?;`,
            id
        );
    }

    static async listImportedProducts(shop_id, prev_id, batch_size) {
        return await Storage.query(
            `SELECT
                id, name, status, bought_price, purchase_price_cents,
                (
                    SELECT IFNULL(JSON_ARRAYAGG(pi.uuid), '[]')
                    FROM product_images pi
                    WHERE product_id = p.id
                ) AS image_urls
                FROM products p
                JOIN shop_imported_products sip ON p.id = sip.product_id
                WHERE sip.shop_id = ? AND p.id > ?
                LIMIT ?;`,
            shop_id, prev_id, batch_size
        ).then(rows => rows.map(ShopStorage.parseProduct));
    }

    static async addImportedProductById(shop_id, product_id, external_id, created_at) {
        if (await Storage.query(
            `SELECT 1
                FROM shop_imported_products
                WHERE (shop_id, external_id) = (?, ?);`,
            shop_id, external_id
        ).then(rows => !!rows[0]))
            return false;

        return !!await Storage.query(
            `INSERT IGNORE INTO shop_imported_products
                (shop_id, product_id, external_id, created_on_shop_at)
                VALUES (?, ?, ?, ?);`,
            shop_id, product_id, external_id, created_at
        ).then(res => !!res.affectedRows);
    }

    static async removeImportedProductById(shop_id, product_id) {
        return await Storage.query(
            `DELETE FROM shop_imported_products
                WHERE (shop_id, product_id) = (?, ?)`,
            shop_id, product_id
        );
    }

    static async removeImportedProductByExternalId(shop_id, external_id) {
        return await Storage.query(
            `DELETE FROM shop_imported_products
                WHERE (shop_id, external_id) = (?, ?)`,
            shop_id, external_id
        );
    }

    static async listExportedProducts(shop_id, prev_id, batch_size, wholesaleToDropshippingRate) {
        const suggestedRetailPriceFactor = 1.15;
        return await Storage.query(
            `SELECT
                p.id,
                p.name,
                status,
                external_id,
                brand_id,
                exported_at,
                (CASE
                    WHEN p.wholesale_price_cents_discounted IS NOT NULL THEN p.wholesale_price_cents_discounted
                    ELSE p.wholesale_price_cents
                END * ?) AS consignment_price_cents,
                (CASE
                    WHEN p.retail_price_cents_discounted IS NOT NULL THEN p.retail_price_cents_discounted
                    ELSE p.retail_price_cents
                END * ${suggestedRetailPriceFactor}) AS suggested_retail_price_cents,
                IFNULL(exported_name, p.name) AS exported_name,
                JSON_OBJECT('id', b.id, 'name', b.name) AS brand,
                IFNULL(exported_description, p.description) AS exported_description,
                IFNULL(exported_price, (CASE
                        WHEN p.wholesale_price_cents_discounted IS NOT NULL THEN p.wholesale_price_cents_discounted
                        ELSE p.wholesale_price_cents
                    END) * ?) AS exported_price,
                (
                    SELECT IFNULL(JSON_ARRAYAGG(pi.uuid), '[]')
                    FROM product_images pi
                    WHERE product_id = p.id
                ) AS image_urls,
                (
                    SELECT IFNULL(JSON_ARRAYAGG(t.name), '[]')
                    FROM tags t
                    JOIN products_groups pg ON products_group_id = pg.id
                    JOIN products_group_products pgp ON pg.id = pgp.products_group_id
                    JOIN shops s ON pg.user_id = s.owner_id
                    WHERE product_id = p.id AND NOT pg.is_system AND s.id = sep.shop_id
                ) AS tags,
                sep.archived
            FROM products p
            JOIN brands b ON p.brand_id = b.id
            JOIN shop_exported_products sep ON p.id = sep.product_id
            WHERE sep.shop_id = ? AND p.id > ?
            LIMIT ?;`,
            wholesaleToDropshippingRate,
            wholesaleToDropshippingRate,
            shop_id,
            prev_id,
            batch_size
        ).then(rows => rows.map(ShopStorage.parseProduct));
    }

    static async addExportedProducts(shop_id, products) {
        if (!products.length)
            return 0;

        const exported_ids = new Set(await Storage.query(
            `SELECT product_id AS id
                FROM shop_imported_products
                WHERE shop_id = ? AND product_id IN (?);`,
            shop_id, products.map(({id}) => id)
        ).then(rows => rows.map(({id}) => id)));

        return await Storage.query(
            `INSERT IGNORE INTO shop_exported_products
                (shop_id, product_id, exported_description)
                VALUES ?;`,
            products
                .filter(({id}) => !exported_ids.has(id))
                .map(({id, description}) => [shop_id, id, description])
        ).then(res => res.affectedRows);
    }

    static async updateExportedProductData(shop_id, product_id, data) {

        if (data.external_id) {
            const exportedAt = {"exported_at": new Date()};
            Object.assign(data, exportedAt);
        }

        return await Storage.query(
            `UPDATE shop_exported_products
                SET ?
                WHERE (shop_id, product_id) = (?, ?);`,
            data, shop_id, product_id
        );
    }

    static async changeArchived(productIds, shopId, value) {
        if (!productIds.length || !shopId) {
            return 0;
        }

        return await Storage.query(
            `UPDATE shop_exported_products
                SET archived = ?
                WHERE product_id IN (?)
                    AND shop_id = ?;`,
            value,
            productIds,
            shopId
        ).then(res => res.affectedRows);
    }

    static async removeExportedProductsByIds(shop_id, product_ids) {
        if (!product_ids.length)
            return 0;

        return await Storage.query(
            `DELETE FROM shop_exported_products
                WHERE shop_id = ? AND product_id IN (?)`,
            shop_id,
            product_ids
        ).then(res => res.affectedRows);
    }

    static async delete(id) {
        return await Storage.query(
            `DELETE FROM shops WHERE id = ?;`,
            id
        );
    }
}

module.exports = ShopStorage;
