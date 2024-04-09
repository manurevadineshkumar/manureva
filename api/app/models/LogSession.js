const LoggerStorage = require("../storage/LoggerStorage");
const HttpError = require("../errors/HttpError");

class LogSession {

    static TABLENAME = LoggerStorage.TABLENAME.sessions;

    constructor(data) {
        this.id              = +data.id;
        this.name            = data.name;
        this.createdProducts = +data.created_products;
        this.updatedProducts = +data.updated_products;
        this.deletedProducts = +data.deleted_products;
        this.startTime       = new Date(data.start_time);
        this.endTime         = new Date(data.end_time);
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            created_products: this.createdProducts,
            updated_products: this.updatedProducts,
            deleted_products: this.deletedProducts,
            start_time: this.startTime,
            end_time: this.endTime
        };
    }

    static async create(sessionName) {
        const sessionId = await LoggerStorage.create(
            LoggerStorage.TABLENAME.sessions, {name: sessionName}
        );

        return await LogSession.getById(sessionId);
    }

    async update(data) {
        return await LoggerStorage.update(
            LoggerStorage.TABLENAME.sessions,
            this.id,
            data
        );
    }

    static async getById(id) {
        const session = await LoggerStorage.getById(LogSession.TABLENAME, id);

        if (!session) {
            throw new HttpError(404, `Session with id ${id} not found`);
        }

        return new LogSession(session);
    }

    static async list(prevId = 0, batchSize = 8) {
        const sessions = await LoggerStorage.get(
            LogSession.TABLENAME, prevId, batchSize + 1
        );

        return {
            items: sessions
                .slice(0, batchSize)
                .map(session => new LogSession(session).serialize()),
            ...(sessions.length < batchSize + 1 ? {is_last_batch: 1} : {})
        };
    }

}

module.exports = LogSession;
