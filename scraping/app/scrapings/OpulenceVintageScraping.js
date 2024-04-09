const Job            = require("../Job");
const ColorStorage   = require("../storage/ColorStorage");
const MaterialStorage = require("../storage/MaterialStorage");

const BasePuppeteerScraping = require("./BasePuppeteerScraping");

class OpulenceVintageScraping extends BasePuppeteerScraping {
    static NAME = "OPULENCE_VINTAGE";

    static BASE_URL = "https://www.opulencevintage.com";

    static VENDOR_USER_ID = 30;

    static BRANDS = [
        "Balmain",
        "Caron Cherry",
        "Cartier",
        "Carven",
        "Celine",
        "Chanel",
        "Christian LaCroix",
        "Delvaux",
        "Christian Dior",
        "Dior",
        "Dolce Gabbana",
        "Fendi",
        "Givenchy",
        "Goyard",
        "Gucci",
        "Hermes",
        "JC De Castelbajac",
        "Jean Paul Gaultier",
        "John Galliano",
        "Kenzo",
        "Louis Vuitton",
        "Moschino",
        "Mugler",
        "paco rabanne",
        "Roberto Cavalli",
        "Valentino",
        "Versace",
        "Yves Saint Laurent",
        "Balenciage",
        "Nina Ricci",
        "Berluti",
        "Alexander Mcqueen",
        "Pierre cardin",
        "Missoni",
        "Oscar De La Renta",
        "Ferragamo",
        "Courrèges",
        "Louis Féraud",
        "Comme des garçons",
        "Sonia Rykiel",
        "Lanvin",
        "Rochas",
        "Dunhill",
        "Boucheron",
        "Jimmy Choo",
        "Pucci",
        "Azzaro",
        "Guy Laroche",
        "Emmanuel Ungaro",
        "Herve Leger",
        "Loewe",
        "Miu Miu",
        "Bottega Veneta",
        "Balenciaga",
        "Prada"
    ];

    static SUBTYPES = {
        "bags": ["handbags", "backpack", "fannypack", "pouch", "clutch"],
        "jewelry": ["bracelets", "necklaces", "earrings", "watches", "brooches"],
        "small goods": ["wallet"],
        "clothing": ["shoes", "jackets", "dresses"],
        "accessories": ["hats", "scarves", "belts", "cufflinks"],
        "lifestyle": ["decoration"]
    };

    // /** @type {Promise<string[]>} */
    // static COLORS = ColorStorage.getAll();

    // /** @type {Promise<string[]>} */
    // static MATERIALS = MaterialStorage.getAll();

    name = OpulenceVintageScraping.NAME;

    constructor(page) {
        super(page);
    }

    /**
     * Blocks static resources by setting request interception
     * and aborting requests that are not documents, scripts, or XHR.
     */
    async blockStaticResources() {
        await this.page.setRequestInterception(true);

        this.page.on("request", req => {
            if (req.resourceType() === "document" || req.resourceType() === "script" || req.resourceType() === "xhr") {
                return req.continue();
            }

            return req.abort();
        });
    }

    async listItems() {
        // block resources
        await this.blockStaticResources();

        // create url
        const url = OpulenceVintageScraping.BASE_URL + "/stock";

        // go to url
        await this.page.goto(url, {waitUntil: "domcontentloaded"});

        // get page count
        const pageHandle = await this.page.$("span#count");
        const totalPageHandle = await pageHandle.evaluateHandle(el => el.nextElementSibling);
        const totalPage = await totalPageHandle.evaluate(el => el.innerText.replace(/[^0-9]/g, ""));
        // const totalPage = "1";

        // scroll to end
        let currentPage = await this.page.$eval("span#count", el => el.innerText);
        while (currentPage !== totalPage) {
            console.info("[OpulenceVintageScraping] Scrolling to end...");
            currentPage = await this.page.$eval("span#count", el => el.innerText);
            await this.page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
            await new Promise(r => setTimeout(r, 2000));
        }

        // get items
        const itemUrls = await this.page.$$eval("div.artist > a.artist", el => el.map((a) => a.href));

        // create jobs and return it
        return itemUrls.map(url => Job.create({vendor: "OPULENCE_VINTAGE", type: 1, url}));
    }

    /**
     * Retrieves the description of the product from the page.
     * @returns {Promise<string>} The description of the product.
     */
    async #getDescription() {
        const allInnerTextArray = await this.page.$$eval("div#product_banner div", (el) => {
            return el.map(e => e.innerText);
        });

