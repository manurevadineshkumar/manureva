const Storage = require("./Storage");

class ProductImageStorage extends Storage {
    static async addImages(product_id, uuids) {
        return Storage.query(
            `INSERT
                INTO product_images (product_id, source_url, uuid)
                VALUES ?;`,
            uuids.map(({source_url, uuid}) =>
                [product_id, source_url, uuid]
            )
        ).then(result => result.insertId);
    }

    static async removeImages(product_id) {
        return Storage.query(
            `DELETE
                FROM product_images
                WHERE product_id = ?;`,
            product_id
        ).then(result => result.affectedRows);
    }

    static async deleteImagesByUuids(product_id, uuids) {
        return Storage.query(
            `DELETE
                FROM product_images
                WHERE product_id = ?
                AND uuid IN (?);`,
            product_id,
            uuids
        ).then(result => result);
    }

    static async getImagesById(product_id) {
        return Storage.query(
            `SELECT *
                FROM product_images
                WHERE product_id = ?;`,
            product_id
        ).then(result => result);
    }

    static async listUncropped(prev_id, count) {
        return Storage.query(
            `SELECT pi.*
                FROM product_images pi
                JOIN products p ON pi.product_id = p.id
                WHERE p.status = 'ACTIVE'
                    AND pi.id > ?
                    AND NOT pi.has_cropped_version
                ORDER BY pi.id
                LIMIT ?;`,
            prev_id,
            count
        ).then(result => result);
    }

    static async listCropped(prev_id, count) {
        return Storage.query(
            `SELECT pi.*
                FROM product_images pi
                JOIN products p ON pi.product_id = p.id
                WHERE p.status = 'DISABLED'
                    AND pi.id > ?
                    AND pi.has_cropped_version
                ORDER BY pi.id
                LIMIT ?;`,
            prev_id,
            count
        ).then(result => result);
    }

    static async listAll(prev_id, count) {
        return Storage.query(
            `SELECT pi.*
                FROM product_images pi
                JOIN products p ON pi.product_id = p.id
                WHERE pi.id > ?
                ORDER BY pi.id
                LIMIT ?;`,
            prev_id,
            count
        ).then(result => result);
    }

    static async countUncropped() {
        return Storage.query(
            `SELECT COUNT(*) AS count
                FROM product_images pi
                JOIN products p ON pi.product_id = p.id
                WHERE p.status = 'ACTIVE'
                    AND NOT pi.has_cropped_version;`
        ).then(result => result[0].count);
    }

    static async countCropped() {
        return Storage.query(
            `SELECT COUNT(*) AS count
                FROM product_images pi
                JOIN products p ON pi.product_id = p.id
                WHERE p.status = 'DISABLED'
                    AND pi.has_cropped_version;`
        ).then(result => result[0].count);
    }

    static async countAll() {
        return Storage.query(
            `SELECT COUNT(*) AS count
                FROM product_images;`
        ).then(result => result[0].count);
    }

    static async setCropped(id, value = true) {
        return Storage.query(
            `UPDATE product_images
                SET has_cropped_version = ?
                WHERE id = ?;`,
            value,
            id
        ).then(result => result.affectedRows);
    }

    static async setUuidById(id, new_uuid) {
        return Storage.query(
            `UPDATE product_images
                SET uuid = ?
                WHERE id = ?;`,
            new_uuid,
            id
        ).then(result => result.affectedRows);
    }

}

module.exports = ProductImageStorage;
