const assert = require("assert");

const request = require("../request");

let marketplace_id;
let marketplace_token;

describe("/marketplaces", function() {
    describe("GET", function() {
        it("returns an empty list of marketplaces", async function() {
            const {status, data} = await request("/marketplaces");

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.items.length, 0);
        });
    });
});

describe("/marketplaces/{id}", function() {
    describe("POST", function() {
        it("creates a new marketplace", async function() {
            {
                const {status, data} = await request(
                    "POST /marketplaces",
                    {
                        platform: "vestiaire",
                        name: "My marketplace",
                        ranges: [{to: null, percent: 50}]
                    }
                );

                assert.strictEqual(status, 200, data.error);

                marketplace_id = data.id;
                marketplace_token = data.token;
                console.log(marketplace_id, marketplace_token);

                delete data.id;
                delete data.token;

                assert.strictEqual(marketplace_token.length, 22);
                assert.deepStrictEqual(
                    data,
                    {
                        owner_id: global.user.id,
                        platform: "vestiaire",
                        name: "My marketplace",
                        ranges: [{to: null, percent: 50}]
                    }
                );
            }
            {
                const {status, data} = await request("/marketplaces");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 1);
            }
        });
    });

    describe("PATCH", function() {
        it("Updates a marketplace", async function() {
            {
                const {status, data} = await request(
                    `PATCH /marketplaces/${marketplace_id}`,
                    {
                        name: "My amazing marketplace",
                        rotate_token: 1,
                        ranges: [{to: null, percent: 10}]
                    }
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request("/marketplaces");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 1);

                const [marketplace] = data.items;

                assert.ok(marketplace);

                assert.strictEqual(marketplace.name, "My amazing marketplace");
                assert.ok(marketplace.token != marketplace_token);
                assert.deepStrictEqual(
                    marketplace.ranges,
                    [{to: null, percent: 10}]
                );
            }
        });
    });

    describe("DELETE", function() {
        it("deletes a marketplace", async function() {
            {
                const {status, data} = await request(
                    `DELETE /marketplaces/${marketplace_id}`
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request("/marketplaces");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 0);
            }
        });

        it("fails to delete a nonexistent marketplace", async function() {
            const {status} = await request(
                `DELETE /marketplaces/${marketplace_id}`
            );

            assert.strictEqual(status, 404);
        });
    });
});
