const crypto = require("crypto");
const util = require("util");
const {EventEmitter} = require("events");

const Logger = require("../services/Logger");

const TaskGroupLiveStorage = require("../live-storage/TaskGroupLiveStorage");

class TaskGroup extends EventEmitter {
    /**
     * An association of task names to their handling classes
     * @type {Object.<string, Task>}
     */
    static TASKS = {
        "listVendors": require("./VendorsScraping"),
        "scrapeVendors": require("./VendorsScraping"),
        "updateAvailableProducts": require(
            "./processing/AvailableProductsUpdater"
        ),
        "updateProducts": require("./processing/ProductsUpdater"),
        "exportToAirtable": require("./processing/AirtableExporter"),
        "exportToExternalAirtable": require(
            "./processing/ExternalAirtableExporter"
        ),
        "exportAllConnectedShopify": require("./processing/ExportAllConnectedShopify"),
        "exportToConnectedShopify": require("./processing/ConnectedShopifyExporter"),
        "exportToShopify": require("./processing/ShopifyExporter"),
        "exportToVintageBar": require("./processing/VintageBarExporter"),
        "exportToVestiaireCollective": require(
            "./processing/VestiaireCollectiveUpdater"
        ),
        "exportToMiinto": require("./processing/MiintoUpdater"),
        "exportToJoliCloset": require("./processing/JoliClosetUpdater"),
        "exportToRebelle": require("./processing/RebelleExporter"),
        "exportToGrailed": require("./processing/GrailedUpdater"),
        "exportToOpenForVintage": require("./processing/OpenForVintageUpdater"),
        "exportToCXMP": require("./processing/CXMPUpdater"),
        "exportToYoox": require("./processing/YooxExporter"),
        "exportToChoose": require("./processing/ChooseUpdater"),
        "UpdateS3ImageUrls": require("./processing/S3ImageUpdater"),
        "updateBackgroundImage": require("./processing/BackgroundImageUpdater"),
        "removeBackgroundImage": require("./processing/BackgroundImageRemover"),
        "exportMaisonGuava": require("./processing/MaisonGuavaUpdater"),
    };

    constructor(data) {
        super();

        /**
         * The uuid of the task group
         * @type {string}
         */
        this.id = data.id || crypto.randomUUID();
        /**
         * The task group title
         * @type {?string}
         */
        this.title = data.title ?? null;
        /**
         * The scheduled starting date
         * @type {?Date}
         */
        this.date = data.date ? new Date(data.date) : null;
        /**
         * An array of input tasks
         * @type {?Task[]}
         */
        this.inputs = data.inputs ?? null;
        /**
         * The current step index
         * @type {?number}
         */
        this.currentStep = data.current_step || 0;
        /**
         * The starting date
         * @type {?Date}
         */
        this.startDate = null;
        /**
         * Tasks of this task group
         * @type {Array<Array<Task>>}
         */
        this.tasks = data.tasks.map((group, i) =>
            group.map((data, j) => {
                const constructor = TaskGroup.TASKS[data.operation_id];

                if (!constructor)
                    throw Error(
                        "invalid operation_id " + data.operation_id
                    );

                return new constructor({
                    ...data,
                    group: this,
                    identifier: [
                        (i + "").padStart(2, "0"),
                        (j + "").padStart(2, "0"),
                        data.operation_id
                    ].join("-")
                });
            })
        );
        /**
         * The amount of updated products inside this task
         * @type {number}
         */
        this.updatedProductsCount = 0;
    }

    /**
     * Returns a full object serialization of the task group
     * @returns {Object}
     */
    serialize() {
        return {
            id: this.id,
            title: this.title,
            current_step: +this.currentStep || 0,
            date: +this.date,
            start_date: this.startDate === null ? null : +this.startDate,
            tasks: this.tasks?.map(tasks =>
                tasks.map(task => task.serialize())
            ),
            ...(this.inputs ? {inputs: this.inputs} : {})
        };
    }

    /**
     * Returns a reduced object serialization of the task group
     * @returns {Object}
     */
    serializeShort() {
        return {
            id: this.id,
            title: this.title,
            current_step: +this.currentStep || 0,
            date: +this.date,
            start_date: this.startDate === null ? null : +this.startDate,
            tasks: this.tasks?.map(tasks =>
                tasks.map(task => task.serializeShort())
            )
        };
    }

    /**
     * Creates a new task group
     * @param data {Object}
     * @return {Promise<TaskGroup>}
     */
    static async create(data) {
        const task_group = new TaskGroup(data);

        await TaskGroupLiveStorage.create(task_group.serialize());

        return task_group;
    }

