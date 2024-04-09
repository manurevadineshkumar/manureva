const LiveStorage = require("./LiveStorage");

class JobLiveStorage {
    static PREFIX = "task:";

    static QUEUE_SUFFIX = ":jobs:queue";

    static ONGOING_SUFFIX = ":jobs:ongoing";

    static async createBatch(task_id, batch) {
        return await LiveStorage.run(
            "LPUSH",
            JobLiveStorage.PREFIX + task_id + JobLiveStorage.QUEUE_SUFFIX,
            ...batch.map(data => JSON.stringify(data)).join(" ")
        );
    }
}

module.exports = JobLiveStorage;
