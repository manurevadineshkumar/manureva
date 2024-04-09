import Api from "./Api.js";
import Scraper from "./Scraper.js";

export default class ScrapersManager {
    static MAX_TIMING_BUFFER_SIZE = 8;

    constructor(queue_manager) {
        this.queueManager = queue_manager;
        this.scrapers = {};
        this.data = {};
        this.timeBuffer = [];

        this.$ = {
            container:       document.querySelector(".scrapers"),
            totalScrapers:   document.querySelector(".total-scrapers"),
            activeScrapers:  document.querySelector(".active-scrapers"),
            avgTime:         document.querySelector(".avg-time"),
            eta:             document.querySelector(".eta"),
            scraperTemplate: document.querySelector(".scraper-template"),
            pauseButton:     document.querySelector(".pause-button"),
        };

        this.totalScrapers = 0;

        this.$.pauseButton.addEventListener(
            "click", () => Api.pauseAllScrapers()
        );

        this.render();
    }

    get totalScrapers() {
        return this.data.totalScrapers;
    }

    set totalScrapers(val) {
        this.data.totalScrapers = val;
        this.$.totalScrapers.innerText = val;

        this.updateEtaTime();
    }

    get activeScrapers() {
        return this.data.activeScrapers;
    }

    updateActiveScrapers() {
        this.data.activeScrapers = Object.values(this.scrapers)
            .reduce((acc, s) => acc + s.active, 0);

        this.$.activeScrapers.innerText = this.data.activeScrapers;
    }

    get avgTime() {
        return this.data.avgTime || null;
    }

    set avgTime(val) {
        this.data.avgTime = val;
        this.$.avgTime.innerText = val === null
            ? "-"
            : val.toFixed(1) + "s";

        this.updateEtaTime();
    }

    get etaTime() {
        return this.data.etaTime || null;
    }

    set etaTime(val) {
        this.data.etaTime = isNaN(val) || !this.queueManager.size ? null : val;
    }

    get eta() {
        return this.data.eta || null;
    }

    set eta(val) {
        if (this.etaTime === null) {
            this.data.eta = null;
            this.$.eta.innerText = "-";
            return;
        }

        this.data.eta = val;

        const date = new Date(0);

        date.setSeconds(Math.max(0, val));

        this.$.eta.innerText = date.toISOString().substring(11, 19);
    }

    updateEtaTime() {
        this.etaTime = Date.now() / 1e3 + this.queueManager.size
            / this.activeScrapers
            * this.avgTime;
    }

    pushTime(time) {
        if (this.timeBuffer.length == ScrapersManager.MAX_TIMING_BUFFER_SIZE)
            this.timeBuffer.shift();

        this.timeBuffer.push(time);

        this.avgTime = this.timeBuffer
            .reduce((a, b) => a + b)
            / this.timeBuffer.length;
    }

    addScraper(data) {
        const scraper = new Scraper(this.$.scraperTemplate, data, this);

        this.scrapers[data.id] = scraper;

        this.$.container.append(scraper.$root);

        this.totalScrapers++;

        if (data.active)
            this.updateActiveScrapers();

        return scraper;
    }

    updateScraper(id, data) {
        if (data.deleted) {
            this.totalScrapers--;
            return delete this.scrapers[id];
        }

        const scraper = this.scrapers[id];

        if (!scraper)
            return this.addScraper(data);

        scraper.update(data);

        if (data.url !== undefined) {
            if (scraper.data.url)
                this.pushTime(scraper.rotateTiming());
            else
                scraper.rotateTiming();
        }

        if (data.active !== undefined)
            this.updateActiveScrapers();
    }

    updateScrapers(scrapers) {
        scrapers.forEach(data => this.updateScraper(data.id, data));
    }

    render() {
        window.requestAnimationFrame(() => this.render());

        Object.values(this.scrapers).forEach(scraper => scraper.updateTiming());
        this.eta = this.etaTime - Date.now() / 1e3;
    }
}
