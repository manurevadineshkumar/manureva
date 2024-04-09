const crypto = require("crypto");

const {EventEmitter} = require("events");

const Utils = require("../services/Utils");

class Task extends EventEmitter {
    constructor(data) {
        super();

        /**
         * The uuid of the task
         * @type {string}
         */
        this.id = data.id ?? crypto.randomUUID();
        /**
         * The unique type of the operation
         * @type {string}
         */
        this.operationId = data.operation_id;
        /**
         * An identifier unique to the TaskGroup
         * @type {number}
         */
        this.identifier = data.identifier;
        /**
         * Custom parameters for the task
         * @type {Object}
         */
        this.params = Utils.substituteObjVars(data.params ?? {});
        /**
         * The `TaskGroup` this task belongs to
         * @type {?TaskGroup}
         */
        this.group = data.group ?? null;
        /**
         * Start timestamp
         * @type {?Date}
         */
        this.startedAt = data.started_at ? new Date(data.started_at) : null;
        /**
         * Numbers of processed products
         * @type {{progress: number, failed: number, total: ?number}}
         */
        this.status = {progress: 0, failed: 0, total: null};
    }

    log(...args) {
        this.group.log(this.identifier, ...args);
    }

    serialize() {
        return {
            id:           this.id,
            operation_id: this.operationId,
            ...(this.params ? {params: this.params} : {}),
            started_at:   this.startedAt,
            progress:     this.status.progress,
            failed:       this.status.failed,
            total:        this.status.total
        };
    }

    serializeShort() {
        return {
            id: this.id,
            operation_id: this.operationId,
            started_at: this.startedAt,
            progress: this.status.progress,
            failed: this.status.failed,
            total: this.status.total
        };
    }

    /**
     * Sets the progress of the task.
     * @param {Object} options - The progress options.
     * @param {number} [options.total] - The total number of items.
     * @param {number} [options.progress] - The progress made.
     * @param {number} [options.failed] - The number of failed items.
     */
    setProgress({total, progress, failed}) {
        const prev_status = {...this.status};

        if (total !== undefined)
            this.status.total = +total;
        if (progress !== undefined)
            this.status.progress = +progress;
        if (failed !== undefined)
            this.status.failed = +failed;

        if (
            this.status.total === prev_status.total
            && this.status.progress === prev_status.progress
            && this.status.failed === prev_status.failed
        )
            return;

        this.emit("progress", this.status);
        this.log("progress:", this.status);
    }

    /**
     * Entry point for the task
     * @abstract
     */
    async run() {
        throw new Error("Task.run() is not overridden");
    }
}

module.exports = Task;
