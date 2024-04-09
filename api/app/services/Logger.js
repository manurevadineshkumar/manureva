const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const archiver = require("archiver");

const FilesystemManager = require("./FilesystemManager");

const LogModule = require("../models/LogModule");
const LogSession = require("../models/LogSession");

class Logger {
    static LOG_PATH = path.join(FilesystemManager.STATIC_PATH, "logs");

    constructor() {
        this.options = {
            printToConsole: false,
            sessionName: "",
            moduleNames: []
        };
        this.module = {};
        this.now = new Date().toISOString();
    }

    static async createLogger(options) {
        const logger = new Logger(options);

        Object.assign(logger.options, options);

        if (logger.options.moduleNames.length === 0) {
            throw new Error("No module name specified");
        }

        if (logger.options.sessionName.length === 0) {
            throw new Error("No session name specified");
        }

        if (!logger.options.sessionName.match(/^[a-zA-Z0-9-_]+$/)) {
            throw new Error("Session name must be folder name compatible");
        }

        logger.options.sessionPath = path.join(
            Logger.LOG_PATH, logger.options.sessionName
        );
        await fsPromises.mkdir(logger.options.sessionPath, {recursive: true});

        logger.session = await LogSession.create(logger.options.sessionName);
        if (!logger.session) {
            throw Error(
                `Can't create session id for ${logger.options.sessionName}`
            );
        }

        await Promise.all(logger.options.moduleNames.map(async moduleName => {

            if (!moduleName.match(/^[a-zA-Z0-9-_]+$/)) {
                throw new Error("Module name must be folder name compatible");
            }

            if (moduleName === "__SYSTEM") {
                throw new Error("Module name cannot be __SYSTEM");
            }

            const moduleFullName = `${moduleName}_${logger.now}.log`;
            const logFilePath = path.join(
                logger.options.sessionPath,
                moduleFullName
            );

            logger.module[moduleName] = await LogModule.create(
                logger.session.id,
                moduleName,
                moduleFullName,
                await fsPromises.open(logFilePath, "a")
            );
        }));

        if (logger.options.printToConsole) {
            console.info(
                `[${logger.now} | __SYSTEM]`,
                "-- Logger initialized with options:",
                JSON.stringify(options)
            );
        }

        return logger;
    }

    log(identifier, message) {
        if (!this.module[identifier]?.fd) {
            throw new Error(`No log file for module ${identifier}`);
        }

        const now = new Date().toISOString();
        const fileLogMessage = `[${now}] -- ${message}`;
        const consoleLogMessage = `[${now} | ${identifier}] -- ${message}`;

        this.module[identifier].fd.write(fileLogMessage + "\n");

        if (this.options.printToConsole)
            console.info(consoleLogMessage);
    }

    async close(moduleName, zip = false) {
        if (!this.module[moduleName].fd) {
            throw new Error(`No log file for module ${moduleName}`);
        }

        const now = new Date().toISOString();

        this.module[moduleName].fd.write(`[${now} | __SYSTEM] -- END\n`);
        this.module[moduleName].fd.close();

        await this.module[moduleName].update({end_time: new Date()});

        if (zip)
            await this.zipModule(moduleName);

        await this.session.update({end_time: new Date()});
    }

    async closeAll(zip = false) {
        await Promise.all(this.options.moduleNames.map(async moduleName => {
            const now = new Date().toISOString();
            this.module[moduleName].fd.write(`[${now} | __SYSTEM] -- END\n`);
            this.module[moduleName].fd.close();

            await this.module[moduleName].update({end_time: new Date()});
        }));

        if (zip)
            await this.zipSession();

        await this.session.update({end_time: new Date()});
    }

    async zipModule(moduleName) {
        const filePath = path.resolve(
            `${moduleName}_${this.now}`,
            this.options.sessionPath
        );

        const output = fs.createWriteStream(`${filePath}.zip`);
        const archive = archiver("zip", {zlib: {level: 9}});

        output.on("close", () => {
            if (this.options.printToConsole) {
                console.info(`${filePath}.zip has been created`);
            }
        });

        archive.on("error", (err) => {
            throw err;
        });

        archive.append(
            fs.createReadStream(`${filePath}.log`),
            {name: `${moduleName}.log`}
        );

        archive.pipe(output);

        await archive.finalize();
    }

    async zipSession() {
        const output = fs.createWriteStream(`${this.options.sessionPath}.zip`);
        const archive = archiver("zip", {zlib: {level: 9}});

        output.on("close", () => {
            if (this.options.printToConsole) {
                console.info(
                    `${this.options.sessionPath}.zip has been created`
                );
            }
        });

        archive.on("error", (err) => {
            throw err;
        });

        (await fsPromises.readdir(this.options.sessionPath))
            .filter((file) => file.endsWith(".log"))
            .map((file) => {
                const fileName = path.join(this.options.sessionPath, file);
                archive.file(fileName, {name: file});
            });

        archive.pipe(output);
        await archive.finalize();
    }
}

module.exports = Logger;
