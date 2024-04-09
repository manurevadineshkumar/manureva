import Api from "./Api.js";
import QueueManager from "./QueueManager.js";
import ScrapersManager from "./ScrapersManager.js";

class App {
    constructor() {
        this.$ = {
            status:          document.querySelector(".status"),
            sidebar:         document.querySelector(".sidebar"),
            sidebarArrow:    document.querySelector(".sidebar .arrow"),
            sidebarHeadings: document.querySelector(".sidebar .headings"),
            sidebarPages:    document.querySelector(".sidebar .pages"),
            logsPage:        document.querySelector(".pages .logs-page"),
            controlsPage:    document.querySelector(".pages .controls-page"),
        };
        this.queueManager = new QueueManager();
        this.scrapersManager = new ScrapersManager(this.queueManager);

        this.$.sidebarArrow.addEventListener("click", () => {
            this.$.sidebar.classList.toggle("expanded");
        });

        [...this.$.sidebarHeadings.children].forEach((heading, i) => {
            heading.addEventListener("click", () => {
                this.$.sidebarPages.style.marginLeft = -400 * i + "px";
            });
        });

        Api.init().then(data => this.init(data));
    }

    init(data) {
        this.$.status.classList.add("online");

        console.log("Socket connected:", data);

        this.processUpdate(data);

        Api.socket.on("update", data => {
            console.log("update:", data);
            this.processUpdate(data);
        });

        Api.socket.on("connect", () => {
            console.log("Connected");
            this.$.status.classList.add("online");
        });
        Api.socket.on("connect_error", () => {
            console.log("Disconnected");
            this.$.status.classList.remove("online");
        });
    }

    processUpdate(data) {
        if (data.scrapers)
            this.scrapersManager.updateScrapers(data.scrapers);

        if (data.scraper_id)
            this.scrapersManager.updateScraper(data.scraper_id, data.data);

        if (data.queue)
            this.queueManager.queue = data.queue;

        if (data.logs)
            this.log(data.logs);
    }

    log(logs) {
        this.$.logsPage.innerText += logs.join("\n") + "\n";
        this.$.logsPage.scrollTo(0, this.$.logsPage.scrollHeight);
    }
}

window.app = new App();
