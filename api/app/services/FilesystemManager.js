const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require("util");
const stream = require("stream");
const crypto = require("crypto");

const axios  = require("axios");

class FilesystemManager {
    static STATIC_PATH = process.env.STATIC_PATH
        || path.join(__dirname, "../../../static/");

    static STATIC_URL = "https://static.korvin.io/";

    static MIN_REQUEST_INTERVAL = 200;

    static nextRequestMinTime = 0;

    static waitForNextRequest() {
        const now = Date.now();

        return new Promise(resolve => {
            setTimeout(resolve, FilesystemManager.nextRequestMinTime - now);

            FilesystemManager.nextRequestMinTime = Math.max(
                now,
                FilesystemManager.nextRequestMinTime
                    + FilesystemManager.MIN_REQUEST_INTERVAL
            );
        });
    }

    static getRandomTmpFilename() {
        return path.join(os.tmpdir(), crypto.randomUUID());
    }

    static async downloadFile(url, filepath) {
        await FilesystemManager.waitForNextRequest();

        console.info("Downloading file", url, "->", filepath);

        const writer = fs.createWriteStream(filepath);
        const {data} = await axios.get(url, {responseType: "stream"});

        data.pipe(writer);

        return await util.promisify(stream.finished)(writer);
    }

    static async readFile(filepath, options = {}) {
        return fs.promises.readFile(filepath, options);
    }

    static async writeFile(filepath, data, options) {
        return fs.promises.writeFile(filepath, data, options);
    }

    static createReadStream(filepath) {
        return fs.createReadStream(filepath);
    }

    static createWriteStream(filepath) {
        return fs.createWriteStream(filepath);
    }

    static async rmdir(path) {
        return await fs.promises.rm(path, {force: true, recursive: true});
    }

    static async mkdir(path) {
        return await fs.promises.mkdir(path, {recursive: true});
    }

    static async exists(filepath) {
        try {
            await fs.promises.access(filepath, fs.constants.F_OK);
            return true;
        } catch (err) {
            return false;
        }
    }

    static async touch(filepath) {
        if (!await FilesystemManager.exists(filepath)) {
            await FilesystemManager.mkdir(path.dirname(filepath));
            await FilesystemManager.writeFile(filepath, "");
        }
    }

    static async unlink(filepath) {
        return await fs.promises.unlink(filepath);
    }
}

module.exports = FilesystemManager;
