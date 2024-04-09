const assert = require("assert");
const sinon = require("sinon");

const request = require("../request");

const ShopifyService = require("../../../app/business-services/shop/shopify/Shopify.service");

let shop_id;
const compared_ranges = [
    {"to": 100, "percent": 5},
    {"to": 500, "percent": 0},
    {"to": null, "percent": 10}
]

const day_ranges = [30, null];
const price_ranges = [1, 5, null];
const discount_values = [
    [5, 2],
    [0, 4],
    [10, 6]
];

describe("/shops", function() {
    describe("GET", function() {
        it("returns an empty list of shops", async function() {
            const {status, data} = await request("/shops");

            assert.strictEqual(status, 200, data.error);
            assert.strictEqual(data.items.length, 0);
        });
    });
});

describe("/shops/details", function() {
    describe("GET", function() {
        const platform = "shopify";
        const url = "my-shop.myshopify.com";
        const token = "SUp3rS3Cr37t0K3n";
        const is_exporting = false;

        let mock;
        beforeEach(async function() {
            mock = sinon.mock(ShopifyService);
            mock.expects("fetchShopDetails")
                .once()
                .returns({currency: "EUR"});
        });

        afterEach(async function() {
            mock.restore();
        });

        it("should returns an error if the platform is not correct", async function() {
            const {status, data} = await request(
                "GET /shops/details",
                {
                    platform: "not-shopify",
                    url,
                    token
                }
            );

            assert.strictEqual(status, 400, data.error);
        });

        it("returns the shop details", async function() {
            const {status, data} = await request(
                "GET /shops/details",
                {
                    platform,
                    url,
                    token
                }
            );

            assert.strictEqual(status, 200, data.error);
            mock.verify();
        });
    });
});

describe("/shops/{id}", function() {
    describe("POST", function() {
        it("creates a new shop", async function() {
            {
                const {status, data} = await request(
                    "POST /shops",
                    {
                        name: "My shop",
                        type: "shopify",
                        url: "my-shop.myshopify.com",
                        token: "SUp3rS3Cr37t0K3n",
                        platform: "shopify",
                        currency: "EUR",
                        is_importing: true,
                        is_exporting: false,
                        day_ranges,
                        price_ranges,
                        discount_values,
                    }
                );

                assert.strictEqual(status, 200, data.error);

                shop_id = data.id;

                assert.strictEqual(data.id, shop_id);
                assert.strictEqual(data.owner_id, global.user.id);
                assert.strictEqual(data.name, "My shop");
                assert.strictEqual(data.platform, "shopify");
                assert.strictEqual(data.currency, "EUR");
                assert.strictEqual(data.url, "my-shop.myshopify.com");
                assert.strictEqual(data.token, "••••••••••••••••••••••3n")
                assert.strictEqual(data.is_importing, 1);
                assert.strictEqual(data.last_import, null);
                assert.strictEqual(data.imported_products_count, 0);
                assert.strictEqual(data.exported_products_count, 0);
                assert.strictEqual(data.exported_slots, 20);
                assert.deepStrictEqual(data.ranges, compared_ranges);
                assert.deepStrictEqual(data.discount_ranges, [
                    { day_to: 30, price_to: 1, discount: 5 },
                    { day_to: null, price_to: 1, discount: 2 },
                    { day_to: 30, price_to: 5, discount: 0 },
                    { day_to: null, price_to: 5, discount: 4 },
                    { day_to: 30, price_to: null, discount: 10 },
                    { day_to: null, price_to: null, discount: 6 }
                  ]);
            }
            {
                const {status, data} = await request("/shops");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 1);
            }
        });

        it("fails to create a shop with a duplicate name", async function() {
            const {data, status} = await request(
                "POST /shops",
                {
                    name: "My shop",
                    type: "shopify",
                    url: "my-new-shop.myshopify.com",
                    token: "SUp3rS3Cr37t0K3n",
                    platform: "shopify",
                    currency: "EUR",
                    is_importing: true,
                    is_exporting: true,
                    day_ranges,
                    price_ranges,
                    discount_values,
                }
            );

            assert.strictEqual(status, 409, data.error);
        });

        it("fails to create a shop with an invalid URL", async function() {
            const {status} = await request(
                "POST /shops",
                {
                    name: "Sheep-ify",
                    type: "shopify",
                    url: "my-new-shop.not-shopify.com",
                    token: "SUp3rS3Cr37t0K3n",
                    platform: "shopify",
                    currency: "EUR",
                    is_importing: true,
                    is_exporting: false,
                    day_ranges,
                    price_ranges,
                    discount_values,
                }
            );

            assert.strictEqual(status, 400);
        });

        it("fails to create a shop with a invalid ranges", async function() {
            const shop_data = {
                name: "My invalid shop",
                type: "shopify",
                url: "my-invalid-shop.myshopify.com",
                token: "SUp3rS3Cr37t0K3n",
                platform: "shopify",
                is_importing: true,
                is_exporting: false
            };
            {
                const {status} = await request(
                    "POST /shops",
                    {
                        ...shop_data,
                        ranges: []
                    }
                );

                assert.strictEqual(status, 400);
            }
            {
                const {status} = await request(
                    "POST /shops",
                    {
                        ...shop_data,
                        ranges: [
                            {"to": 100, "percent": 0},
                        ]
                    }
                );

                assert.strictEqual(status, 400);
            }
            {
                const {status} = await request(
                    "POST /shops",
                    {
                        ...shop_data,
                        ranges: [
                            {"to": null, "percent": 0},
                            {"to": 100, "percent": 0},
                        ]
                    }
                );

                assert.strictEqual(status, 400);
            }
            {
                const {status} = await request(
                    "POST /shops",
                    {
                        ...shop_data,
                        ranges: [
                            {"to": 100, "percent": 0},
                            {"to": 100, "percent": 0},
                            {"to": null, "percent": 0},
                        ]
                    }
                );

                assert.strictEqual(status, 400);
            }
        });
    });

    describe("PATCH", function() {
        it("Updates a shop", async function() {
            {
                const {status, data} = await request(
                    `PATCH /shops/${shop_id}`,
                    {
                        name: "My amazing shop",
                        type: "shopify",
                        is_exporting: 1,
                        token: "n0TS0S3cr37Tok3N",
                    }
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request("/shops");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 1);

                const [shop] = data.items;

                assert.ok(shop);

                assert.ok(!shop.is_importing);
                assert.ok(shop.is_exporting);

                assert.strictEqual(shop.name, "My amazing shop");
                assert.strictEqual(shop.token, "••••••••••••••••••••••3N");

                assert.deepStrictEqual(shop.ranges, compared_ranges);
            }
        });
    });

    describe("DELETE", function() {
        it("deletes a shop", async function() {
            {
                const {status, data} = await request(
                    `DELETE /shops/${shop_id}`
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request("/shops");

                assert.strictEqual(status, 200, data.error);
                assert.strictEqual(data.items.length, 0);
            }
        });

        it("fails to delete a nonexistent shop", async function() {
            const {status} = await request(`DELETE /shops/${shop_id}`);

            assert.strictEqual(status, 404);
        });
    });
});
