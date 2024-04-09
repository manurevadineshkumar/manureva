const fs   = require("fs");
const path = require("path");

const express      = require("express");
const cookieParser = require("cookie-parser");
const multer       = require("multer");

const SocketServer = require("./SocketServer");

const OpenApi        = require("./services/OpenApi");
const SessionManager = require("./services/SessionManager");
const TaskManager    = require("./services/TaskManager");

const Storage     = require("./storage/Storage");
const LiveStorage = require("./live-storage/LiveStorage");
const S3Storage   = require("./services/S3Storage");

const User = require("./models/User");

const HttpError = require("./errors/HttpError");

class Server {
    static ENDPOINTS_PATH = path.join(__dirname, "./endpoints");

    static MIDDLEWARES = [
        cookieParser(),
        SessionManager.use(),
        (req, res, next) => {
            const cors_allowed_headers = [
                "Origin", "X-Requested-With", "Content-Type", "Accept"
            ].join(", ");

            res.setHeader(
                "Access-Control-Allow-Origin", req.get("origin") || "*"
            );
            res.setHeader("Access-Control-Allow-Credentials", "true");
            res.setHeader("Access-Control-Allow-Headers", cors_allowed_headers);
            res.setHeader(
                "Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE"
            );
            res.setHeader("Access-Control-Max-Age", "86400");
            next();
        },
        (req, res, next) => {
            res.set("Content-Type", "application/json");
            next();
        },
        express.json({verify: (req, res, buf) => {
            req.rawBody = buf;
        }}),
        multer({
            storage: multer.memoryStorage(),
            limits: {fileSize: "16M", parts: 8}
        }).any(),
        (req, res, next) => {
            const date = new Date();
            console.debug(`[HTTP - ${date.toUTCString()}]`, req.method, req.originalUrl);
            next();
        }
    ];

    constructor() {
        this.app = express();
        this.server = null;
        this.openApi = null;
        this.socketServer = null;
        this.taskManager = new TaskManager();

        Server.MIDDLEWARES.forEach(middleware => this.app.use(middleware));

        this.app.disable("x-powered-by");

        if (process.env.NODE_ENV != "test")
            this.app.set("trust proxy", "loopback");
    }

    async setupOperations(operations) {
        operations = {};

        (await fs.promises.readdir(Server.ENDPOINTS_PATH)).forEach(file => {
            if (!file.endsWith(".js"))
                return;

            const route = require(path.join(Server.ENDPOINTS_PATH, file));
            const route_operations = Object.getOwnPropertyNames(route)
                .filter(prop => typeof route[prop] === "function");

            route_operations.forEach(operation_id => {
                if (operations[operation_id])
                    throw new Error("duplicate operation id " + operation_id);

                operations[operation_id] = route[operation_id];
            });
        });

        return operations;
    }

    async setup(specification) {
        await Storage.connect();
        await LiveStorage.connect();
        if (process.env.NODE_ENV === "test")
            await S3Storage.connect();

        const operations = await this.setupOperations();

        this.openApi = new OpenApi(specification, operations);

        this.openApi.load();

        Object.keys(this.openApi.paths).forEach(path => {
            this.app.all(
                path.replaceAll(/\{(.+?)}/g, ":$1"),
                (req, res, next) => this.#handleRequest(path, req, res, next)
            );
        });

        this.app.use((req, res) => res.status(404).send({error: "Not Found"}));
        this.app.use(Server.#handleError);
    }

    listen(port) {
        return new Promise(resolve => {
            this.server = this.app.listen(port, () => {
                console.info("Korvin API server listening on port", port);
                resolve();
            });
            this.socketServer = new SocketServer(this.server, this.taskManager);
        });
    }

    static async #authenticate(session, can_fail) {
        const {user_id} = session;

        if (!user_id) {
            if (!can_fail)
                throw new HttpError(401);
            return null;
        }

        const user = await User.getById(user_id);

        if (!user && !can_fail)
            throw new HttpError(401);

        return user;
    }

    async #processRequest(path, method, req, res) {
        const {params, query, body, files} = req;
        const {is_public, handler} = this.openApi.getOperation(path, method);
        const data = this.openApi.getData(
            path, method, {params, query, body, files}
        );

        return await handler.call(null, {
            ...data,
            req, res,
            user: await Server.#authenticate(req.session || {}, is_public)
        });
    }

    #handleRequest(path, req, res, next) {
        const method = req.method.toLocaleLowerCase();

        if (method == "options")
            return res.send();

        this.#processRequest(path, method, req, res).then(
            result => { !res.headersSent && res.send(result); },
            err => { next(err); }
        );
    }

    static #handleError(err, req, res, next) {
        if (res.headersSent)
            return next(err);

        const {status, message} = err instanceof HttpError
            ? err
            : new HttpError(500);

        if (status == 500)
            console.error(err);

        res.status(status).send({error: message});
    }

    async stop() {
        if (!this.server)
            return;

        await Promise.all([
            new Promise(resolve => this.server.close(resolve)),
            Storage.stop(),
            LiveStorage.stop(),
            this.taskManager.stop()
        ]);

        console.info("Korvin API server stopped");
    }
}

module.exports = Server;
