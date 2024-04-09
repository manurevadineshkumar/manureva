const Job        = require("../Job");
const Translator = require("../Translator");
const Utils      = require("../Utils");

const BasePuppeteerScraping = require("./BasePuppeteerScraping");

class RecloJpScraping extends BasePuppeteerScraping {
    static NAME = "RECLOJP";

    static VERSION = "1.0";

    static BASE_URL = "https://reclo.jp/";

    static BRANDS = [
        "CHLOE",
        "CHANEL",
        "GUCCI",
        "HERMES",
        "CELINE",
        "FENDI",
        "CHRISTIAN DIOR",
        "BOTTEGA VENETA",
        "MIU MIU",
        "PRADA",
        "SAINT LAURENT PARIS",
        "BALENCIAGA",
        "STELLA MCCARTNEY",
        "DOLCE&GABBANA",
        "SALVATORE FERRAGAMO",
        "LOEWE",
        "BURBERRY",
        "COACH"
    ];

    static VENDOR_USER_ID = 7;

    name = RecloJpScraping.NAME;

    constructor(page) {
        super(page);
    }

    async blockStaticResources() {
        await this.page.setRequestInterception(true);

        this.page.on("request", req => {
            if (req.resourceType() != "document")
                return req.abort();

            req.continue();
        });
    }

    async listItems({brand, search}) {
        await this.blockStaticResources();

        this.emit("update", {url: `reclo.jp: ${search || brand}`, progress: 0});

        const url = RecloJpScraping.BASE_URL
            + (search ? "search" : "brand/" + encodeURIComponent(brand));
        const params = search ? {search_field: search} : {};
        const selector = search
            ? "#content > .inner .layout_list .post > a"
            : ".layout_base.layout_list.category.new_arrivals .post > a";

        await this.page.goto(
            url + "?" + Utils.querify(params),
            {waitUntil: "domcontentloaded"}
        );

        const getPageItems = page => page.$$eval(
            selector,
            elements => elements.map(a => a.href.split("?")[0])
        );

        const pages_count = +(
            await this.page.$eval(".page_num", el => el.innerText)
        ).match(/(\d+) pages$/)[1] ?? 1;

        const items = await getPageItems(this.page);

        this.emit("update", {progress: 1 / pages_count});

        for (let i = 2; i <= pages_count; i++) {
            await this.page.goto(
                `${url}?` + Utils.querify({...params, page: i}),
                {waitUntil: "domcontentloaded"}
            );

            items.push(...await getPageItems(this.page));

            this.emit("update", {progress: i / pages_count});
        }

        this.emit("update", {url, progress: 0});

        return items.map(url => Job.create({
            vendor: "RECLOJP",
            type: 1,
            url
        }));
    }

    async #getTables() {
        const table_jp = await this.page.evaluate(() => {
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
                    // Get the text within each cell,
                    // replace multiple spaces with a single space, and trim leading/trailing spaces
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

    async processItem({url}) {
        await this.blockStaticResources();

        await this.page.goto(url, {waitUntil: "domcontentloaded"});

        let brand, title, price_main, price_secondary, grade, image_urls,
            table_jp, url_params;

        const getPrice = async selector => await this.page.evaluate(
            selector => +document.querySelector(selector)
                ?.textContent
                ?.match(/[0-9]/g)
                ?.join("") || null,
            selector
        );

        try {
            [brand, title] = await this.page.$$eval(
                "#detail_text > header > h1 > *",
                children => children.map(el => el.innerText)
            );
            price_main = await getPrice(".price_wrap .c_price");
            price_secondary = await getPrice(".price_wrap .n_price");
            grade = await this.page.evaluate(() =>
                [...document.querySelector(".rank_wrap > .rank").classList]
                    .find(name => name != "rank")
            );
            image_urls = await this.page.$$eval(
                ".module_slide.zoom .slide_list figure img",
                images => images.map(img => img.src)
            );

            table_jp = await this.#getTables();

            url_params = await this.page.evaluate(() => Object.fromEntries(
                new URLSearchParams(window.location.search)
            ));
        } catch (err) {
            console.error("Scraping error:", err);

            this.emit("log", ["Error: " + err]);

            return null;
        }

        const {
            size: size_obj,
            details
        } = await Translator.translateObj(table_jp);

        const gender_str = await Translator.translate(details?.gender);
        const gender = {"Women": 0, "Men": 1}[gender_str] ?? null;

        const [type = null, subtype = null] = await this.page.evaluate(() =>
            document.querySelector(
                ".detail tbody > tr:nth-child(2) > td > a:last-child"
            )?.href?.substring(28)?.split("/") ?? []
        );

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

        return {
            original_url: url,
            owner_id: RecloJpScraping.VENDOR_USER_ID,
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
    }

    static async create(name) {
        const instance = await super.create();

        await instance.page.setUserAgent(
            BasePuppeteerScraping.USER_AGENT
            + ` KorvinScraper/${RecloJpScraping.VERSION} (${name})`
        );

        return instance;
    }
}

module.exports = RecloJpScraping;
