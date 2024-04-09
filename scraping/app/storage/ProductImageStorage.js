const Storage = require("./Storage");

class ProductImageStorage extends Storage {
    static async getImagesById(product_id) {
        return Storage.query(
            `SELECT *
                FROM product_images
                WHERE product_id = ?;`,
            product_id
        ).then(result => result);
    }

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
}

module.exports = ProductImageStorage;
