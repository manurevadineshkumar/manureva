const assert = require("assert");

const request = require("../request");
const {PERMISSIONS} = require("../../../app/models/Permissions");

let product_id;
let tag_id;
let shared_token;

describe("/tags", function() {
    before(async function() {
        await global.user.permissions.grant([PERMISSIONS.TAG_LIST]);
    });

    describe("GET", function() {
        it("returns a list of tags containing the `new` tag", async function() {
            const {status, data} = await request("/tags");

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.items.length, 1);
            assert.strictEqual(data.items[0].id, 1);
        });
    });

    after(async function() {
        await global.user.permissions.revoke([PERMISSIONS.TAG_LIST]);
    });
});

describe("/tags/{id}", function() {
    before(async function() {
        await global.user.permissions.grant([
            PERMISSIONS.TAG_LIST,
            PERMISSIONS.TAG_CREATE,
            PERMISSIONS.TAG_UPDATE,
            PERMISSIONS.TAG_DELETE
        ]);
    });

    describe("POST", function() {
        it("creates a new tag", async function() {
            {
                const {status, data} = await request(
                    "POST /tags/",
                    {name: "My tag"}
                );

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.name, "My tag");
                assert.strictEqual(data.products_group.products_count, 0);

                tag_id = data.id;
                shared_token = data.share_token;
            }
            {
                const {status, data} = await request("tags");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 2);
            }
        });

        it("fails to create a tag with a duplicate name", async function() {
            const {status} = await request(
                "POST /tags/",
                {name: "My tag"}
            );

            assert.strictEqual(status, 409);
        });
    });

    describe("PATCH", function() {
        it("updates a tag", async function() {
            {
                const {status, data} = await request(
                    `PATCH /tags/${tag_id}`,
                    {name: "My updated tag"}
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request("tags");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 2);
                assert.strictEqual(
                    data.items?.find(({id}) => id == tag_id)?.name,
                    "My updated tag"
                );
            }
        });
    });

    describe("DELETE", function() {
        it("deletes a tag", async function() {
            {
                const {status, data} = await request(`DELETE /tags/${tag_id}`);

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request("tags");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 1);
            }
        });

        it("fails to delete a nonexistent tag", async function() {
            const {status} = await request(`DELETE /tags/${tag_id}`);

            assert.strictEqual(status, 404);
        });
    });

    after(async function() {
        await global.user.permissions.revoke([
            PERMISSIONS.TAG_LIST,
            PERMISSIONS.TAG_CREATE,
            PERMISSIONS.TAG_UPDATE,
            PERMISSIONS.TAG_DELETE
        ]);
    });
});

describe("/tags/{tag_id}/products", function() {
    before(async function() {
        await global.user.permissions.grant([
            PERMISSIONS.TAG_LIST,
            PERMISSIONS.TAG_CREATE,
            PERMISSIONS.TAG_DELETE
        ]);

        const {status, data} = await request("POST /tags/", {name: "My tag"});

        assert.strictEqual(status, 200, data.error);
        assert.strictEqual(data.name, "My tag");
        assert.strictEqual(data.products_group.products_count, 0);

        tag_id = data.id;
        product_id = +process.env.TEST_PRODUCT_ID || null;
        await global.user.permissions.revoke([PERMISSIONS.TAG_CREATE]);
    });

    describe("PUT", function() {
        it("assigns a tag to a product", async function() {
            {
                const {status, data} = await request(
                    `PUT /tags/${tag_id}/products`,
                    {product_ids: [product_id]}
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request("tags");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(
                    data.items
                        ?.find(({id}) => id == tag_id)
                        ?.products_group
                        ?.products_count,
                    1
                );
            }
        });

        it("does not assign a tag to a product twice", async function() {
            await request(`POST /tags/${tag_id}/products/${product_id}`);
            {
                const {status} = await request(
                    `PUT /tags/${tag_id}/products`,
                    {product_ids: [product_id]}
                );

                assert.strictEqual(status, 200);
            }
            {
                const {status, data} = await request("/tags");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(
                    data.items
                        ?.find(({id}) => id == tag_id)
                        ?.products_group
                        ?.products_count,
                    1
                );
            }
        });
    });

    describe("DELETE", function() {
        it("removes a tag from a product", async function() {
            {
                const {status, data} = await request(
                    `DELETE /tags/${tag_id}/products`,
                    {product_ids: [product_id]}
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request("/tags");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(
                    data.items
                        ?.find(({id}) => id == tag_id)
                        ?.products_group
                        ?.products_count,
                    0
                );
            }
        });
    });

    after(async function() {
        const {status, data} = await request(`DELETE /tags/${tag_id}`);

        assert.strictEqual(status, 200, data.error);

        await global.user.permissions.revoke([
            PERMISSIONS.TAG_LIST,
            PERMISSIONS.TAG_CREATE,
            PERMISSIONS.TAG_DELETE
        ]);
    });
});
