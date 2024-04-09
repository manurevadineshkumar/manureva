const SocketIO = require("socket.io");

const SessionManager = require("./services/SessionManager");

const User = require("./models/User");
const UserPermissions = require("./models/Permissions");
const LogChannelSubscription = require("./models/LogChannelSubscription");

const parseCookieString = str => Object.fromEntries(
    (str || "").split("; ").map(cookie => {
        const [key, ...val] = cookie.split("=");

        return [key, val.join("=")];
    })
);

class SocketServer {
    static NAMESPACES = {
        "/": {
            middlewares: [
                (socket, next) => {
                    socket.disconnect(true);

                    next(new Error("Invalid path"));
                }
            ]
        },
        "/log-channel": {
            middlewares: [
                async (socket, next) => {
                    const cookies = parseCookieString(
                        socket.handshake.headers.cookie
                    );
                    const session = await SessionManager.getSession(
                        cookies["Session-ID"]
                    );

                    socket.user = await User.getById(session?.user_id);

                    if (!socket.user) {
                        socket.emit("error", "Unauthorized");
                        return next(new Error("Unauthorized"));
                    }

                    next();
                }
            ],
            listeners: {
                subscribe: SocketServer.prototype.onLogChannelSubscribe
            }
        },
        "/scheduler": {
            middlewares: [
                async (socket, next) => {
                    const cookies = parseCookieString(
                        socket.handshake.headers.cookie
                    );
                    const session = await SessionManager.getSession(
                        cookies["Session-ID"]
                    );

                    socket.user = await User.getById(session?.user_id);

                    if (!socket.user) {
                        socket.emit("error", "Unauthorized");
                        return next(new Error("Unauthorized"));
                    }

                    if (!await socket.user?.permissions.has(
                        UserPermissions.PERMISSIONS.ADMIN
                    )) {
                        socket.emit("error", "Forbidden");
                        return next(new Error("Forbidden"));
                    }

                    next();
                }
            ],
            listeners: {
                init: SocketServer.prototype.onSchedulerInit
            }
        }
    };

    constructor(server, task_manager) {
        this.taskManager = task_manager;

        this.io = new SocketIO.Server(server, {
            cors: {
                origin: (origin, cb) => cb(null, origin),
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        Object.entries(SocketServer.NAMESPACES).forEach(([
            namespace_name, {middlewares, listeners}
        ]) => {
            const namespace = this.io.of(namespace_name);

            middlewares.forEach(middleware => namespace.use(middleware));

            namespace.on("connection", async socket => {
                console.info(">>", socket.handshake.address, "connected");

                Object.entries(listeners).forEach(([event_name, cb]) => {
                    socket.on(
                        event_name,
                        (...args) => cb.call(this, socket, ...args)
                    );
                });

                socket.on("disconnect", () => {
                    console.info(
                        "<<", socket.handshake.address, "disconnected"
                    );
                });
            });
        });

        this.taskManager.on(
            "update",
            data => this.io.of("/scheduler").emit("update", data)
        );
    }

    async onSchedulerInit(socket) {
        const data = await this.taskManager.serialize();

        socket.emit("init", data);
    }

    async onLogChannelSubscribe(socket, {uuid}) {
        const subscription = await LogChannelSubscription.getByUuid(uuid);

        if (!subscription)
            return await socket.disconnect(true);

        subscription.on(
            "message",
            data => socket.emit("message", data)
        );

        await subscription.sendLastLog();

        await Promise.race([
            new Promise(resolve => socket.once("disconnect", resolve)),
            new Promise(resolve => subscription.once("end", resolve)),
        ]);

        await socket.disconnect(true);
    }
}

module.exports = SocketServer;
