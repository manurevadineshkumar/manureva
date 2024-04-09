require("dotenv").config({path: "../.env"});

const fs = require("fs");
const path = require("path");

const request = require("./request");

const Server = require("../../app/Server");

const Storage = require("../../app/storage/Storage");

const User = require("../../app/models/User");
const Brand = require("../../app/models/Brand");
const Type = require("../../app/models/Type");
const Subtype = require("../../app/models/Subtype");
const Product = require("../../app/models/Product");

let server;

const TEST_DB = "korvin_test";

async function recreateTestDatabase() {
    delete process.env.DB_DATABASE;

    Storage.connect();

    const files = await fs.promises.readdir("../db/");
    const contents = await Promise.all(
        files
            .sort()
            .filter(file => file.endsWith(".sql"))
            .map(async file =>
                "" + await fs.promises.readFile(path.join("../db/", file))
            )
    );

    const time = Date.now();

    console.info(
        `Creating test database "${TEST_DB}"`,
        "with", files.length, "tables..."
    );

    await Storage.query(
        [
            "DROP DATABASE IF EXISTS ??;",
            "CREATE DATABASE ??;",
            "USE ??;",
            ...contents
        ].join("\n"),
        TEST_DB, TEST_DB, TEST_DB
    );

    console.info(`Test database created in ${Date.now() - time}ms`);

    process.env.DB_DATABASE = TEST_DB;

    await Storage.stop();
}

async function insertTestData() {
    return await Storage.query(
        `INSERT INTO countries (id, name, phone_prefix)
            VALUES (1, 'LaLaLand', 1);
        INSERT INTO products_groups (id, is_system) VALUES (1, 1);
        INSERT INTO tags (id, products_group_id, name) VALUES (1, 1, 'New');`
    );
}

// When clearing tables, order is opposite to creation order to avoid violating
// FK constraints (most dependent tables come first)
async function clearTestDatabase() {
    const tables = (await fs.promises.readdir("../db/"))
        .sort((a, b) => b.localeCompare(a))
        .map(filename => filename.match(/^\d{2}-([a-zA-Z_]+)\.sql$/)?.[1])
        .filter(Boolean);

    const time = Date.now();

    await Storage.query(
        `DELETE FROM ?? WHERE 1;`.repeat(tables.length),
        ...tables
    );

    console.info(`Test database cleared in ${Date.now() - time}ms`);
}

async function createTestUser(username) {
    const password = "Test0123";

    global.user = await User.create({
        username,
        password,
        email: "admin@test.korvin",
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
    });

    const res = await request("POST /sessions", {username, password});

    const cookies = Object.fromEntries(
        res.headers["set-cookie"]?.[0]
            ?.split("; ")
            ?.map(pair => pair.split("=")) || []
    );

    if (!cookies["Session-ID"])
        throw new Error("Session-ID cookie not set");

    return cookies["Session-ID"];
}

async function createTestProduct() {
    global.korvin_brand = await Brand.create("KORVIN");
    global.default_type = await Type.create("Type");
    global.default_subtype = await Subtype.create("Subtype");

    const product = await Product.create({
        original_url: "https://korvin.io/",
        original_name: "Korvin bag",
        description: "Amazing Korvin bag",
        bought_price: 0,
        bought_currency: "EUR",
        grade: "A"
    }, global.korvin_brand, global.default_type, global.default_subtype);

    return product.id;
}

async function mochaGlobalSetup() {
    console.debug = () => {};

    process.env.DB_DATABASE = TEST_DB;

    if (process.env.RECREATE_TEST_DATABASE)
        await recreateTestDatabase();
    else
        await clearTestDatabase();

    await insertTestData();

    server = new Server();

    await server.setup(require("../../app/openapi.json"));
    await server.listen(8080);

    process.env.TEST_ADMIN_SESSION_ID = await createTestUser("admin");
    process.env.TEST_PRODUCT_ID = await createTestProduct();
}

async function mochaGlobalTeardown() {
    await server.stop();
}

module.exports = {mochaGlobalSetup, mochaGlobalTeardown};
