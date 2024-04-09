const Storage = require("./Storage");

class CountryStorage extends Storage {
    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM countries
                WHERE id = ?;`,
            id
        ).then(rows => rows[0] || null);
    }

    static async listAll() {
        return await Storage.query(
            `SELECT * FROM countries;`
        );
    }

    static async getWeightShippingPrice(shipping_zone, weight_grams) {
        const [{price_cents}] = await Storage.query(
            `SELECT
                price_cents + IF(
                    ? > weight_grams,
                    CEIL((? - weight_grams) / 500) * (
                        SELECT price_cents
                            FROM shipping_zone_prices
                            WHERE (weight_grams, shipping_zone) = (0, ?)
                        ),
                        0
                ) AS price_cents FROM (
                    SELECT weight_grams, price_cents
                    FROM shipping_zone_prices
                    WHERE shipping_zone = ? AND weight_grams = IFNULL(
                        (
                            SELECT MIN(weight_grams)
                            FROM shipping_zone_prices
                            WHERE shipping_zone = ? AND weight_grams >= ?
                        ), (
                            SELECT MAX(weight_grams) FROM shipping_zone_prices
                        )
                    )
                ) t;`,
            weight_grams, weight_grams, shipping_zone, shipping_zone,
            shipping_zone, weight_grams
        );

        return price_cents;
    }
}

module.exports = CountryStorage;
