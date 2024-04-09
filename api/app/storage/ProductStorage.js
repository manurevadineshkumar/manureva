const Storage = require("./Storage");

const Utils = require("../services/Utils");

class ProductStorage extends Storage {
    static parseProduct(data) {
        if (!data)
            return null;

        data.colors = Utils.buildObjByKey(JSON.parse(data.colors));
        data.materials = Utils.buildObjByKey(JSON.parse(data.materials));
        data.tags = Utils.buildObjByKey(JSON.parse(data.tags));
        data.image_urls = JSON.parse(data.image_urls);
        data.brand = JSON.parse(data.brand);
        data.type = JSON.parse(data.type);
        data.subtype = data.subtype ? JSON.parse(data.subtype) : null;
        data.size = data.size ? JSON.parse(data.size) : null;
        data.external_ids = Object.fromEntries(
            JSON.parse(data.external_ids).map(
                ([service_name, external_id, last_update]) => [
                    service_name,
                    {id: external_id, last_update: new Date(last_update)}
                ]
            )
        );

        return data;
    }

    static getFilterSubquery(filters, prev_id = 0, limit = 1024) {
        const DISCOUNT_PERCENT = "100 - ROUND(IFNULL(bought_price_discounted, "
            + "bought_price) * 100 / bought_price)";
        const rules = {
            id: {query: "p.id = ?"},
            ids: {
                query: "p.id IN (?)",
                selector: ids => ids.length ? [ids] : [0]
            },
            owner_id: {query: "p.owner_id = ?"},
            original_url: {query: "p.original_url = ?"},
            keywords: {
                query: keywords => keywords
                    .map(_ => "p.name LIKE ?")
                    .join(" AND "),
                selector: keywords => keywords.map(word =>
                    "%" + Storage.escapeLike(word) + "%"
                ),
            },
            status: {query: "p.status = ?"},
            type_ids: {query: "p.type_id IN (?)"},
            brand_ids: {query: "p.brand_id IN (?)"},
            color_ids: {
                query: "p.id IN ("
                + "SELECT product_id "
                + "FROM product_colors "
                + "WHERE color_id IN (?)"
                + ")",
            },
            material_ids: {
                query:
                    "p.id IN ("
                    + "SELECT product_id "
                    + "FROM product_materials "
                    + "WHERE material_id IN (?)"
                    + ")",
            },
            tag_ids: {
                query:
                    "p.id IN ("
                    + "SELECT product_id "
                    + "FROM products_group_products "
                    + "WHERE products_group_id IN ("
                    + "SELECT products_group_id FROM tags WHERE id IN (?)"
                    + ")"
                    + ")",
            },
            shop_id: {
                query:
                    "p.id IN ("
                    + "SELECT product_id "
                    + "FROM shop_imported_products "
                    + "WHERE shop_id = ?"
                    + ")",
            },
            marketplace_id: {
                query:
                    "p.id IN ("
                    + "SELECT product_id "
                    + "FROM marketplace_exported_products "
                    + "WHERE marketplace_id = ?"
                    + ")",
            },
            country_ids: {
                query:
                    "p.owner_id IN ( "
                    + "SELECT id "
                    + "FROM users "
                    + "WHERE address_country_id IN (?) "
                    + ")"
            },
            group_id: {
                query:
                    "p.id IN ("
                    + "SELECT product_id "
                    + "FROM products_group_products "
                    + "WHERE products_group_id = ?"
                    + ")",
            },
            price_from: {
                query: "purchase_price_cents >= ?",
            },
            price_to: {
                query: "purchase_price_cents <= ?",
            },
            wholesale_price_from: {
                query: "wholesale_price_cents >= ?",
            },
            wholesale_price_to: {
                query: "wholesale_price_cents <= ?",
            },
            bought_price_from: {
                query: "bought_price >= ?",
            },
            bought_price_to: {
                query: "bought_price <= ?",
            },
            discount_percent_from: {
                query: DISCOUNT_PERCENT + " >= ?",
            },
            discount_percent_to: {
                query: DISCOUNT_PERCENT + " <= ?",
            },
            created_from: {
                query: "creation_date >= ?",
                selector: d => [new Date(d)],
            },
            created_to: {
                query: "creation_date <= ?",
                selector: d => [new Date(d)],
            },
            has_serial: {
                query: "has_serial = ?",
                selector: d => [!!d],
            },
            has_guarantee_card: {
                query: "has_guarantee_card = ?",
                selector: d => [!!d],
            },
            has_storage_bag: {
                query: "has_storage_bag = ?",
                selector: d => [!!d],
            },
            has_box: {
                query: "has_box = ?",
                selector: d => [!!d],
            },
            subtype_ids: {
                query: "p.subtype_id IN (?)",
            },
            model: {
                query: "model = ?",
            },
            grade: {
                query: "grade = ?",
            }
        };

        const queries = ["p.id > ?"];
        const values = [prev_id];

        Object.entries(rules).forEach(([key, {query, selector}]) => {
            const value = filters[key];

            if ((value ?? null) === null)
                return;

            queries.push(typeof query == "function" ? query(value) : query);
            values.push(...(typeof selector == "function"
                ? selector(value)
                : [value]
            ));
        });

        return {
            query: "SELECT p.id FROM products p"
                + " WHERE " + queries.join(" AND ")
                + " ORDER BY p.id"
                + (limit ? " LIMIT ?" : ""),
            values: [...values, ...(limit ? [limit] : [])]
        };
    }

