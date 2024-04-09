const Storage = require("./Storage");

class PermissionsStorage {
    static async grantPermissions(user_id, permission_ids) {
        return await Storage.query(
            `INSERT IGNORE
                INTO user_permissions
                VALUES ?`,
            permission_ids.map(permission_id => [user_id, permission_id])
        ).then(result => result.affectedRows);
    }

    static async revokePermissions(user_id, permission_ids) {
        return await Storage.query(
            `DELETE
                FROM user_permissions
                WHERE user_id = ?
                AND permission_id IN (?)`,
            user_id, permission_ids
        ).then(result => result.affectedRows);
    }

    static async listPermissions(user_id) {
        return await Storage.query(
            `SELECT *
                FROM user_permissions
                WHERE user_id = ?`,
            user_id
        ).then(result => result.map(row => row.permission_id));
    }

    static async hasPermission(user_id, permission_id) {
        return await Storage.query(
            `SELECT EXISTS(
                SELECT *
                    FROM user_permissions
                    WHERE user_id = ? AND (
                        permission_id = 1 OR permission_id = ?
                    )
            ) AS has_permission;`,
            user_id, permission_id
        ).then(result => !!result[0].has_permission);
    }
}

module.exports = PermissionsStorage;
