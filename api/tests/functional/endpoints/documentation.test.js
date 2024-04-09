const assert = require("assert");

const request = require("../request");

describe("/", function() {
    describe("GET", function() {
        it("returns the openapi documentation", async function() {
            const {status, data} = await request("/");

            assert.strictEqual(status, 200);
            assert.strictEqual(typeof data.openapi, "string");
            assert.strictEqual(typeof data.paths, "object");
            assert.strictEqual(typeof data.components, "object");
        });
    });
});
