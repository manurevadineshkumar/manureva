const {EventEmitter} = require("events");

class BaseScraping extends EventEmitter {
    constructor() {
        super();
    }

    async listItems(_) {
        console.warn("Scraping's listItems() is not implemented");
    }

    async processItem(_) {
        console.warn("Scraping's processItem() is not implemented");
    }

    async dispose() {
        console.warn("Scraping's dispose() is not implemented");
    }
}

module.exports = BaseScraping;