        const description = allInnerTextArray
            .filter(e => !e.includes("Andorra")) // remove shipping countries. Pick any country to select the string
            .join("")
            .split("\n")
            .map(e => e.trim())
            .filter(e => !e.includes("Shipping") && !e.includes("Enquire") && !e.includes("Add to Cart")) // clean up
            .filter(Boolean)
            .join("\n");

        return description;
    }

    /**
     * Retrieves the prices from the page.
     * @returns {Promise<{ price: number, discounted_price: number|null }>}
     *  The prices object containing the price and discounted price (if available).
     */
    async #getPrices() {
        const priceInnerText = await this.page.$eval("div#price_format", el => el.innerText);

        const price = priceInnerText.split("SALE")[0].trim().replace("€", "").replace(",", "");
        const discounted_price = priceInnerText.split("SALE")[1]?.trim().replace("€", "").replace(",", "");

        if (/^\d+$/.test(price) === false) {
            throw new Error(`Price is not a number: ${price}`);
        }

        return {
            price: +price,
            discounted_price: discounted_price ? +discounted_price : null
        };
    }

    /**
     * Retrieves the image URLs from the page.
     * @returns {Promise<string[]>} An array of image URLs.
     */
    async #getImageUrls() {
        const imageUrls = await this.page.$$eval("a[data-fancybox='gallery']", (elements) => {
            return elements.map(e => e.href);
        });

        return imageUrls.filter(url => url.endsWith(".jpg") || url.endsWith(".png") || url.endsWith(".jpeg"));
    }

    /**
     * Retrieves the size information from the description and page elements.
     * @param {string} description - The description of the item.
     * @returns {Object<string, string>|null} - The size information object or null if no size information is found.
     */
    async #getSize(description) {
        const sizeDimensions = await this.page.$$eval("div#collapseDimensions span", (elements) => {
            return elements.map(e => e.innerText);
        });

        let size = {};

        if (sizeDimensions.length > 0 && sizeDimensions.length % 2 === 0) {
            const sizeDimensionsEntries = sizeDimensions.reduce((acc, val, index, array) => {
                if (index % 2 === 0) {
                    acc.push(
                        array.slice(index, index + 2).map(e => e.trim())
                    );
                }
                return acc;
            }, []);

            size = {...size, ...Object.fromEntries(sizeDimensionsEntries)};
        }

        const sizeDescription = [];
        for (const line of description.split("\n")) {
            if (line.includes("Size:")) {
                sizeDescription.push(line.split(":")[1].trim());
            }
        }

        const sizeDescriptionObject = sizeDescription.reduce((acc, val) => {
            const splittedValue = val.split(" ");
            acc[splittedValue[0]] = splittedValue.slice(1).join(" ");
            return acc;
        }, {});

        size = {...size, ...sizeDescriptionObject};

        if (Object.keys(size).length > 0) {
            return size;
        }

        return null;
    }

    /**
     * Finds the brand in the given title and description.
     * @param {string} title - The title of the item.
     * @param {string} description - The description of the item.
     * @returns {string|null} The found brand or null if no brand is found.
     */
    #findBrand(title, description) {
        const allBrands = OpulenceVintageScraping.BRANDS.map((brand) => {
            return brand.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase();
        });

        const normalizedTitle = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase();
        const normalizedDescription = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase();

        const foundBrands = allBrands.reduce((acc, brand) => {
            if (normalizedTitle.includes(brand) || normalizedDescription.includes(brand)) {
                acc.push(brand);
            }
            return acc;
        }, []);

        if (foundBrands.length === 0) {
            return null;
        }

        return foundBrands[0];
    }

    /**
     * Finds the type and subtype based on the provided description.
     * @param {string} description - The description to search for type and subtype.
     * @returns {{type: string, subtype: string}} - An object containing the found type and subtype.
     */
    #findTypeAndSubtype(description) {
        const normalizedDescription = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase();

        for (const [type, subtypes] of Object.entries(OpulenceVintageScraping.SUBTYPES)) {
            for (const subtype of subtypes) {
                const normalizedSubtype = subtype.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase();
                if (normalizedDescription.includes(normalizedSubtype)) {
                    return {
                        type: type,
                        subtype: subtype
                    };
                }
            }
        }

        return {
            type: "other",
            subtype: "other"
        };
    }

    /**
     * Finds the grade based on the description.
     * @param {string} description - The description of the item.
     * @returns {string} - The grade of the item.
     */
    #findGrade(description) {
        if (description.toLocaleLowerCase().includes("very good condition")) {
            return "A";
        } else if (description.toLocaleLowerCase().includes("good condition")) {
            return "AB";
        } else {
            return "B";
        }
    }

    /**
     * Finds colors in the given description.
     * @param {string} description - The description to search for colors.
     * @returns {Promise<string[]>} - An array of found colors.
     */
    async #findColors(description) {
        // const colors = await OpulenceVintageScraping.COLORS;
        const colors = this.allColors;

        const normalizedDescription = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

        const foundColors = colors.reduce((acc, color) => {
            const normalizedColor = color.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
            if (normalizedDescription.includes(normalizedColor)) {
                acc.push(color);
            }
            return acc;
        }, []);

        return foundColors;
    }

    /**
     * Finds materials in the given description.
     * @param {string} description - The description to search for materials.
     * @returns {Promise<string[]>} - An array of found materials.
     */
    async #findMaterials(description) {
        // const materials = await OpulenceVintageScraping.MATERIALS;
        // const colors = await OpulenceVintageScraping.COLORS;
        const materials = this.allMaterials;
        const colors = this.allColors;

        const cleanedMaterials = materials.reduce((acc, material) => {
            // remove short (rubbish) materials and colors from materials
            if (material.length > 2 && !colors.includes(material)) {
                acc.push(material);
            }
            return acc;
        }, []);

        const normalizedDescription = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

        const foundMaterials = cleanedMaterials.reduce((acc, material) => {
            const normalizedMaterial = material.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
            if (normalizedDescription.includes(normalizedMaterial)) {
                acc.push(material);
            }
            return acc;
        }, []);

        return foundMaterials;
    }

    async processItem({url}) {
        console.info(`Processing item at ${url}...`);
        try {
            await this.blockStaticResources();

            let reference = null;
            let attempt = 0;
            while (!reference && attempt <= 6) {
                await this.page.goto(url, {waitUntil: "domcontentloaded"});

                reference = await this.page
                    .waitForSelector("input#stock_id", {timeout: 61_000}) // limit 60 requests per minute. Wait 1 minute
                    .then((handle) => handle.evaluate(el => el.value))
                    .catch(() => {
                        console.info(`[OpulenceVintageScraping] waitForSelector timeout on attempt ${attempt} / 6`);
                        attempt += 1;
                        return null;
                    });
            }

            const title = await this.page.$eval("h1.artist-header__title", el => el.innerText);

            const description = await this.#getDescription();

            const brand = this.#findBrand(title, description);
            if (!brand) {
                console.info("[OpulenceVintageScraping] Brand not found in title or description. Skipping...");
                return;
            }

            const {type, subtype} = this.#findTypeAndSubtype(description);

            const {price, discounted_price} = await this.#getPrices();

            const grade = this.#findGrade(description);

            const image_urls = await this.#getImageUrls();

            const size = await this.#getSize(description);

            const colors = await this.#findColors(description);

            const materials = await this.#findMaterials(description);

            const data = {
                original_url: url + "?reference=" + reference,
                owner_id: OpulenceVintageScraping.VENDOR_USER_ID,
                is_exportable: 0,
                status: "ACTIVE",
                gender: null,
                type: type.toLocaleLowerCase(),
                subtype: subtype.toLocaleLowerCase(),
                original_name: title,
                description: null,
                vendor_bought_price: null,
                bought_price: price,
                bought_price_discounted: discounted_price,
                bought_currency: "EUR",
                grade,
                brand: brand.toLocaleUpperCase(),
                size,
                colors: colors,
                materials,
                has_serial: 0,
                has_guarantee_card: 0,
                has_box: 0,
                has_storage_bag: 0,
                image_urls
            };

            return data;
        } catch (error) {
            console.error("Scraping error:", error);

            this.emit("log", ["Error: " + error]);

            return null;
        }
    }

    static async create(name) {
        const instance = await super.create();

        instance.allColors = await ColorStorage.getAll();
        instance.allMaterials = await MaterialStorage.getAll();

        await instance.page.setUserAgent(BasePuppeteerScraping.USER_AGENT + ` KorvinScraper (${name})`);

        return instance;
    }
}

module.exports = OpulenceVintageScraping;
