const assert = require("assert");
const request = require("../request");

const Storage = require("../../../app/storage/Storage");
const {PERMISSIONS} = require("../../../app/models/Permissions");

let channel_id;

describe("/channels", () => {
    before(async function () {
        await global.user.permissions.grant([
            PERMISSIONS.SALES_CHANNEL_LIST,
            PERMISSIONS.SALES_CHANNEL_READ_DETAILS
        ]);

        const channel = {
            name: "test",
            ratio: 1.99,
            type: "WHOLESALE",
        };

        await Storage.query("INSERT INTO sales_channels SET ?;", channel);
    });

    describe("GET /channels", function () {
        it("lists channels", async function () {
            const {status, data} = await request("/channels");

            assert.strictEqual(status, 200, data.error);
            channel_id = data.items[0].id;
        });
    });

    describe("GET /channels/{id}", function () {
        it("gets a channel", async function () {
            const {status, data} = await request(`/channels/${channel_id}`);

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.name, "test");
            assert.strictEqual(data.ratio, 1.99);
            assert.strictEqual(data.type, "WHOLESALE");
        });
    });

    after(async function () {
        await global.user.permissions.revoke([
            PERMISSIONS.SALES_CHANNEL_LIST,
            PERMISSIONS.SALES_CHANNEL_READ_DETAILS
        ]);
    });
});
