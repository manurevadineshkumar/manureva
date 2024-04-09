const {EventEmitter} = require("events");

const TaskGroup = require("../tasks/TaskGroup");

class TaskManager extends EventEmitter {
    static INTERVAL = 10e3;

    constructor() {
        super();

        this.currentTaskGroup = null;

        TaskGroup.restore().then(() => this.update());
    }

    async serialize() {
        return {
            current: this.currentTaskGroup?.serializeShort() || null,
            schedule: (await TaskGroup.peekQueue(16))
                .map(data => new TaskGroup(data).serializeShort())
        };
    }

    async update() {
        const now = Date.now();

        clearTimeout(this.timeout);

        this.timeout = setTimeout(
            () => this.update(),
            TaskManager.INTERVAL - now % TaskManager.INTERVAL
        );

        if (this.currentTaskGroup || !await TaskGroup.hasTaskGroupArrived())
            return;

        this.currentTaskGroup = await TaskGroup.create(
            await TaskGroup.popNextTaskGroup()
        );

        this.emit(
            "update",
            {current_task_group: this.currentTaskGroup.serialize()}
        );

        this.currentTaskGroup.on("update", data => this.emit("update", data));

        await this.currentTaskGroup.run();

        await this.currentTaskGroup.delete();

        this.currentTaskGroup = null;
    }

    async stop() {
        clearTimeout(this.timeout);
    }
}

module.exports = TaskManager;
