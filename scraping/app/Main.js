if (process.env.NODE_ENV !== "production")
    require("dotenv").config({path: "../.env"});

const Server         = require("./Server");
const ScraperManager = require("./ScraperManager");
const LiveStorage    = require("./queue/LiveStorage");

class Main {
    static async main() {
        const scraper_manager = new ScraperManager();
        const server = new Server(scraper_manager);

        await LiveStorage.connect();
        await scraper_manager.init();
        server.listen(8282);
    }
}

void Main.main();