    static async selectProductsBySubquery(subquery, values) {
        const results = await Storage.query(
            `SELECT
            p.*,
            JSON_OBJECT('id', b.id, 'name', b.name) AS brand,
            JSON_OBJECT('id', ty.id, 'name', ty.name) AS type,
            (
                SELECT username FROM users u WHERE u.id = p.owner_id
            ) AS vendor,
            IF(
                sty.id IS NULL,
                NULL,
                JSON_OBJECT('id', sty.id, 'name', sty.name)
            ) AS subtype,
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
                    JSON_ARRAYAGG(JSON_ARRAY(
                        service_name, external_id, pei.last_update
                    )),
                    '[]'
                )
                FROM product_external_ids pei
                WHERE product_id = p.id
            ) AS external_ids
            FROM products p
            JOIN (${subquery}) product_ids USING (id)
            JOIN brands b
                ON b.id = p.brand_id
            JOIN types ty
                ON ty.id = p.type_id
            LEFT JOIN subtypes sty
                ON sty.id = p.subtype_id;`,
            ...values
        );

        return results.map(data => ProductStorage.parseProduct(data));
    }

    static async create(data) {
        if (data.size)
            data.size = JSON.stringify(data.size);

        return await Storage.query(
            `INSERT INTO products SET ?;`,
            data
        ).then(res => res.insertId);
    }

    static async getById(id) {
        const {query, values} = ProductStorage.getFilterSubquery({id}, 0, 1);
        const [product] = await ProductStorage.selectProductsBySubquery(
            query,
            values
        );

        return product || null;
    }

    static async getByShopExternalId(shop_id, external_id) {
        const [product] = await ProductStorage.selectProductsBySubquery(
            `SELECT
                product_id AS id
                FROM shop_imported_products
                WHERE (shop_id, external_id) = (?, ?)`,
            [shop_id, external_id]
        );

        return product ?? null;
    }

    static async getByOriginalUrl(original_url) {
        const {query, values} = ProductStorage.getFilterSubquery(
            {original_url}, 0, 1
        );
        const [product] = await ProductStorage.selectProductsBySubquery(
            query,
            values
        );

        return product || null;
    }

    static async getStatusStatistics() {
        return await Storage.query(
            `SELECT
            'total' AS status, COUNT(*) AS count
            FROM
                products
            UNION
            SELECT
                status_table.status, IFNULL(counts.count, 0) AS count
            FROM (
                SELECT 'DISABLED' AS status
                UNION SELECT 'PENDING' AS status
                UNION SELECT 'ACTIVE' AS status
                UNION SELECT 'SOLD' AS status
                UNION SELECT 'LOCKED' AS status
            ) AS status_table
            LEFT JOIN(
                SELECT status, COUNT(*) AS count
                FROM products
                GROUP BY status
            ) AS counts
                ON status_table.status = counts.status
            ORDER BY count;`
        );
    }

