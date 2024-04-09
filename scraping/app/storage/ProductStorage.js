const Storage = require("./Storage");

const Utils = require("../Utils");

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

    static async selectProductsBySubquery(subquery, values) {
        const results = await Storage.query(
            `SELECT
            p.*,
            JSON_OBJECT('id', b.id, 'name', b.name) AS brand,
            JSON_OBJECT('id', ty.id, 'name', ty.name) AS type,
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
                    JSON_ARRAYAGG(JSON_OBJECT('id', t.id, 'name', t.name)), '[]'
                )
                FROM products_group_products pgp
                JOIN tags t
                    ON t.products_group_id = pgp.products_group_id
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

    static async getByOriginalUrl(original_url) {
        let pattern = original_url;
        if (original_url.includes("www.opulencevintage.com")) {
            pattern += "?";
        }
        pattern = Storage.escapeLike(pattern) + "%";

        const [product] = await ProductStorage.selectProductsBySubquery(
            "SELECT p.id FROM products p WHERE original_url LIKE ?",
            [pattern]
        );

        return product || null;
    }

    static async create(data) {
        if (data.size)
            data.size = JSON.stringify(data.size);

        return await Storage.query(
            `INSERT INTO products SET ?;`,
            data
        ).then(res => res.insertId);
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
}

module.exports = ProductStorage;
