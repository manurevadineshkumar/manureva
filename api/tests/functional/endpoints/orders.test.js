const assert = require("assert");
const request = require("../request");

const OrderHandler = require("../../../app/services/OrderHandler");

const {PERMISSIONS} = require("../../../app/models/Permissions");

let product_id;
let channel_id;
let order_id;

describe("/orders", () => {
    before(async function () {
        await global.user.permissions.grant([
            PERMISSIONS.ORDER_CREATE,
            PERMISSIONS.PRODUCT_CREATE,
            PERMISSIONS.ORDER_LIST_PURCHASES,
            PERMISSIONS.ORDER_LIST_SALES,
            PERMISSIONS.SALES_CHANNEL_LIST,
            PERMISSIONS.ORDER_SHOW_SALESCHANNEL,
            PERMISSIONS.READ_ORDER_DETAILS,
            PERMISSIONS.UPDATE_ORDER_DETAILS
        ]);
        let {status, data} = await request(
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
        product_id = data.product.id;
        ({status, data} = await request("GET /channels"));
        assert.strictEqual(status, 200, data.error);
        channel_id = data.items[0].id;
        OrderHandler.dispatch = () => {
        };
    });

    describe("POST", function () {
        it("creates an order", async function () {
            const {status, data} = await request(
                "POST /orders",
                {
                    "channel_id": channel_id,
                    "product_id": product_id,
                }
            );
            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.success, true);
        });
    });


    describe("GET", function () {
        it("lists orders for a buyer", async function () {
            const {status, data} = await request("/orders?user_type=buyer");

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.items.length, 1);
            assert.strictEqual(data.items[0].product_id, product_id);
            assert.strictEqual(data.items[0].channel_id, channel_id);
        });
        it("lists orders for a seller", async function () {
            const {status, data} = await request("/orders?user_type=seller");

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.items.length, 1);
            assert.strictEqual(data.items[0].product_id, product_id);
            assert.strictEqual(data.items[0].channel_id, channel_id);
            order_id = data.items[0].id;
        });
    });

    describe("PATCH", function () {
        it("updates an order", async function () {
            let {status, data} = await request(
                "PATCH /orders/" + order_id,
                {
                    "comment_user": "hello world"
                }
            );
            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.success, true);

            ({status, data} = await request("GET /orders?user_type=seller"));
            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.items[0].comment, "hello world");
        });
    });

    after(async function () {
        await global.user.permissions.revoke([
            PERMISSIONS.ORDER_CREATE,
            PERMISSIONS.PRODUCT_CREATE,
            PERMISSIONS.ORDER_LIST_PURCHASES,
            PERMISSIONS.ORDER_LIST_SALES,
            PERMISSIONS.SALES_CHANNEL_LIST,
            PERMISSIONS.ORDER_SHOW_SALESCHANNEL,
            PERMISSIONS.READ_ORDER_DETAILS,
            PERMISSIONS.UPDATE_ORDER_DETAILS
        ]);
    });
});
