require("dotenv").config({path: "../.env"});
const puppeteer = require('puppeteer');
const Translator = require("../app/Translator");

async function scrape_details() {
    const browser = await puppeteer.launch({headless: "new"});
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on("request", req => {
        if (req.resourceType() != "document")
            return req.abort();

        req.continue();
    });

    page.on('console', async (msg) => {
        const msgArgs = msg.args();
        for (let i = 0; i < msgArgs.length; ++i) {
          console.log(await msgArgs[i].jsonValue());
        }
    });

    console.log("Navigating to reclo.jp");

    // Navigate the page to a URL
    await page.goto('https://reclo.jp/item/detail/879079');

    const table_jp = await page.evaluate(() => {
        // Get all sections
        const sections = [...document.querySelectorAll(".detail_wrap section")];

        // Map each section to an entry
        const entries = sections.map(section => {
            // Get the section title
            const title = section.querySelector("h4").innerText;

            // Get the table rows within the section
            const rows = [...section.querySelector(":scope > table > tbody").children];

            // Map each row to an entry
            const rowEntries = rows.map(tr => {
                // Get the text within each cell, replace multiple spaces with a single space, and trim leading/trailing spaces
                const cells = [...tr.children].map(el => el.innerText.replaceAll(/\s+/g, " ").trim());

                return cells;
            });
            console.log({rowEntries});

            // Convert the row entries to an object
            const rowEntriesObject = Object.fromEntries(rowEntries);

            return [title, rowEntriesObject];
        });

        // Convert the entries to an object
        const entriesObject = Object.fromEntries(entries);

        return entriesObject;
    });

    console.log({table_jp});

    await browser.close();
}

async function getTables(page) {
    const table_jp = await page.evaluate(() => {
        // Get all sections
        const sections = [...document.querySelectorAll(".detail_wrap section")];

        // Map each section to an entry
        const entries = sections.map(section => {
            // Get the section title
            const title = section.querySelector("h4").innerText;

            // Get the table rows within the section
            const rows = [...section.querySelector(":scope > table > tbody").children];

            // Map each row to an entry
            const rowEntries = rows.map(tr => {
                // Get the text within each cell, replace multiple spaces with a single space, and trim leading/trailing spaces
                const cells = [...tr.children].map(el => el.innerText.replaceAll(/\s+/g, " ").trim());

                return cells;
            });

            // Convert the row entries to an object
            const rowEntriesObject = Object.fromEntries(rowEntries);

            return [title, rowEntriesObject];
        });

        // Convert the entries to an object
        const entriesObject = Object.fromEntries(entries);

        return entriesObject;
    });

    return table_jp;
}

async function processItem(url) {
    const browser = await puppeteer.launch({headless: "new"});
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on("request", req => {
        if (req.resourceType() != "document")
            return req.abort();

        req.continue();
    });

    page.on('console', async (msg) => {
        const msgArgs = msg.args();
        for (let i = 0; i < msgArgs.length; ++i) {
          console.log(await msgArgs[i].jsonValue());
        }
    });

    await page.goto(url, {waitUntil: "domcontentloaded"});

    let brand, title, price_main, price_secondary, grade, image_urls,
        table_jp, url_params;

    const getPrice = async selector => await page.evaluate(
        selector => +document.querySelector(selector)
            ?.textContent
            ?.match(/[0-9]/g)
            ?.join("") || null,
        selector
    );

    try {
        [brand, title] = await page.$$eval(
            "#detail_text > header > h1 > *",
            children => children.map(el => el.innerText)
        );
        price_main = await getPrice(".price_wrap .c_price");
        price_secondary = await getPrice(".price_wrap .n_price");
        grade = await page.evaluate(() =>
            [...document.querySelector(".rank_wrap > .rank").classList]
                .find(name => name != "rank")
        );
        image_urls = await page.$$eval(
            ".module_slide.zoom .slide_list figure img",
            images => images.map(img => img.src)
        );

        table_jp = await getTables(page);

        url_params = await page.evaluate(() => Object.fromEntries(
            new URLSearchParams(window.location.search)
        ));
    } catch (err) {
        console.error("Scraping error:", err);

        emit("log", ["Error: " + err]);

        return null;
    }

    const {
        size: size_obj,
        details
    } = await Translator.translateObj(table_jp);

    const gender_str = await Translator.translate(details?.gender);
    const gender = {"Women": 0, "Men": 1}[gender_str] ?? null;

    const [type = null, subtype = null] = await page.evaluate(() =>
        document.querySelector(
            ".detail tbody > tr:nth-child(2) > td > a:last-child"
        )?.href?.substring(28)?.split("/") ?? []
    )

    const size = Object.fromEntries(
        await Promise.all(Object.entries(size_obj).map(
            async ([key, val]) => [
                await Translator.translate(key),
                await Translator.translate(val)
            ]
        ))
    );

    const colors = await Promise.all(
        details?.color?.split(" ")?.map(
            color => Translator.translate(color)
        ) || []
    );
    const materials = await Promise.all(
        details?.material?.split(" ")?.map(
            material => Translator.translate(material)
        ) || []
    );

    const accessories = (await Translator.translate(details?.accessories))
        ?.toLocaleLowerCase()
        .split(" ");

    console.log(accessories);

    const result = {
        original_url: url,
        owner_id: 7,
        is_exportable: 1,
        status: url_params.soldout ? "DISABLED" : "ACTIVE",
        gender,
        type: type.toLocaleLowerCase(),
        subtype: subtype.toLocaleLowerCase(),
        original_name: title,
        description: null,
        vendor_bought_price: null,
        bought_price: price_secondary ?? price_main,
        bought_price_discounted: price_secondary ? price_main : null,
        bought_currency: "JPY",
        grade,
        brand: brand.toLocaleUpperCase(),
        size,
        colors,
        materials,
        has_serial: accessories.includes("serial"),
        has_guarantee_card: accessories.includes("guarantee") && accessories.includes("card"),
        has_box: accessories.includes("box"),
        has_storage_bag: accessories.includes("storage") && accessories.includes("bag"),
        image_urls
    };

    console.log({result});

    await browser.close();

    return;
}

// scrape_details();
processItem("https://reclo.jp/item/detail/865856");

