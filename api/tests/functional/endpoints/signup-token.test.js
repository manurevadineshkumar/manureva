const assert = require("assert");

const request = require("../request");

const {PERMISSIONS} = require("../../../app/models/Permissions");

let signupToken;

describe("/signup-tokens", function() {
    before(async function() {
        await global.user.permissions.grant([PERMISSIONS.ADMIN]);
    });

    describe("POST", function() {
        it("creates a signup token", async function() {
            const {status, data} = await request("POST /signup-tokens");

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(typeof data.token, "string");

            signupToken = data.token;
        });

        it("creates a new user with the signup token", async function() {
            const {status, data} = await request(
                `POST /users/?token=${signupToken}`,
                {
                    username: "TestUser1234",
                    password: "TestPassword1234",
                    email: "admin-2@test.korvin",
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
                }
            );

            assert.strictEqual(status, 200, data.error);
        });
    });

    describe("GET", function() {
        it("lists existing signup tokens", async function() {
            const {status, data} = await request("/signup-tokens");

            assert.strictEqual(status, 200, data.error);
        });
    });

    after(async function() {
        await global.user.permissions.revoke([PERMISSIONS.ADMIN]);
    });
});

describe("/signup-tokens/{id}", function() {
    before(async function() {
        await global.user.permissions.grant([PERMISSIONS.ADMIN]);
    });

    describe("GET", function() {
        it("retrieves a signup token by id", async function() {
            const {status, data} = await request(
                `/signup-tokens/${signupToken}`
            );

            assert.strictEqual(status, 404, data.error);
        });
    });

    after(async function() {
        await global.user.permissions.revoke([PERMISSIONS.ADMIN]);
    });
});
