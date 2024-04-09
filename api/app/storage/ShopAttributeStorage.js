const Storage = require("./Storage");

class ShopAttributeStorage extends Storage {
    static async setForShop(shop_id, names) {
        await Storage.runTransaction(async query => {
            await query(
                `DELETE
                    FROM shop_attributes
                    WHERE shop_id = ? AND (name) NOT IN (?)`,
                shop_id, names
            );

            const existing_names = new Set(
                await query(
                    `SELECT name
                        FROM shop_attributes
                        WHERE shop_id = ? AND name IN (?);`,
                    shop_id, names
                ).then(rows => rows.map(({name}) => name))
            );
            const new_names = names.filter(name => !existing_names.has(name));

            if (new_names.length)
                await query(
                    `INSERT
                        INTO shop_attributes (shop_id, name)
                        VALUES ?`,
                    new_names.map(name => [shop_id, name])
                );
        });
    }

    static async setValues(attribute_id, values) {
        await Storage.query(
            `DELETE
                FROM shop_attribute_values
                WHERE attribute_id = ?`,
            attribute_id
        );

        if (values.length)
            await Storage.query(
                `INSERT
                    INTO shop_attribute_values (attribute_id, value, name)
                    VALUES ?;`,
                values.map(({value, name}) =>
                    [attribute_id, value, name || null]
                )
            );
    }

    static async listForShop(shop_id) {
        return await Storage.query(
            `SELECT id, shop_id, name,
                (
                    SELECT JSON_ARRAYAGG(
                        IF(
                            name IS NULL, 
                            JSON_OBJECT('id', sav.id, 'value', value),
                            JSON_OBJECT(
                                'id', sav.id, 'value', value, 'name', name
                            )
                        )
                    )
                    FROM shop_attribute_values sav
                    WHERE sav.attribute_id = sa.id
                ) AS 'values'
                FROM shop_attributes sa
                WHERE shop_id = ?`,
            shop_id
        ).then(rows =>
            rows.map(({values, ...data}) => ({
                values: JSON.parse(values),
                ...data
            }))
        );
    }

    static async deleteMultiple(ids) {
        return await Storage.query(
            `DELETE
                FROM shop_attributes
                WHERE id IN (?)`,
            ids
        );
    }

    static async valueIdExists(shop_id, shop_attribute_value_id) {
        return await Storage.query(
            `SELECT 1
                FROM shop_attribute_values sav
                JOIN shop_attributes sa ON sa.id = sav.attribute_id
                WHERE (shop_id, sav.id) = (?, ?);`,
            shop_id, shop_attribute_value_id
        ).then(res => !!res[0]);
    }
}

module.exports = ShopAttributeStorage;
