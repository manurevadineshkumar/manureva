<script>
import Socket from "../../services/Socket.js";

export default {
    mounted() {
        this.socket.connect("scheduler");
        this.socket.emit("init");

        this.socket.on("connect_error", err => {
            if (err.message == "Unauthorized") {
                window.location = "/";
                return;
            }

            if (err.message == "Forbidden")
                return alert("Error: insufficient privileges");

            alert(err);
        });

        this.socket.on("init", data => this.init(data));
        this.socket.on("update", data => this.update(data));
    },

    unmounted() {
        this.socket.disconnect();
    },

    data() {
        return {
            socket: new Socket(),
            currentTaskGroup: null,
            schedule: []
        };
    },

    computed: {
        currentTasks() {
            return this.currentTaskGroup?.tasks[
                this.currentTaskGroup?.current_step
            ];
        }
    },

    methods: {
        init(data) {
            this.currentTaskGroup = data.current;
            this.schedule = data.schedule;

            this.updateTimers();
        },

        update(data) {
            if (data.current_task_group) {
                this.currentTaskGroup = data.current_task_group;
                this.schedule = this.schedule.filter(it =>
                    it.id != this.currentTaskGroup.id
                );
            }

            if (data.step === this.currentTaskGroup.tasks.length) {
                this.currentTaskGroup = null;
                return;
            }

            if (data.step !== undefined)
                this.currentTaskGroup.current_step = data.step;

            if (data.task_idx !== undefined) {
                const task = this.currentTasks[data.task_idx];

                if (data.progress !== undefined)
                    task.progress = data.progress;
                if (data.failed !== undefined)
                    task.failed = data.failed;
                if (data.total !== undefined)
                    task.total = data.total;
            }
        },

        updateTimers() {
            setTimeout(() => this.updateTimers(), 1e3 - Date.now() % 1e3);

            if (this.currentTaskGroup) {
                const delta = new Date(
                    Date.now() - this.currentTaskGroup.start_date
                );

                this.currentTaskGroup.running_time = delta
                    .toISOString()
                    .split("T")[1]
                    .substring(0, 8);
            }
            this.schedule.forEach(task_group => {
                const delta = new Date(task_group.date - Date.now());

                task_group["remaining_time"] =
                    delta < 0
                        ? "Starting soon..."
                        : delta > 24 * 60 * 60 * 1e3
                            ? "> 1 day"
                            : delta.toISOString().split("T")[1].substring(0, 8);
            });
        }
    }
};
</script>

<template>
    <div class="running-tasks" v-if="currentTaskGroup">
        <h1>Running tasks</h1>
        <div class="tasks-list">
            <div class="task active" v-for="task in currentTasks">
                <h2 v-text="task.operation_id"></h2>
                <div class="progress">
                    <div>
                        <div class="fill"
                            v-bind:style="{width: task.progress / task.total * 100 + '%'}"></div>
                        <div class="fill error-fill"
                            v-bind:style="{width: task.failed / task.total * 100 + '%'}"></div>
                    </div>
                    <span v-text="task.progress + ' / ' + task.total"></span>
                </div>
            </div>
        </div>
    </div>
    <div class="running-task-group" v-if="currentTaskGroup">
        <h1>Running task group</h1>
        <table>
            <tbody>
            <tr>
                <th>ID</th>
                <td class="id-td" v-text="currentTaskGroup.id"></td>
            </tr>
            <tr>
                <th>Title</th>
                <td v-text="currentTaskGroup.title"></td>
            </tr>
            <tr>
                <th>Running time</th>
                <td v-text="currentTaskGroup.running_time"></td>
            </tr>
            <tr>
                <th>Step</th>
                <td v-text="currentTaskGroup.current_step + 1 + ' / ' + currentTaskGroup.tasks.length"></td>
            </tr>
            </tbody>
        </table>
    </div>
    <div class="scheduled-tasks">
        <h1>Schedule</h1>
        <div class="scheduled-tasks-list">
            <div class="scheduled-task" v-for="task_group in schedule">
                <h2 v-text="task_group.title"></h2>
                <p v-text="task_group.remaining_time"></p>
            </div>
        </div>
    </div>
</template>

<style>
h1 {
    font-size: 16pt;
    margin: 0 0 20px 0;
}

.scheduled-tasks {
    min-height: 300px;
}
.running-tasks, .running-task-group {
    flex: 1;
    min-width: min(500px, 100%);
}
.tasks-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.running-task-group > table {
    width: 100%;
}
.running-task-group > table th, .running-task-group > table td {
    width: 50%;
    padding: 5px 10px;
}
.running-task-group > table th {
    text-align: right;
}
.running-task-group > table .id-td {
    font-family: monospace;
    font-size: 12pt;
    user-select: all;
}

.scheduled-tasks {
    width: 100%;
}
.scheduled-tasks-list {
    min-width: 100%;
    gap: 20px;
    flex: 1;
    display: flex;
    flex-wrap: wrap;
}
.scheduled-tasks-list > h1 {
    width: 100%;
}
.scheduled-task {
    background: var(--light-grey-0);
    width: 200px;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
}
.scheduled-task h2 {
    margin: 0;
    font-size: 14pt;
}
.scheduled-task p {
    margin: 10px 0 0 0;
    font-size: 12pt;
    background: var(--off-white);
    border-radius: 10px;
}
.scheduled-tasks-list:empty::after {
    content: "No tasks scheduled";
    width: 100%;
    margin-top: 60px;
    font-size: 24pt;
    text-align: center;
    opacity: .5;
}

.task {
    position: relative;
    --color: #3a4;
    padding: 20px;
    background: var(--light-grey-0);
    border-radius: 5px;
}
.task.paused {
    --color: #bbb;
}
.task > .actions {
    position: absolute;
    top: 10px;
    right: 10px;
}
.task > .actions > div {
    display: inline-block;
    width: 20px;
    height: 20px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity: .4;
    cursor: pointer;
}
.task > .actions > div::before {
    content: "";
    display: block;
    width: 20px;
    height: 20px;
    background: #fff4;
    border-radius: 10px;
    opacity: 0;
    transition: opacity .2s ease-in-out;
}
.task > .actions > div:hover::before {
    opacity: 1;
}
.task > .actions > .pause-action { background-image: url("/icons/pause.svg"); }
.task.paused > .actions > .pause-action { background-image: url("/icons/play.svg"); }
.task > .actions > .stop-action { background-image: url("/icons/stop.svg"); }
.task > .progress {
    padding-top: 0;
    max-height: 0;
    overflow: hidden;
    transition: max-height .2s ease-in-out, padding-top .2s ease-in-out;
}
.task.active > .progress {
    padding-top: 15px;
    max-height: 60px;
}
.task > h2 {
    font-size: 14pt;
    margin: 0;
    text-align: center;
}
.task > .progress > div {
    position: relative;
    width: 100%;
    height: 5px;
    background: var(--off-white);
    border-radius: 10px;
}
.task > .progress > div > .fill {
    position: absolute;
    background: var(--color);
    height: 100%;
    width: 0;
    border-radius: 10px;
    transition: background .2s ease-in-out;
}
.task > .progress > div > .error-fill {
    --color: #c44;
}
.task > .progress > span {
    display: block;
    text-align: center;
    margin: 10px 0 0 0;
}
</style>
