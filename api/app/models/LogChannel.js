const crypto = require("crypto");

const LogChannelLiveStorage = require("../live-storage/LogChannelLiveStorage");

class LogChannel {
    static MIN_MESSAGE_INTERVAL = 100;

    constructor(uuid, alias) {
        this.uuid = uuid;
        this.alias = alias;
        this.lastMessage = null;
        this.lastMessageTime = 0;
    }

    /**
     * Get the number of subscribers to the channel
     * @return {Promise<Number>}
     */
    async countSubscribers() {
        return await LogChannelLiveStorage.countSubscribers(this.uuid);
    }

    /**
     * Log a message to the channel
     * @param message {Object}
     * @return {Promise<void>}
     */
    async log(message) {
        if (!message)
            return;

        const now = Date.now();
        const next_time = this.lastMessageTime
            + LogChannel.MIN_MESSAGE_INTERVAL;

        if (next_time < now) {
            this.lastMessage = null;
            this.lastMessageTime = now;

            return await LogChannelLiveStorage.publish(
                this.uuid,
                {
                    type: "message",
                    message
                }
            );
        }

        const had_message = !!this.lastMessage;

        this.lastMessage = message;

        if (had_message)
            return;

        setTimeout(
            () => this.log(this.lastMessage),
            next_time - now
        );
    }

    /**
     * Emit an `end` event and destroy the channel
     * @return {Promise<void>}
     */
    async end() {
        while (await this.countSubscribers()) {
            await LogChannelLiveStorage.publish(this.uuid, {type: "end"});
            await new Promise(resolve => setTimeout(resolve, 1e3));
        }

        if (this.alias)
            await LogChannelLiveStorage.deleteAlias(this.alias);

        await LogChannelLiveStorage.delete(this.uuid);
    }

    /**
     * Create a new channel, create an alias if `alias` is specified
     * @param alias {?String}
     * @return {Promise<LogChannel>}
     */
    static async create(alias = null) {
        const uuid = crypto.randomUUID();

        await LogChannelLiveStorage.create(uuid);

        if (alias)
            await LogChannelLiveStorage.createAlias(alias, uuid);

        return new LogChannel(uuid, alias);
    }

    /**
     * Get a channel UUID by its alias
     * @param alias {String}
     * @return {Promise<?LogChannel>}
     */
    static async getUuidByAlias(alias) {
        return await LogChannelLiveStorage.getUuidByAlias(alias);
    }

    /**
     * Get a channel by its UUID
     * @param uuid {String}
     * @return {Promise<?LogChannel>}
     */
    static async getByUuid(uuid) {
        return await LogChannelLiveStorage.exists(uuid)
            ? new LogChannel(uuid)
            : null;
    }
}

module.exports = LogChannel;
