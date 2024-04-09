const crypto = require("crypto");

const LiveStorage = require("./LiveStorage");

class TaskGroupLiveStorage {
    static QUEUE_KEY = "task-groups-queue";

    static ACTIVE_KEY = "active-task-group";

    static INPUT_KEY = "active-task-group-input";

    static ONGOING_KEY = "active-task-group-processed";

    static OUTPUT_KEY = "active-task-group-output";

    static SCRAPING_KEY = "is-scraping";

    static async createQueued(data) {
        return await LiveStorage.run(
            "ZADD",
            TaskGroupLiveStorage.QUEUE_KEY,
            +data.date || 0,
            JSON.stringify(data)
        );
    }

    static async peekQueue(count = 1) {
        return (await LiveStorage.run(
            "ZRANGE",
            TaskGroupLiveStorage.QUEUE_KEY,
            0, count - 1
        )).map(data => JSON.parse(data || null));
    }

    static async hasTaskGroupArrived() {
        return !!(await LiveStorage.run(
            "ZRANGEBYSCORE",
            TaskGroupLiveStorage.QUEUE_KEY,
            "-inf", Date.now(),
            "LIMIT", "0", "1"
        ))[0];
    }

    static async popNextTaskGroup() {
        return JSON.parse((await LiveStorage.run(
            "ZPOPMIN",
            TaskGroupLiveStorage.QUEUE_KEY
        ))[0] ?? null);
    }

    static async create(data) {
        return await LiveStorage.run(
            "SET", TaskGroupLiveStorage.ACTIVE_KEY,
            JSON.stringify(data)
        );
    }

    static async delete() {
        return await LiveStorage.run(
            "DEL",
            TaskGroupLiveStorage.ACTIVE_KEY,
            TaskGroupLiveStorage.INPUT_KEY,
            TaskGroupLiveStorage.ONGOING_KEY,
            TaskGroupLiveStorage.OUTPUT_KEY,
            TaskGroupLiveStorage.SCRAPING_KEY
        );
    }

    static async popInput() {
        const entry = await LiveStorage.run(
            "LPOP",
            TaskGroupLiveStorage.INPUT_KEY
        );
        const data = JSON.parse(entry || null);

        if (!data)
            return null;

        const uuid = crypto.randomUUID();

        await LiveStorage.run(
            "HSET",
            TaskGroupLiveStorage.ONGOING_KEY,
            uuid,
            entry
        );

        return {...data, uuid};
    }

    static async popInputBatch(count = 32) {
        const entries = await LiveStorage.run(
            "LPOP",
            TaskGroupLiveStorage.INPUT_KEY,
            count
        ) || [];
        const result = entries.map(entry => ({
            ...JSON.parse(entry),
            uuid: crypto.randomUUID()
        }));

        if (result.length)
            await LiveStorage.run(
                "HSET",
                TaskGroupLiveStorage.ONGOING_KEY,
                ...result.flatMap(({uuid, ...data}) => [uuid, data])
            );

        return result;
    }

    static async restoreEntry(uuid) {
        const value = await LiveStorage.run(
            "HGET",
            TaskGroupLiveStorage.ONGOING_KEY,
            uuid
        );

        if (!value)
            return;

        await LiveStorage.run("RPUSH", TaskGroupLiveStorage.INPUT_KEY, value);

        await TaskGroupLiveStorage.completeEntry(uuid);
    }

    static async completeEntry(uuid) {
        await LiveStorage.run(
            "HDEL",
            TaskGroupLiveStorage.ONGOING_KEY,
            uuid
        );
    }

    static async completeEntries(uuids) {
        await LiveStorage.run(
            "HDEL",
            TaskGroupLiveStorage.ONGOING_KEY,
            ...uuids
        );
    }

    static async hasFinished() {
        return await LiveStorage.run(
            "LLEN", TaskGroupLiveStorage.INPUT_KEY
        ) === 0 && await LiveStorage.run(
            "HLEN", TaskGroupLiveStorage.ONGOING_KEY
        ) === 0;
    }

    static async getInputSize() {
        return await LiveStorage.run(
            "LLEN",
            TaskGroupLiveStorage.INPUT_KEY
        ) ?? 0;
    }

    static async getOngoingSize() {
        return await LiveStorage.run(
            "HLEN",
            TaskGroupLiveStorage.ONGOING_KEY
        ) ?? 0;
    }

    static async getOutputSize() {
        return await LiveStorage.run(
            "LLEN",
            TaskGroupLiveStorage.OUTPUT_KEY
        ) ?? 0;
    }

    static async getInputHead(count = 32) {
        const elements = await LiveStorage.run(
            "LRANGE",
            TaskGroupLiveStorage.INPUT_KEY,
            0,
            count - 1
        );

        return elements.map(it => JSON.parse(it));
    }

    static async pushOutput(output) {
        return await LiveStorage.run(
            "RPUSH",
            TaskGroupLiveStorage.OUTPUT_KEY,
            JSON.stringify(output)
        );
    }

    static async setScraping(value) {
        if (value)
            return await LiveStorage.run(
                "SET",
                TaskGroupLiveStorage.SCRAPING_KEY,
                1
            );

        await LiveStorage.run(
            "DEL",
            TaskGroupLiveStorage.SCRAPING_KEY
        );
    }

    static async restore() {
        const current = JSON.parse(
            await LiveStorage.run(
                "GET", TaskGroupLiveStorage.ACTIVE_KEY
            ) ?? null
        );

        if (current)
            await TaskGroupLiveStorage.createQueued(current);

        const entries = await LiveStorage.run(
            "HVALS",
            TaskGroupLiveStorage.ONGOING_KEY
        );

        if (entries.length)
            await LiveStorage.run(
                "LPUSH",
                TaskGroupLiveStorage.INPUT_KEY,
                ...entries
            );

        await LiveStorage.run(
            "DEL",
            TaskGroupLiveStorage.ACTIVE_KEY,
            TaskGroupLiveStorage.ONGOING_KEY,
            TaskGroupLiveStorage.SCRAPING_KEY
        );

        return entries.length;
    }

    static async rotate() {
        if (await LiveStorage.run("EXISTS", TaskGroupLiveStorage.OUTPUT_KEY))
            await LiveStorage.run(
                "RENAME",
                TaskGroupLiveStorage.OUTPUT_KEY,
                TaskGroupLiveStorage.INPUT_KEY
            );
    }
}

module.exports = TaskGroupLiveStorage;
