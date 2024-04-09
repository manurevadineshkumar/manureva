const LogModule = require("../models/LogModule");

const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

class Route {
    static async getLogModuleById({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.LOG_MODULE_READ);

        return (await LogModule.getById(id)).serialize();
    }

    static async getLogModules({user, query: {prev_id, batch_size}}) {
        await user.assertPermission(PERMISSIONS.LOG_MODULE_LIST);

        return await LogModule.list(prev_id, batch_size);
    }

    static async getFilePathById({res, user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.LOG_MODULE_LIST);

        const module = await LogModule.getById(id);

        if (!module)
            throw new HttpError(404, `Module with id ${id} not found`);

        const filepath = await module.getFilePath();

        await new Promise(resolve => res.sendFile(filepath, resolve));
    }
}

module.exports = Route;
