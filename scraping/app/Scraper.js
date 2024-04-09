const {EventEmitter} = require("events");

const Product = require("./Product");
const Job     = require("./Job");

const HOUR = 60 * 60 * 1e3;

class Scraper extends EventEmitter {
    static SCRAPING_INTERVAL = HOUR;

    static STATIC_STATUSES = new Set(["LOCKED", "PENDING"]);

    constructor(id, name) {
        super();

        this.id = id;
        this.name = name;
        this.url = null;
        this.progress = null;
        this.state = "idle";
        this.active = false;
    }

    serialize() {
        return {
            id:       this.id,
            name:     this.name,
            url:      this.url,
            state:    this.state,
            progress: this.progress,
            active:   this.active
        };
    }

    log(...values) {
        this.emit("log", values.join(" "));
    }

    update(data) {
        Object.entries(data).forEach(([key, value]) => {
            if (this[key] === value)
                delete data[key];
            else
                this[key] = value;
        });

        this.emit("update", data);
    }

    /**
     * Scrapes data based on the provided scraping and job parameters.
     * Returns an array of Job instances created based on the scraping result.
     * If the job type is 0, the method will list items.
     * If the job type is 1, the method will process an item.
     * @param {Object} scraping - The scraping object used for scraping.
     * @param {Object} job - The job object containing the scraping job details.
     * @returns {Array} - An array of Job instances created based on the scraping result.
     */
    async scrape(scraping, job) {
        scraping.on("update", data => this.update(data));
        scraping.on("log", data => this.log(...data));

        this.update({url: job.url || null, state: "loading"});

        this.log("Scraping url:", job.url);

        if (job.type === 0)
            return await scraping.listItems(job.params);

        if (job.type === 1) {
            let product = await Product.getByOriginalUrl(job.url);

            if (product && +product.lastScrape + Scraper.SCRAPING_INTERVAL > Date.now()) {
                this.log(`Product #${product.id} skipped because recently scraped`);
                return [Job.create({
                    vendor: scraping.name,
                    type: 2,
                    params: {id: product.id}
                })];
            }

            const data = await scraping.processItem(job);

            if (!data) {
                if (product) {
                    this.log(`Product #${product.id} is no longer available.`);
                    await product.update({status: "DISABLED"});
                }

                return [];
            }

            if (product) {
                const is_status_static = Scraper.STATIC_STATUSES.has(product.status);
                const status = is_status_static ? product.status : data.status;

                if (is_status_static) {
                    this.log(`Product #${product.id} is ${product.status}, status not updated.`);
                }

                await product.update({...data, last_scrape: new Date, status});
            } else {
                product = await Product.create(data);
            }

            this.log(product ? "Updated" : "Created", "product", "#" + product.id);

            if (product.status !== "ACTIVE") {
                return [];
            }

            return [Job.create({
                vendor: scraping.name,
                type: 2,
                params: {id: product.id}
            })];
        }

        return [];
    }
}

module.exports = Scraper;
