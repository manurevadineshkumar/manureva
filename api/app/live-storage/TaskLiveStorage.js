const LiveStorage = require("./LiveStorage");

class TaskLiveStorage {
    static PREFIX = "task:";

    static async create(data) {
        return await LiveStorage.run(
            "SET", TaskLiveStorage.PREFIX + data.id,
            JSON.stringify(data)
        );
    }

    static async delete(id) {
        return await LiveStorage.run("DEL", TaskLiveStorage.PREFIX + id);
    }
}

module.exports = TaskLiveStorage;
