const assert = require("assert");
const Storage = require("../storage/Storage");

const assertProduct = async (reclojp_id, data) => {
    const [product] = await Storage.querySilent(
        "SELECT * FROM products WHERE original_url LIKE ?;",
        `%/${reclojp_id}.html`
    );

    assert.ok(product);

    assert.ok(product.id > 0);
    delete product.id;

    assert.ok(!isNaN(product.creation_date));
    delete product.creation_date;

    assert.ok(!isNaN(product.last_update));
    delete product.last_update;

    assert.ok(!isNaN(product.last_scrape));
    delete product.last_scrape;

    assert.ok(product.brand_id);
    delete product.brand_id;

    assert.ok(product.subtype_id);
    delete product.subtype_id;

    assert.strictEqual(
        product.original_url,
        process.env.MOCK_RECLOJP_BASE_URL + reclojp_id + ".html"
    );
    delete product.original_url;

    assert.ok(product.size.length);
    delete product.size;

    assert.ok(!isNaN(product.has_box));
    delete product.has_box;

    assert.ok(!isNaN(product.has_guarantee_card));
    delete product.has_guarantee_card;

    assert.ok(!isNaN(product.has_serial));
    delete product.has_serial;

    assert.ok(!isNaN(product.has_storage_bag));
    delete product.has_storage_bag;

    assert.ok(!isNaN(product.is_exported_vc));
    delete product.is_exported_vc;

    assert.deepStrictEqual(
        {...product},
        {
            status: "ACTIVE",
            is_exportable: 1,
            owner_id: 7,
            type_id: 1,
            bought_currency: "JPY",
            gender: null,
            model: null,
            name: null,
            description: null,
            vendor_bought_price: null,
            bought_price_discounted: null,
            purchase_price_cents: null,
            wholesale_price_cents: null,
            retail_price_cents: null,
            retail_price_cents_discounted: null,
            wholesale_price_cents_discounted: null,
            purchase_price_cents_discounted: null,
            ...data
        }
    );
};

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 829077", async function () {
            await assertProduct(
                829077,
                {
                    original_name: "LOOP ループ ローカットスニーカー フェイクレザー ホワイト",
                    bought_price: 15070,
                    bought_price_discounted: 13563,
                    grade: "C",
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 831803", async function () {
            await assertProduct(
                831803,
                {
                    original_name: " ロングジャケット チェスターコート ウール ツイード ダークグレー",
                    bought_price: 25300,
                    bought_price_discounted: 22770,
                    grade: "C"
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 832103", async function () {
            await assertProduct(
                832103,
                {
                    original_name: "ステラロゴ クロスボディ ショルダーバッグ フェイクレザー ブラック",
                    bought_price: 37950,
                    bought_price_discounted: 36052,
                    grade: "B"
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 832123", async function () {
            await assertProduct(
                832123,
                {
                    original_name: "LADY DIOR MY ABCDIOR レディディオール カナージュ ハンドバッグ レザー ブラック 2WAY",
                    bought_price: 605000,
                    bought_price_discounted: 544500,
                    grade: "A"
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 832633", async function () {
            await assertProduct(
                832633,
                {
                    original_name: "ANTERNE ダウンジャケット ライトピンク",
                    bought_price: 75900,
                    grade: "B"
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 833049", async function () {
            await assertProduct(
                833049,
                {
                    original_name: " ワンピース 総柄 シルク ダークネイビー マルチカラー",
                    bought_price: 23100,
                    grade: "AB"
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 834818", async function () {
            await assertProduct(
                834818,
                {
                    original_name: " ブラウス ブラック フェイクパール",
                    bought_price: 43780,
                    grade: "B"
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 835206", async function () {
            await assertProduct(
                835206,
                {
                    original_name: "スペード フラワー カーディガン クルーネック コットン ホワイト グレー ラメ",
                    bought_price: 10120,
                    grade: "AB"
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 835346", async function () {
            await assertProduct(
                835346,
                {
                    original_name: "トロッター ポーチ PVC エナメルレザー ネイビー アイボリー",
                    bought_price: 11440,
                    grade: "C"
                }
            );
        });
    });
});

describe("Scraper", function () {
    describe("Product scanning", function () {
        it("N° 835808", async function () {
            await assertProduct(
                835808,
                {
                    original_name: "パッシィPM エピ ノワール ハンドバッグ レザー ブラック",
                    bought_price: 50600,
                    grade: "BC"
                }
            );
        });
    });
});
