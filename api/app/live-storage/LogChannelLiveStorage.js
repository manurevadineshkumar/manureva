const LiveStorage = require("./LiveStorage");

class LogChannelLiveStorage {
    static PREFIX = "log-channel:";
    static ALIAS_PREFIX = "log-channel-alias:";

    static async exists(uuid) {
        return !!await LiveStorage.run(
            "EXISTS", LogChannelLiveStorage.PREFIX + uuid
        );
    }

    static async getLastLog(uuid) {
        const data = await LiveStorage.run(
            "GET", LogChannelLiveStorage.PREFIX + uuid
        );

        return data ? JSON.parse(data) : null;
    }

    static async getUuidByAlias(alias) {
        const uuid = await LiveStorage.run(
            "GET", LogChannelLiveStorage.ALIAS_PREFIX + alias
        );

        return uuid && await LogChannelLiveStorage.exists(uuid)
            ? uuid
            : null;
    }

    static async create(uuid) {
        return await LiveStorage.run(
            "SET", LogChannelLiveStorage.PREFIX + uuid, "null"
        );
    }

    static async createAlias(alias, uuid) {
        return await LiveStorage.run(
            "SET", LogChannelLiveStorage.ALIAS_PREFIX + alias, uuid
        );
    }

    static async countSubscribers(uuid) {
        return +(await LiveStorage.run(
            "PUBSUB", "NUMSUB", LogChannelLiveStorage.PREFIX + uuid
        ))[1];
    }

    static async publish(uuid, data) {
        const str_data = JSON.stringify(data);

        await LiveStorage.run(
            "SET", LogChannelLiveStorage.PREFIX + uuid, str_data
        );
        return await LiveStorage.run(
            "PUBLISH", LogChannelLiveStorage.PREFIX + uuid, str_data
        );
    }

    static async getClient(uuid) {
        if (!await LogChannelLiveStorage.exists(uuid))
            return null;

        const client = LiveStorage.client.duplicate();

        await client.connect();

        return client;
    }

    static async delete(uuid) {
        return await LiveStorage.run(
            "DEL",
            LogChannelLiveStorage.PREFIX + uuid
        );
    }

    static async deleteAlias(alias) {
        return await LiveStorage.run(
            "DEL", LogChannelLiveStorage.ALIAS_PREFIX + alias
        );
    }
}

module.exports = LogChannelLiveStorage;
