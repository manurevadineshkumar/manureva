const Main = require("../tests-server/server");
const Server = require("../Server");
const ScraperManager = require("../ScraperManager");
const LiveStorage = require("../queue/LiveStorage");
const RecloJpScraping = require("../scrapings/RecloJpScraping");
const Storage = require("../storage/Storage");
const path = require("path");
const fs = require("fs");

const TEST_DB = "korvin_test";

async function recreateTestDatabase() {
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
        `DROP DATABASE IF EXISTS ??; CREATE DATABASE ??; USE ??;` +
        contents.join("\n"),
        TEST_DB, TEST_DB, TEST_DB
    );


    await Storage.query(
        `INSERT INTO countries (id, name, phone_prefix)
            VALUES (1, 'LaLaLand', 1);`
    );

    const user = {
        id: 7,
        username: "Reclo",
        password_hash: "",
        first_name: "Reclo",
        last_name: "Reclo",
        email: "reclo@reclo.com",
        address_street: "",
        address_city: "",
        address_zip: "",
        address_country_id: 1,
        company_name: "Reclo"
    };

    await Storage.query(`INSERT INTO users SET ?;`, user);

    console.info(`Test database created in ${Date.now() - time}ms`);

    process.env.DB_DATABASE = TEST_DB;
}

async function mochaGlobalSetup() {
    await LiveStorage.connect();
    await LiveStorage.run("FLUSHALL");
    await LiveStorage.run("SET", "is-scraping", "1");
    await LiveStorage.run("ZADD", "task-groups-queue", 0, {
        title: "Scraping test only",
        date: "0",
        inputs: [
            {
                vendor: "RECLOJP",
                type: 0,
                params: { brand: "test" }
            }
        ],
        tasks: [
            [
                { operation_id: "listVendors" }
            ],
            [
                { operation_id: "scrapeVendors" }
            ]
        ]
    });

    if (process.env.RECREATE_TEST_DATABASE)
        await recreateTestDatabase();

    RecloJpScraping.BASE_URL = process.env.MOCK_RECLOJP_BASE_URL;
    await Main.main();

    console.info("Setting up ScraperManager");

    const scraper_manager = new ScraperManager();
    const server = new Server(scraper_manager);

    await scraper_manager.init();

    server.listen(8282);

    for (
        let is_scraping = true;
        is_scraping;
        is_scraping = await LiveStorage.run("EXISTS", "is-scraping")
    ) {
        console.debug("Waiting for scrapers to finish...");

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

module.exports = {mochaGlobalSetup};
