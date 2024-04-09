const assert = require("assert");

const request = require("../request");

const {PERMISSIONS} = require("../../../app/models/Permissions");

let product_id = 0;

describe("/products", function() {
    before(async function () {
        await global.user.permissions.grant([PERMISSIONS.ADMIN]);
    });

    describe("POST", function() {
        it("Create a Product", async function() {
            const {status, data} = await request(
                "POST /products",
                {
                    "status": "DISABLED",
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
                    "size": {"Size": "Big size (^o^)"},
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

            product_id = data.product.id;

            assert.strictEqual(data.product.status, "DISABLED");
            assert.deepStrictEqual(
                data.product.type,
                global.default_type.serialize()
            );
            assert.deepStrictEqual(
                data.product.subtype,
                global.default_subtype.serialize()
            );
            assert.deepStrictEqual(
                data.product.brand,
                global.korvin_brand.serialize()
            );
            assert.strictEqual(data.product.grade, "B");
            assert.deepStrictEqual(
                data.product.size,
                {"Size": "Big size (^o^)"}
            );
            assert.strictEqual(data.product.has_serial, 0);
            assert.strictEqual(data.product.has_guarantee_card, 0);
            assert.strictEqual(data.product.has_box, 0);
            assert.strictEqual(data.product.has_storage_bag, 0);
        });
    });

    after(async function () {
        await global.user.permissions.revoke([PERMISSIONS.ADMIN]);
    });
});

describe("/products/{id}", function() {
    before(async function () {
        await global.user.permissions.grant([PERMISSIONS.ADMIN]);
    });

    describe("PATCH", function() {
        it("Update a product by its id", async function() {
            const {status, data} = await request(
                `PATCH /products/${product_id}`,
                {
                    "status": "SOLD",
                    "gender": 1,
                    "model": "TOBAGGY",
                    "name": "Chloe Tote Baggy",
                    "description": "",
                    "bought_price": 9240,
                    "bought_currency": "JPY",
                    "purchase_price_cents": 6000,
                    "wholesale_price_cents": 14000,
                    "retail_price_cents": 24000,
                    "grade": "A",
                    "size": {"Size": "Big size (^o^)"},
                    "color_ids": [
                        44,
                        23
                    ],
                    "material_ids": [
                        97,
                        21,
                        218
                    ],
                    "has_serial": 0,
                    "has_guarantee_card": 0,
                    "has_box": 0,
                    "has_storage_bag": 0,
                    "is_exported_vc": 0
                });

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.product.status, "SOLD");
            assert.deepStrictEqual(
                data.product.type,
                global.default_type.serialize()
            );
            assert.deepStrictEqual(
                data.product.subtype,
                global.default_subtype.serialize()
            );
            assert.deepStrictEqual(
                data.product.brand,
                global.korvin_brand.serialize()
            );
            assert.strictEqual(data.product.grade, "A");
        });
    });

    after(async function () {
        await global.user.permissions.revoke([PERMISSIONS.ADMIN]);
    });
});
