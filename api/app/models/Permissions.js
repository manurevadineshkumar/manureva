const PermissionsStorage = require("../storage/PermissionsStorage");

const PERMISSIONS_DATA = require("../const/permissions.json").permissions;

class Permissions {
    constructor(data) {
        this.user_id = data.user_id;
        this.cache = {};
    }

    static PERMISSIONS = Object.freeze(Object.fromEntries(
        PERMISSIONS_DATA.map(({id, name}) => [name, id])
    ));

    static PERMISSION_IDS = Object.freeze(Object.fromEntries(
        PERMISSIONS_DATA.map(({id, name}) => [id, name])
    ));

    static DEFAULT_PERMISSIONS_LIST = Object.freeze(
        PERMISSIONS_DATA
            .filter(({is_default}) => is_default)
            .map(({id}) => id)
    );

    async grant(permission_ids) {
        if (!permission_ids.every(id => Permissions.PERMISSION_IDS[id]))
            return false;

        if (permission_ids.length === 0)
            return false;

        await PermissionsStorage.grantPermissions(
            this.user_id, permission_ids
        );

        permission_ids.forEach(permission_id => {
            this.cache[permission_id] = true;
        });

        return true;
    }

    async revoke(permission_ids) {
        if (!permission_ids.every(id => Permissions.PERMISSION_IDS[id]))
            return false;

        await PermissionsStorage.revokePermissions(
            this.user_id, permission_ids
        );

        permission_ids.forEach(permission_id => {
            this.cache[permission_id] = false;
        });

        return true;
    }

    async set(permission_ids) {
        const permissionsToRevoke = this.cache ?
            Object.values(Permissions.PERMISSIONS) :
            Object.keys(this.cache) ?? [];
        await PermissionsStorage.revokePermissions(
            this.user_id, permissionsToRevoke
        );
        this.cache = {};

        await PermissionsStorage.grantPermissions(
            this.user_id, permission_ids
        );
        this.cache = Object.fromEntries(
            permission_ids.map(id => [id, true])
        );

        return true;
    }

    async list() {
        const permission_ids = await PermissionsStorage.listPermissions(
            this.user_id
        );

        permission_ids.forEach(permission_id => {
            this.cache[permission_id] = true;
        });

        return permission_ids.map(id => Permissions.PERMISSION_IDS[id]);
    }

    async has(permission_id) {
        if (this.cache[permission_id] === undefined)
            this.cache[permission_id] = PermissionsStorage.hasPermission(
                this.user_id, permission_id
            );

        return await Promise.resolve(this.cache[permission_id]);
    }
}

module.exports = Permissions;