    /**
     * Runs the task group
     * @return {Promise<void>}
     */
    async run() {
        this.startDate = new Date();
        this.logger = await Logger.createLogger({
            printToConsole: true,
            sessionName: this.id,
            moduleNames: [
                "root",
                ...this.tasks.flat().map(task => task.identifier)
            ]
        });

        if (this.inputs) {
            for (const entry of this.inputs)
                await this.pushOutput(entry);

            await this.rotate();
        }

        for (; this.currentStep < this.tasks.length; this.currentStep++) {
            await TaskGroupLiveStorage.create(this.serialize());

            const tasks = this.tasks[this.currentStep];

            this.emit("update", {step: this.currentStep});

            tasks.forEach((task, i) => {
                task.on(
                    "progress",
                    status => this.emit("update", {task_idx: i, ...status})
                );
            });

            await Promise.all(tasks.map(async task => {
                await task.run();

                await this.logger.module[task.identifier].update({
                    total_count: task.status.total,
                    fail_count: task.status.failed,
                });
            }));

            await this.rotate();

            await this.log(
                "root",
                `===`,
                `Task group ${this.title}:`,
                `${this.currentStep + 1}/${this.tasks.length} complete`,
                `===`
            );
        }
        this.emit("update", {step: this.currentStep});

        await this.logger.session.update({
            updated_products: this.updatedProductsCount,
        });

        await this.logger.closeAll(true);
    }

    /**
     * Log a message from a module
     * @param identifier {number} the module identifier
     * @param args {any} log arguments
     */
    log(identifier, ...args) {
        const message = args.map(arg => {
            return typeof arg === "string"
                ? arg
                : util.inspect(arg, {maxArrayLength: null});
        }).join(" ");

        this.logger.log(identifier, message);
    }

    /**
     * Peeks at the first `count` items of the queue
     * @param count {number}
     * @return {Promise<Object>}
     */
    static async peekQueue(count = 1) {
        return await TaskGroupLiveStorage.peekQueue(count);
    }

    /**
     * Enqueues a task group
     * @param data
     * @return {Promise<void>}
     */
    static async createQueued(data) {
        await TaskGroupLiveStorage.createQueued(data);
    }

    /**
     * Peeks at the next queued task group
     * @return {Promise<boolean>}
     */
    static async hasTaskGroupArrived() {
        return await TaskGroupLiveStorage.hasTaskGroupArrived();
    }

    /**
     * Pops the next queued task group
     * @return {Promise<Object>}
     */
    static async popNextTaskGroup() {
        return await TaskGroupLiveStorage.popNextTaskGroup();
    }

    /**
     * Restores the previously unfinished task, if there is one
     * @return {Promise<void>}
     */
    static async restore() {
        await TaskGroupLiveStorage.restore();
    }

    /**
     * Pops an entry from the input queue
     * @return {Promise<Object>}
     */
    async popInput() {
        return await TaskGroupLiveStorage.popInput();
    }

    /**
     * Pops `size` entries from the input queue
     * @param size {number}
     * @return {Promise<Object[]>}
     */
    async popInputBatch(size = 32) {
        return await TaskGroupLiveStorage.popInputBatch(size);
    }

    /**
     * Peeks at the first `count` input items
     * @param count
     * @return {Promise<Object>}
     */
    async getInputHead(count = 32) {
        return await TaskGroupLiveStorage.getInputHead(count);
    }

    /**
     * Checks if the task group has finished
     * @return {Promise<boolean>}
     */
    async hasFinished() {
        return await TaskGroupLiveStorage.hasFinished();
    }

    /**
     * Returns the size of the input queue
     * @return {Promise<Number>}
     */
    async getInputSize() {
        return await TaskGroupLiveStorage.getInputSize();
    }

    /**
     * Returns the size of the ongoing queue
     * @return {Promise<Number>}
     */
    async getOngoingSize() {
        return await TaskGroupLiveStorage.getOngoingSize();
    }

    /**
     * Returns the size of the output queue
     * @return {Promise<Number>}
     */
    async getOutputSize() {
        return await TaskGroupLiveStorage.getOutputSize();
    }

    /**
     * Restores a task by uuid
     * @param uuid {string} the task uuid
     * @return {Promise<void>}
     */
    async restoreEntry(uuid) {
        await TaskGroupLiveStorage.restoreEntry(uuid);
    }

    /**
     * Completes a task by uuid
     * @param uuid {string} the task uuid
     * @return {Promise<void>}
     */
    async completeEntry(uuid) {
        await TaskGroupLiveStorage.completeEntry(uuid);
    }

    /**
     * Completes tasks by uuid
     * @param uuids {string[]} the task uuids
     * @return {Promise<void>}
     */
    async completeEntries(uuids) {
        await TaskGroupLiveStorage.completeEntries(uuids);
    }

    /**
     * Pushes `data` onto the output queue
     * @param data {Object}
     * @return {Promise<void>}
     */
    async pushOutput(data) {
        await TaskGroupLiveStorage.pushOutput(data);
    }

    /**
     * Sets the scraping status
     * @param value {boolean}
     * @return {Promise<void>}
     */
    async setScraping(value) {
        await TaskGroupLiveStorage.setScraping(value);
    }

    /**
     * Rotates the queues: the output queue becomes the input queue and the
     * output queue is cleared
     * @return {Promise<void>}
     */
    async rotate() {
        await TaskGroupLiveStorage.rotate();
    }

    /**
     * Deletes the task group
     * @return {Promise<void>}
     */
    async delete() {
        await TaskGroupLiveStorage.delete();
    }
}

module.exports = TaskGroup;
