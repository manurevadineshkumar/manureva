const LogChannelLiveStorage = require("../live-storage/LogChannelLiveStorage");

const {EventEmitter} = require("events");

class LogChannelSubscription extends EventEmitter {
    static HANDLERS = {
        message: LogChannelSubscription.prototype.processMessage,
        update: LogChannelSubscription.prototype.doHeartbeat,
        end: LogChannelSubscription.prototype.end
    };

    static HEARTBEAT_INTERVAL = 60e3;

    constructor(uuid, client) {
        super();

        this.uuid = uuid;
        this.client = client;
        this.interval = setInterval(
            () => void this.doHeartbeat(),
            LogChannelSubscription.HEARTBEAT_INTERVAL
        );

        void client.subscribe(
            LogChannelLiveStorage.PREFIX + uuid,
            data => {
                const {type, message} = JSON.parse(data);

                void LogChannelSubscription.HANDLERS[type]?.call(this, message);
            }
        );
    }

    async doHeartbeat() {
        if (!await LogChannelLiveStorage.exists(this.uuid))
            await this.end();
    }

    processMessage(message) {
        this.emit("message", message);
    }

    static async getByUuid(uuid) {
        const client = await LogChannelLiveStorage.getClient(uuid);

        return client ? new LogChannelSubscription(uuid, client) : null;
    }

    async sendLastLog() {
        const last_log = await LogChannelLiveStorage.getLastLog(this.uuid);

        if (last_log?.message)
            this.emit("message", last_log.message);
    }

    async end() {
        if (!this.client)
            return;

        await this.client.quit();

        this.client = null;
        this.lastMessage = null;

        this.emit("end");

        clearInterval(this.interval);
    }
}

module.exports = LogChannelSubscription;