    static countAll() {
        return Storage.query(
            `SELECT COUNT(*) AS count FROM products;`
        ).then(result => +result[0].count);
    }

    static async listAll(prev_id = 0, limit = 1024) {
        const {query, values} = ProductStorage.getFilterSubquery(
            {}, prev_id, limit
        );

        return await ProductStorage.selectProductsBySubquery(query, values);
    }

    static countAvailable() {
        return Storage.query(
            `SELECT
                COUNT(*) AS count
                FROM products
                WHERE status = 'ACTIVE';`,
        ).then(result => +result[0].count);
    }

    static async listAvailable(prev_id = 0, limit = 1024) {
        const {query, values} = ProductStorage.getFilterSubquery(
            {status: "ACTIVE"}, prev_id, limit
        );

        return await ProductStorage.selectProductsBySubquery(query, values);
    }

    static async countSearch(filters = {}, prev_id = 0) {
        const {query, values} = ProductStorage.getFilterSubquery(
            filters, prev_id, null
        );
        const result = await Storage.query(
            `SELECT COUNT(*) AS count FROM (${query}) c;`,
            ...values
        );

        return +result[0].count;
    }

    static async search(filters = {}, prev_id = 0, limit = 16) {
        const {query, values} = ProductStorage.getFilterSubquery(
            filters, prev_id, limit
        );

        return await ProductStorage.selectProductsBySubquery(query, values);
    }

    static async countUpdatedForService(service_name, filters = {}) {
        const filter_entries = Object.entries(filters);
        const filter_conditionals = "AND p.?? = ? ".repeat(
            filter_entries.length
        );

        const rows = await Storage.query(
            `SELECT
                COUNT(*) AS count
            FROM products p
            LEFT JOIN product_external_ids pei ON
                id = product_id AND pei.service_name = ?
            WHERE
                (
                    pei.service_name IS NULL
                    OR pei.last_update < p.last_update
                )
                ${filter_conditionals};`,
            service_name,
            ...filter_entries.flat()
        );
        return rows[0].count;
    }

    static async listUpdatedForService(
        service_name,
        filters = {},
        prev_id = 0, limit = 1024
    ) {
        const filter_entries = Object.entries(filters);
        const filter_conditionals = "AND p.?? = ? ".repeat(
            filter_entries.length
        );
        const query =
            `SELECT
                id
            FROM products p
            LEFT JOIN product_external_ids pei ON
                id = product_id AND pei.service_name = ?
            WHERE
                id > ? AND (
                    pei.service_name IS NULL
                    OR pei.last_update < p.last_update
                )
                ${filter_conditionals}
            LIMIT ?`;
        const values = [service_name, prev_id, ...filter_entries.flat(), limit];

        return await ProductStorage.selectProductsBySubquery(query, values);
    }

    static async update(id, data) {
        delete data.id;

        if (!Object.keys(data).length)
            return 0;

        if (data.size)
            data.size = JSON.stringify(data.size);

        const result = await Storage.query(
            `UPDATE products SET ? WHERE id = ?;`,
            data, id
        );

        return result.affectedRows;
    }

    static async setAvailableBatch(ids) {
        const date = new Date;

        return await Storage.query(
            `UPDATE products
                SET
                    status = 'ACTIVE',
                    last_update = IF(status != 'ACTIVE', last_update, ?),
                    last_scrape = ?
                WHERE id in (?);`,
            date,
            date,
            ids
        ).then(result => result.affectedRows);
    }

    static async deprecateAvailability(min_timestamp) {
        const result = await Storage.query(
            `UPDATE products
                SET status = 'DISABLED', last_update = ?
                WHERE status = 'ACTIVE' AND last_scrape < ?;`,
            new Date,
            min_timestamp
        );
        return result.affectedRows;
    }

    /**
     * @param {number} productId
     * @returns {Promise<string | null>}
     */
    static async getCountryCodeByProductId(productId) {
        const result = await Storage.query(
            `SELECT c.code as country_code
                FROM products p
                LEFT JOIN users u ON u.id = p.owner_id
                LEFT JOIN countries c ON c.id = u.address_country_id
                WHERE p.id = ?;`,
            productId
        );

        return result[0].country_code || null;
    }
}

module.exports = ProductStorage;
