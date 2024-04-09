const path = require("path");
const http = require("http");

const express = require("express");

const {Server: SocketServer} = require("socket.io");

class Server {
    constructor(scraperManager) {
        this.scraperManager = scraperManager;

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new SocketServer(this.server);

        this.app.use(express.static(path.join(__dirname, "../www/")));

        this.app.get("/", (req, res) => res.sendFile(
            path.join(__dirname, "../views/index.html")
        ));

        this.io.on("connection", socket => {
            console.log(">>", socket.handshake.address, "connected");

            void this.setSocketListeners(socket);
        });

        this.scraperManager.on("update", data => {
            this.io.emit("update", data);
        });
    }

    listen(port) {
        this.server.listen(port, () => {
            console.info("Korvin scraping server listening on port", port);
        });
    }

    async setSocketListeners(socket) {
        socket.on("pause-all-scrapers", () => {
            this.scraperManager.pauseAllScrapers();
        });
        socket.on("set-scraper-active", (scraper_id, active) => {
            this.scraperManager.setScraperActive(scraper_id, active);
        });
        socket.on("disconnect", () => {
            console.log("<<", socket.handshake.address, "disconnected");
        });

        socket.emit("init", await this.scraperManager.serialize());
    }
}

module.exports = Server;
