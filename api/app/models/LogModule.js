const path = require("path");

const FilesystemManager = require("../services/FilesystemManager");
const LoggerStorage = require("../storage/LoggerStorage");
const LogSession = require("./LogSession");

const HttpError = require("../errors/HttpError");

class LogModule {
    static TABLENAME = LoggerStorage.TABLENAME.modules;

    static LOG_PATH = path.join(FilesystemManager.STATIC_PATH, "logs");

    constructor(data) {
        this.id         = +data.id;
        this.fd         = null;
        this.name       = data.name;
        this.filePath   = data.file_path;
        this.totalCount = +data.total_count;
        this.failCount  = +data.fail_count;
        this.startTime  = new Date(data.start_time);
        this.endTime    = new Date(data.end_time);
        this.sessionId  = +data.session_id;
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            file_path: this.filePath,
            total_count: this.totalCount,
            fail_count: this.failCount,
            start_time: this.startTime,
            end_time: this.endTime,
            session_id: this.sessionId
        };
    }

    static async getById(id) {
        const module = await LoggerStorage.getById(LogModule.TABLENAME, id);

        if (!module) {
            throw new HttpError(404, `Module with id ${id} not found`);
        }

        return new LogModule(module);
    }

    static async list(prevId = 0, batchSize = 8) {
        const modules = await LoggerStorage.get(
            LogModule.TABLENAME, prevId, batchSize + 1
        );

        return {
            items: modules
                .slice(0, batchSize)
                .map(module => new LogModule(module).serialize()),
            ...(modules.length < batchSize + 1 ? {is_last_batch: 1} : {})
        };
    }

    static async getModulesBySessionId(prevId, batchSize, sessionId) {
        return await LoggerStorage.getModulesBySessionId(
            prevId,
            batchSize,
            sessionId
        );
    }

    static async create(sessionId, moduleName, filePath, fd) {
        const moduleId = await LoggerStorage.create(
            LoggerStorage.TABLENAME.modules,
            {
                name: moduleName,
                file_path: filePath,
                session_id: sessionId
            });

        const module = await LogModule.getById(moduleId);
        module.fd = fd;

        return module;
    }

    async update(data) {
        return await LoggerStorage.update(
            LoggerStorage.TABLENAME.modules,
            this.id,
            data
        );
    }

    async getFilePath() {
        const session = await LogSession.getById(this.sessionId);

        return path.join(LogModule.LOG_PATH, session.name, this.filePath);
    }
}

module.exports = LogModule;
