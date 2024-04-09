const Storage = require("./Storage");

class UserCertificateStorage extends Storage {
    static async create(user_id, filename) {
        return await Storage.query(
            `INSERT INTO user_certificates
                SET ?;`,
            {user_id, filename}
        ).then(result => result.insertId);
    }

    static async delete(user_id, filename) {
        return await Storage.query(
            `DELETE
                FROM user_certificates
                WHERE user_id = ? AND filename = ?;`,
            user_id, filename
        ).then(result => result.affectedRows);
    }

    static async getByIds(ids) {
        return await Storage.query(
            `SELECT *
                FROM user_certificates
                WHERE filename IN (?);`,
            ids
        );
    }

    static async listAllById(user_id) {
        return await Storage.query(
            `SELECT *
                FROM user_certificates
                WHERE user_id = ?;`,
            user_id
        ).then(result => result.map(row => row.filename));
    }
}

module.exports = UserCertificateStorage;
