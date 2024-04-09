const Storage = require("./Storage");

class TagStorage extends Storage {
    static parseTag(data) {
        if (!data)
            return null;

        if (data.products_group)
            data.products_group = JSON.parse(data.products_group);

        return data;
    }

    static async getById(id, user_id) {
        return await Storage.query(
            `SELECT
                t.*,
                JSON_OBJECT(
                    'id', pg.id,
                    'user_id', pg.user_id,
                    'products_count', pg.products_count,
                    'is_system', pg.is_system,
                    'last_dump', pg.last_dump
                ) AS products_group
                FROM tags t
                JOIN products_groups pg ON pg.id = products_group_id
                WHERE t.id = ?;`,
            id, user_id
        ).then(rows => TagStorage.parseTag(rows[0]) || null);
    }

    static async getByName(name, user_id) {
        if (user_id)
            return await Storage.query(
                `SELECT
                    t.*,
                    JSON_OBJECT(
                        'id', pg.id,
                        'user_id', pg.user_id,
                        'products_count', pg.products_count,
                        'is_system', pg.is_system,
                        'last_dump', pg.last_dump
                    ) AS products_group
                    FROM tags t
                    JOIN products_groups pg ON pg.id = products_group_id
                    WHERE (name, pg.user_id) = (?, ?);`,
                name, user_id
            ).then(rows => TagStorage.parseTag(rows[0]) || null);

        return await Storage.query(
            `SELECT
                t.*,
                JSON_OBJECT(
                    'id', pg.id,
                    'user_id', pg.user_id,
                    'products_count', pg.products_count,
                    'is_system', pg.is_system,
                    'last_dump', pg.last_dump
                ) AS products_group
                FROM tags t
                JOIN products_groups pg ON pg.id = products_group_id
                WHERE name = ?;`,
            name
        ).then(rows => TagStorage.parseTag(rows[0]) || null);
    }

    static async listForUser(user_id, prev_id, limit) {
        return await Storage.query(
            `SELECT
            t.*,
            JSON_OBJECT(
                'id', pg.id,
                'user_id', pg.user_id,
                'products_count', pg.products_count,
                'is_system', pg.is_system,
                'last_dump', pg.last_dump
            ) AS products_group
            FROM tags t
            JOIN products_groups pg ON pg.id = products_group_id
            WHERE (pg.user_id = ? OR is_system) AND t.id > ?
            LIMIT ?;`,
            user_id,
            prev_id,
            limit
        ).then(rows => rows.map(TagStorage.parseTag));
    }

    static async filterForUser(tag_ids, user_id) {
        if (!tag_ids.length)
            return [];

        return await Storage.query(
            `SELECT t.id
                FROM tags t
                JOIN products_groups pg ON pg.id = products_group_id
                WHERE t.id IN (?) AND (pg.user_id = ? OR is_system);`,
            tag_ids, user_id
        ).then(rows => rows.map(({id}) => id));
    }

    static async create({user_id, name}) {
        const id = await Storage.runTransaction(async query => {
            await query(
                `INSERT INTO products_groups (user_id) VALUES (?);`,
                user_id
            );
            const {insertId: id} = await query(
                `INSERT
                 INTO tags (products_group_id, name)
                 VALUES (LAST_INSERT_ID(), ?);`,
                name
            );

            return id;
        });

        return await TagStorage.getById(id, user_id);
    }

    static async update(id, data) {
        return await Storage.query(
            `UPDATE tags SET ? WHERE id = ?;`,
            data,
            id
        );
    }

    static async setProductTagsByIds(product_id, tag_ids) {
        await Storage.query(
            `DELETE
                FROM products_group_products
                WHERE product_id = ? AND products_group_id IN (
                    SELECT products_group_id FROM tags
                );`,
            product_id
        );

        if (!tag_ids.length)
            return;

        const product_group_ids = await Storage.query(
            `SELECT products_group_id
                FROM tags t
                JOIN products_groups pg ON products_group_id = pg.id
                WHERE NOT is_system AND t.id IN (?);`,
            tag_ids
        ).then(rows => rows.map(({products_group_id}) => products_group_id));

        await Storage.query(
            `INSERT
                INTO products_group_products (
                    product_id,
                    products_group_id
                ) VALUES ?;`,
            product_group_ids.map(id => [product_id, id])
        );
    }

    static async updateNewTag() {
        return await Storage.query(
            `UPDATE products
                SET last_update = CURRENT_TIMESTAMP
                WHERE id IN (
                    SELECT id
                    FROM products
                    JOIN products_group_products pgp
                        ON (product_id, products_group_id) = (
                            id,
                            (
                                SELECT products_group_id 
                                FROM tags 
                                WHERE name = 'New'
                            )
                        )
                    WHERE status = 'ACTIVE'
                        AND creation_date <= CURRENT_TIMESTAMP - INTERVAL 30 DAY
                );
            DELETE 
                FROM products_group_products
                WHERE products_group_id = (
                    SELECT products_group_id FROM tags WHERE name = 'New'
                );
            INSERT INTO products_group_products
                (product_id, products_group_id) 
                SELECT 
                    id, 
                    (
                        SELECT products_group_id FROM tags WHERE name = 'New'
                    ) AS products_group_id 
                    FROM products
                    WHERE status = 'ACTIVE'
                        AND creation_date > 
                            CURRENT_TIMESTAMP - INTERVAL 30 DAY;`
        ).then(res => res[0].affectedRows);
    }

    static async delete(id) {
        return await Storage.query(`DELETE FROM tags WHERE id = ?`, id);
    }
}

module.exports = TagStorage;
