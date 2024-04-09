const redis = require("redis");

class LiveStorage {
    static client = null;

    static connect(params = {}) {
        if (LiveStorage.client)
            return;

        LiveStorage.client = redis.createClient({
            url: params.url || process.env.REDIS_URL
        });

        LiveStorage.client.on(
            "error",
            err => console.error("Redis error:", err)
        );

        return LiveStorage.client.connect();
    }

    static async run(...args) {
        if (!LiveStorage.client)
            await LiveStorage.connect();

        return await LiveStorage.client.sendCommand(
            args.map(
                arg => typeof arg == "object"
                    ? JSON.stringify(arg)
                    : "" + arg
            )
        );
    }

    static async subscribe(channel, callback) {
        const client = LiveStorage.client.duplicate();

        await client.connect();

        await client.subscribe(channel, callback);

        return {
            async unsubscribe() {
                await client.unsubscribe(channel);
                await client.quit();
            }
        }
    }

    static async stop() {
        if (!LiveStorage.client)
            return;

        await LiveStorage.client.quit();

        LiveStorage.client = null;
    }
}

module.exports = LiveStorage;
