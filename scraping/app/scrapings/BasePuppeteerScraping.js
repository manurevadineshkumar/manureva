const BaseScraping = require("./BaseScraping");

const puppeteer = require("puppeteer");

class BasePuppeteerScraping extends BaseScraping {
    static browser = null;

    static USER_AGENT = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "AppleWebKit/537.36 (KHTML, like Gecko)",
        "Chrome/105.0.0.0 Safari/537.36"
    ].join(" ");

    static PARAMS = {};

    constructor(page) {
        super();

        this.page = page;
    }

    async dispose() {
        await this.page.close()
    }

    static async create() {
        if (!BasePuppeteerScraping.browser)
            BasePuppeteerScraping.browser = puppeteer.launch({
                executablePath: process.env.CHROME_BIN || null,
                headless: "new",
                args: process.env.IS_PRODUCTION
                    ? ["--no-sandbox"]
                    : []
            });

        if (BasePuppeteerScraping.browser instanceof Promise)
            BasePuppeteerScraping.browser = await BasePuppeteerScraping.browser;

        const page = await BasePuppeteerScraping.browser.newPage();

        await page.setUserAgent(this.USER_AGENT);

        return new this(page);
    }
}

module.exports = BasePuppeteerScraping;
