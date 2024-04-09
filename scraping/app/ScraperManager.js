const {EventEmitter} = require("events");

const QueueManager = require("./queue/QueueManager");
const LiveStorage  = require("./queue/LiveStorage");

const Scraper = require("./Scraper");

const config = require("../config.json");

class ScraperManager extends EventEmitter {
    static INTERVAL = 60e3;

    static SCRAPINGS = {
        "RECLOJP": require("./scrapings/RecloJpScraping.js"),
        "OPULENCE_VINTAGE": require("./scrapings/OpulenceVintageScraping.js"),
    };

    get nextAvailableId() {
        return this.nextId++;
    }

    constructor() {
        super();

        this.nextId       = 1;
        this.scrapers     = {};
        this.idleScrapers = {};
        this.queueManager = new QueueManager();

        this.queueManager.on("begin", () => this.updateIdleScrapers());
    }

    async serialize() {
        return {
            scrapers: Object.values(this.scrapers).map(s => s.serialize()),
            queue: await this.serializeQueue()
        };
    }

    async serializeQueue() {
        const size = await this.queueManager.getSize();
        const head = await this.queueManager.getHead();

        return {
            size,
            head: head.map(job => job.serialize())
        };
    }

    async init() {
        await LiveStorage.connect();
        await this.queueManager.init();

        const restored = await this.queueManager.restoreJobs();

        if (restored)
            console.info("Restored", restored, "job(s)");

        Object.entries(config.scrapers).forEach(
            ([name, params]) => this.addScraper(name, params)
        );

        setTimeout(() => {
            setInterval(
                () => this.updateIdleScrapers(),
                ScraperManager.INTERVAL
            );
        }, ScraperManager.INTERVAL - Date.now() % ScraperManager.INTERVAL);

        this.updateIdleScrapers();
    }

    addScraper(name, params) {
        const id = this.nextAvailableId;
        const scraper = new Scraper(id, name);

        this.scrapers[id] = scraper;
        this.idleScrapers[scraper.id] = scraper;

        if (params.is_active)
            this.setScraperActive(id, true);

        void this.runNextJob(scraper);

        scraper.on(
            "update",
            data => this.emit("update", {scraper_id: id, data})
        );
        scraper.on(
            "log",
            data => this.emit("update", {logs: [`${scraper.name}: ${data}`]})
        );

        return scraper;
    }

    pauseAllScrapers() {
        Object.keys(this.scrapers).forEach(
            id => this.setScraperActive(id, false)
        );
    }

    setScraperActive(scraper_id, active) {
        const scraper = this.scrapers[scraper_id];

        if (!scraper)
            return;

        scraper.update({active});

        this.updateIdleScrapers();
    }

    async broadcastQueue() {
        this.emit("update", {queue: await this.serializeQueue()});
    }

    async runNextJob(scraper) {
        if (!scraper.active) {
            this.idleScrapers[scraper.id] = scraper;
            return scraper.update({state: "idle", url: null});
        }

        const job = await this.queueManager.popJob();

        if (!job) {
            this.idleScrapers[scraper.id] = scraper;
            return scraper.update({state: "idle", url: null});
        }

        void this.broadcastQueue();

        delete this.idleScrapers[scraper.id];

        const scraping = await ScraperManager.SCRAPINGS[job.vendor].create(
            scraper.name
        );
        let jobs;

        try {
            jobs = await scraper.scrape(scraping, job);
        } catch (err) {
            console.error("Scraping error; restoring job:", err);

            await this.queueManager.restoreJob(job);

            return this.runNextJob(scraper);
        } finally {
            await scraping.dispose();
        }

        await Promise.all(jobs.map(async job => {
            await this.queueManager.pushJob(job);
        }));
        await this.queueManager.finishJob(job);

        if (jobs.length) {
            void this.broadcastQueue();
            void this.updateIdleScrapers();
        }

        return this.runNextJob(scraper);
    }

    updateIdleScrapers() {
        Object.values(this.idleScrapers).forEach(
            scraper => this.runNextJob(scraper)
        );
    }
}

module.exports = ScraperManager;
