export default class Api {
    static socket = null;

    static init() {
        Api.socket = io();

        return new Promise(resolve => {
            Api.socket.once("init", data => {
                resolve(data);
            });
        });
    }

    static pauseAllScrapers() {
        Api.socket.emit("pause-all-scrapers");
    }

    static setScraperActive(id, active) {
        Api.socket.emit("set-scraper-active", id, active);
    }

    static disconnect() {
        Api.socket.disconnect();
    }
}
