const Storage = require("./Storage");

class ShopAttributeStorage extends Storage {
    static async addForShop(
        category, korvin_id, shop_id, attribute_value_id
    ) {
        return await Storage.query(
            `INSERT IGNORE
                INTO shop_bindings (
                    category, korvin_id, shop_id, shop_attribute_value_id
                )
                VALUES (?, ?, ?, ?)`,
            category, korvin_id, shop_id, attribute_value_id
        );
    }

    static async deleteForShop(
        category, korvin_id, shop_id, attribute_value_id
    ) {
        return await Storage.query(
            `DELETE
                FROM shop_bindings
                WHERE (
                    category, korvin_id, shop_id, shop_attribute_value_id
                ) = (?, ?, ?, ?);`,
            category, korvin_id, shop_id, attribute_value_id
        );
    }

    static async listCategoryBindings(shop_id, category) {
        return await Storage.query(
            `SELECT korvin_id, shop_attribute_value_id AS shop_id
                 FROM shop_bindings sb
                 WHERE sb.shop_id = ? AND category = ?;`,
            shop_id, category
        );
    }

    static async getImportBindings(
        shop_id,
        shop_attribute_name,
        shop_attribute_value
    ) {
        return await Storage.query(
            `SELECT sb.category, sb.korvin_id
                FROM shop_bindings sb
                JOIN shop_attribute_values sav
                    ON sav.id = sb.shop_attribute_value_id
                JOIN shop_attributes sa
                    ON sa.id = sav.attribute_id
             WHERE sb.shop_id = ? AND sa.name = ? AND sav.value = ?;`,
            shop_id, shop_attribute_name, shop_attribute_value
        );
    }

    /**
     * Retrieves export bindings for a shop.
     * @param {number} shop_id - The ID of the shop.
     * @param {Array} korvin_entities - The array of Korvin entities.
     * @returns {Promise<Array<{
     *  name: string,
     *  value: string
     * }>>} - A promise that resolves to an array of export bindings.
     */
    static async getExportBindings(shop_id, korvin_entities) {
        if (!korvin_entities.length)
            return [];

        const data = await Storage.query(
            `SELECT DISTINCT
                sa.name,
                sav.value
            FROM shop_bindings sb
            JOIN shop_attribute_values sav
                ON sb.shop_attribute_value_id = sav.id
            JOIN shop_attributes sa
                ON sav.attribute_id = sa.id
            WHERE
                sb.shop_id = ?
                AND (sb.category, sb.korvin_id) IN (?);`,
            shop_id, korvin_entities
        );

        return data.map((row) => {
            return {name: row.name, value: row.value};
        });
    }
}

module.exports = ShopAttributeStorage;
