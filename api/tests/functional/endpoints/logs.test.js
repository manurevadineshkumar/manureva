const assert = require("assert");
const Logger = require("../../../app/services/Logger");
const request = require("../request");
const {PERMISSIONS} = require("../../../app/models/Permissions");

describe("/logs/session", function () {
    before(async function () {
        await global.user.permissions.grant([PERMISSIONS.LOG_SESSION_LIST]);
    });

    describe("GET", function () {
        it("lists log sessions", async function () {
            const logger = await Logger.createLogger({
                sessionName: "test_session",
                moduleNames: ["test_module"],
            });

            logger.log("test_module", "test message");

            await logger.closeAll();

            const {data} = await request("/logs/sessions?batch_size=32");

            assert.ok(data.items.length > 0, "No logs found");
        });
    });

    after(async function () {
        await global.user.permissions.revoke([PERMISSIONS.LOG_SESSION_LIST]);
    });
});

describe("/logs/module", function () {
    before(async function () {
        await global.user.permissions.grant([PERMISSIONS.LOG_MODULE_LIST]);
    });

    describe("GET", function () {
        it("lists log modules", async function () {
            await global.user.permissions.grant([PERMISSIONS.LOG_MODULE_LIST]);
            const logger = await Logger.createLogger({
                sessionName: "test_session",
                moduleNames: ["test_module"],
            });

            logger.log("test_module", "test message");

            await logger.closeAll();

            const { data } = await request("/logs/modules?batch_size=32");

            assert.ok(data.items.length > 0, "No logs found");

            await global.user.permissions.revoke([PERMISSIONS.LOG_MODULE_LIST]);
        });
    });

    after(async function () {
        await global.user.permissions.revoke([PERMISSIONS.LOG_MODULE_LIST]);
    });
});
