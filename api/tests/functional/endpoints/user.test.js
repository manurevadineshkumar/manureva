const assert = require("assert");
const request = require("../request");

const {PERMISSIONS} = require("../../../app/models/Permissions");

describe("/users", function () {
    before(async function () {
        await global.user.permissions.grant([PERMISSIONS.ADMIN]);
    });

    describe("PATCH", function () {
        it("Update user content", async function () {
            const { status, data } = await request("PATCH /users", {
                username: "TestUser12345",
                current_password: "Test0123",
                new_password: "Test0123456789",
                email: "admin@test.korvin.new",
                first_name: "Test",
                last_name: "Test",
                phone: "+1234567890",
                address: {
                    street: "Test",
                    city: "Test",
                    zip: "12345",
                    country_id: 1
                },
                company_name: "Test"
            });

            assert.strictEqual(status, 200, data.error);
        });
    });

    after(async function () {
        await global.user.permissions.revoke([PERMISSIONS.ADMIN]);
    });
});
