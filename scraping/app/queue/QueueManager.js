const {EventEmitter} = require("events");

const LiveStorage = require("./LiveStorage");
const LiveStorageChannel = require("./LiveStorageChannel");

const Job = require("../Job");

class QueueManager extends EventEmitter {
    static SCRAPING_KEY = "is-scraping";

    static INPUT_KEY = "active-task-group-input";

    static ONGOING_KEY = "active-task-group-processed";

    static OUTPUT_KEY = "active-task-group-output";

    constructor() {
        super();

        this.channel = new LiveStorageChannel("scraping-out", "scraping-in");

        this.channel.on("begin", () => this.emit("begin"));
        this.channel.on("finish", () => this.emit("finish"));
    }

    async init() {
        return await this.channel.connect();
    }

    async getIsScraping() {
        return await LiveStorage.run(
            "EXISTS",
            QueueManager.SCRAPING_KEY
        );
    }

    async pushJob(job) {
        if (!await this.getIsScraping())
            return;

        console.log("Pushing", job);
        await LiveStorage.run(
            "RPUSH",
            QueueManager.OUTPUT_KEY,
            job.serialize()
        );

        await this.channel.publish("update");
    }

    async restoreJob(job) {
        if (!await this.getIsScraping())
            return;

        await LiveStorage.run(
            "LPUSH",
            QueueManager.INPUT_KEY,
            job.serialize()
        );

        await this.channel.publish("update");
    }

    async restoreJobs() {
        if (!await this.getIsScraping())
            return;

        const jobs = (await LiveStorage.run("HVALS", QueueManager.ONGOING_KEY))
            .map(Job.parse);

        for (const job of jobs)
            await this.restoreJob(job);

        return jobs.length;
    }

    async popJob() {
        if (!await this.getIsScraping())
            return null;

        const job = Job.parse(
            await LiveStorage.run("LPOP", QueueManager.INPUT_KEY)
        );

        if (!job)
            return null;

        await LiveStorage.run(
            "HSET",
            QueueManager.ONGOING_KEY,
            job.uuid,
            job.serialize()
        );

        await this.channel.publish("update");

        return job;
    }

    async finishJob(job) {
        if (!await this.getIsScraping())
            return;

        await LiveStorage.run(
            "HDEL",
            QueueManager.ONGOING_KEY,
            job.uuid
        );
    }

    async getHead(count = 32) {
        if (!await this.getIsScraping())
            return [];

        const jobs = await LiveStorage.run(
            "LRANGE",
            QueueManager.INPUT_KEY,
            0,
            count - 1
        ) || [];

        return jobs.map(Job.parse);
    }

    async getSize() {
        if (!await this.getIsScraping())
            return 0;

        return await LiveStorage.run("LLEN", QueueManager.INPUT_KEY) ?? 0;
    }
}

module.exports = QueueManager;
