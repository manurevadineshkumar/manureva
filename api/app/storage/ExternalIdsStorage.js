const Storage = require("./Storage");

class ExternalIdsStorage extends Storage {
    static async setExternalId(product_id, service_name, external_id) {
        return await Storage.query(
            `INSERT
                INTO product_external_ids (
                    product_id, service_name, external_id, last_update
                ) VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE external_id = ?, last_update = NOW();`,
            product_id,
            service_name,
            external_id,
            external_id
        ).then(result => result.insertId);
    }
}

module.exports = ExternalIdsStorage;
