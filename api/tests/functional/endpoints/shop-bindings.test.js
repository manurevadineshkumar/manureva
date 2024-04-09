const assert = require("assert");

const request = require("../request");
const ShopAttributeStorage = require(
    "../../../app/storage/ShopAttributeStorage"
);
const Color = require("../../../app/models/Color");
const Material = require("../../../app/models/Material");
const Tag = require("../../../app/models/Tag");

let shop_id;

let attributes = [
    {
        name: "Color",
        values: [
            {value: "Red"},
            {value: "Green"},
            {value: "Blue"}
        ]
    },
    {
        name: "Material",
        values: [
            {value: "Wood"},
            {value: "Stone"},
            {value: "Dragon scales"}
        ]
    },
    {
        name: "Smell",
        values: [
            {value: "Rotten eggs"},
            {value: "Old socks"},
            {value: "Moldy cheese"}
        ]
    }
];

const day_ranges = [30, null];
const price_ranges = [1, 5, null];
const discount_values = [
    [5, 2],
    [0, 4],
    [10, 6]
];

describe("/shops/{shop_id}/attributes", function() {
    before(async function() {
        const {status, data} = await request(
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

        assert.strictEqual(status, 200, data.error);

        shop_id = data.id;
    });

    describe("GET", function() {
        before(async function() {
            await ShopAttributeStorage.setForShop(
                shop_id,
                attributes.map(({name}) => name)
            );

            (
                await ShopAttributeStorage.listForShop(shop_id)
            ).forEach(({id, name}) => {
                attributes.find(it => it.name == name).id = id;
            });

            await Promise.all(attributes.map(async attr => {
                await ShopAttributeStorage.setValues(attr.id, attr.values);
            }));

            const result = await ShopAttributeStorage.listForShop(shop_id);

            assert.deepStrictEqual(attributes, result.map(attr => ({
                id: attr.id,
                name: attr.name,
                values: attr.values.map(({value}) => ({value}))
            })));

            attributes = result.map(({shop_id: _, ...data}) => data);
        });

        it("lists attributes and their values", async function() {
            const {status, data} = await request(
                `/shops/${shop_id}/attributes`
            );

            assert.strictEqual(status, 200, data.error);
            assert.deepStrictEqual(data, attributes);
        });
    });
});

describe("/shops/{shop_id}/bindings/{category}/{korvin_id?}", function() {
    let entities;

    before(async function() {
        entities = await Promise.all([
            Color.create("Magenta"),
            Material.create("Honeycombs"),
            Tag.create({user_id: global.user.id, name: "My Shop"})
        ]);
    });

    const assertEmptyBindings = (data, names) => {
        assert.deepStrictEqual(
            data.entities.filter(({name}) => !names.includes(name)),
            []
        );
        assert.deepStrictEqual(data.bindings, []);
    }

    describe("GET", function() {
        it("lists empty gender bindings", async function() {
            const {status, data} = await request(
                `/shops/${shop_id}/bindings/genders`
            );

            assert.strictEqual(status, 200, data.error);

            assertEmptyBindings(data, ["Female", "Male"]);
        });
        it("lists empty type bindings", async function() {
            const {status, data} = await request(
                `/shops/${shop_id}/bindings/types`
            );

            assert.strictEqual(status, 200, data.error);

            assertEmptyBindings(data, ["Type"]);
        });
        it("lists empty brand bindings", async function() {
            const {status, data} = await request(
                `/shops/${shop_id}/bindings/brands`
            );

            assert.strictEqual(status, 200, data.error);

            assertEmptyBindings(data, ["KORVIN"]);
        });
        it("lists empty color bindings", async function() {
            const {status, data} = await request(
                `/shops/${shop_id}/bindings/colors`
            );

            assert.strictEqual(status, 200, data.error);

            assertEmptyBindings(data, ["Magenta"]);
        });
        it("lists empty material bindings", async function() {
            const {status, data} = await request(
                `/shops/${shop_id}/bindings/materials`
            );

            assert.strictEqual(status, 200, data.error);

            assertEmptyBindings(data, ["Honeycombs"]);
        });
    });

    describe("PUT", function() {
        it("binds a color to a shop attribute", async function() {
            {
                const {status, data} = await request(
                    `PUT /shops/${shop_id}/bindings/colors`,
                    {
                        korvin_id: entities[0].id,
                        attribute_value_id: attributes[0].values[0].id
                    }
                );

                assert.strictEqual(status, 200, data.error);
            }
            {
                const {status, data} = await request(
                    `/shops/${shop_id}/bindings/colors`
                );

                assert.strictEqual(status, 200, data.error);

                assert.deepStrictEqual(
                    data.bindings,
                    [{
                        korvin_id: entities[0].id,
                        shop_id: attributes[0].values[0].id
                    }]
                );
            }
        });
    });

    after(async function() {
        const {status, data} = await request(`DELETE /shops/${shop_id}`);

        assert.strictEqual(status, 200, data.error);

        await Promise.all(entities.map(it => it.delete()));
    });
});
