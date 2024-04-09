const LogSession = require("../models/LogSession");
const LogModule = require("../models/LogModule");
const LogProduct = require("../models/LogProduct");

const {PERMISSIONS} = require("../models/Permissions");

class Route {
    static async getLogSessionById({
        user,
        path: {id},
        query: {prev_id, batch_size}
    }) {
        await user.assertPermission(PERMISSIONS.LOG_SESSION_LIST);

        const modules = await LogModule.getModulesBySessionId(
            prev_id,
            batch_size,
            id
        );
        return {
            items: modules,
            ...(await LogSession.getById(id)).serialize(),
            ...(modules.length < batch_size ? {is_last_batch: 1} : {})

        };
    }

    static async getLogSessions({user, query: {prev_id, batch_size}}) {
        await user.assertPermission(PERMISSIONS.LOG_SESSION_LIST);

        return await LogSession.list(prev_id, batch_size);
    }

    static async getLogProductsBySessionId({
        user,
        path: {id},
        query: {prev_id, batch_size}
    }) {
        await user.assertPermission(PERMISSIONS.LOG_PRODUCT_READ);

        return LogProduct.listBySessionId(prev_id, batch_size, id);
    }
}

module.exports = Route;
