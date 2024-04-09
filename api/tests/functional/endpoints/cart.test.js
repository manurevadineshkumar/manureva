const assert = require("assert");
const request = require("../request");

const {PERMISSIONS} = require("../../../app/models/Permissions");

describe("/carts", function () {
    let product = null;
    let group_id = null;
    let token = null;

    before(async function () {
        await global.user.permissions.grant([
            PERMISSIONS.PRODUCT_CREATE,
            PERMISSIONS.CART_ADD_PRODUCT,
            PERMISSIONS.CART_REMOVE_PRODUCT,
            PERMISSIONS.CART_LIST_PRODUCTS
        ]);

        const {status, data} = await request(
            "POST /products",
            {
                "status": "ACTIVE",
                "gender": 0,
                "type_id": global.default_type.id,
                "subtype_id": global.default_subtype.id,
                "model": "",
                "brand_id": global.korvin_brand.id,
                "name": "Chloe Tote Bag",
                "description": "",
                "bought_price": 9240,
                "bought_currency": "JPY",
                "purchase_price_cents": 6000,
                "wholesale_price_cents": 14000,
                "retail_price_cents": 24000,
                "grade": "B",
                "size": {},
                "color_ids": [44, 23],
                "material_ids": [97, 218],
                "has_serial": 0,
                "has_guarantee_card": 0,
                "has_box": 0,
                "has_storage_bag": 0,
                "is_exported_vc": 0
            }
        );

        assert.strictEqual(status, 200, data.error);

        product = data.product;

        delete product.image_urls;
    });

    describe("GET", function () {
        it("gets the user's cart", async function () {
            const {
                status,
                data
            } = await request(`GET /carts/${global.user.id}`);

            assert.strictEqual(status, 200, data.error);

            group_id = data.products_group.id;
            token = data.products_group.share_token;
        });
    });

    describe("GET", function () {
        it("lists cart products", async function () {
            const {
                status,
                data
            } = await request(`GET /carts/${global.user.id}/products`);

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.items.length, 0);
        });
    });

    describe("GET", function () {
        it("adds Product to cart", async function () {
            {
                const {
                    status,
                    data
                } = await request(`PUT /carts/products/${product.id}`);

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request(
                    `GET /carts/${global.user.id}/products`
                );

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 1);
                assert.strictEqual(data.items[0].id, product.id);
            }
        });
    });

    describe("GET", function () {
        it("lists product in shared view", async function () {
            const {
                status,
                data
            } = await request(`GET /view/${group_id}-${token}`);

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.products_count, 1);
            assert.strictEqual(data.items.length, 1);
        });
    });

    describe("DELETE", function () {
        it("removes Product from cart", async function () {
            {
                const {status, data} = await request(
                    `DELETE /carts/products/${product.id}`
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request(
                    `GET /carts/${global.user.id}/products`
                );

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 0);
            }
        });
    });

    after(async function () {
        await global.user.permissions.revoke([
            PERMISSIONS.PRODUCT_CREATE,
            PERMISSIONS.CART_ADD_PRODUCT,
            PERMISSIONS.CART_REMOVE_PRODUCT,
            PERMISSIONS.CART_LIST_PRODUCTS
        ]);
    });
});
