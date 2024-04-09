const Storage = require("./Storage");

class UserStorage {
    static async create(data) {
        return await Storage.query(
            `INSERT
                INTO users
                SET ?;`,
            data
        ).then(result => result.insertId);
    }

    static async update(id, data) {
        return await Storage.query(
            `UPDATE users
                SET ?
                WHERE id = ?`,
            data, id
        ).then(result => result.affectedRows);
    }

    static async getById(id) {
        return await Storage.query(
            `SELECT *
                FROM users
                WHERE id = ?;`,
            id
        ).then(result => result[0]);
    }

    static async getByUsername(username) {
        return await Storage.query(
            `SELECT *
                FROM users
                WHERE username = ?;`,
            username
        ).then(result => result[0]);
    }

    static async getByEmail(email) {
        return await Storage.query(
            `SELECT *
                FROM users
                WHERE email = ?;`,
            email
        ).then(result => result[0]);
    }

    static async listAll(prev_id, batch_size) {
        return await Storage.query(
            `SELECT *
                FROM users
                WHERE id > ?
                LIMIT ?;`,
            prev_id,
            batch_size
        );
    }

    static async listTagsByUserId(user_id) {
        return await Storage.query(
            `SELECT 
                t.id AS tag_id, 
                t.name AS tag_name,
                pg.user_id AS user_id
            FROM tags AS t
            LEFT JOIN products_groups AS pg ON t.products_group_id = pg.id
            WHERE pg.user_id = ?;`,
            user_id
        );
    }

    static async getCountryOfUserId(userId) {
        return await Storage.query(
            `SELECT c.*
                FROM users AS u
                LEFT JOIN countries AS c ON u.address_country_id = c.id
                WHERE u.id = ?;`,
            userId
        ).then(result => result[0]);
    }
}

module.exports = UserStorage;
