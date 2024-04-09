const fs     = require("fs");
const util   = require("util");
const stream = require("stream");
const path   = require("path");

const axios  = require("axios");

class FilesystemManager {
    static STATIC_PATH = process.env.STATIC_PATH
        || path.join(__dirname, "../static/");

    static STATIC_URL = "https://static.korvin.io/";

    static MIN_REQUEST_INTERVAL = 1000;

    static lastRequestTime = 0;

    static waitForNextRequest() {
        return new Promise(resolve => {
            setTimeout(
                resolve,
                FilesystemManager.lastRequestTime
                    + FilesystemManager.MIN_REQUEST_INTERVAL
                    - Date.now()
            );
        });
    }

    static async downloadFile(url, filepath) {
        FilesystemManager.lastRequestTime = Date.now();

        console.log("Writing file", url, "->", filepath);

        const writer = fs.createWriteStream(filepath);
        const {data} = await axios.get(url, {responseType: "stream"});

        data.pipe(writer);

        return await util.promisify(stream.finished)(writer);
    }

    static async getProductPath(product_id) {
        return path.join(
            FilesystemManager.STATIC_PATH,
            "products",
            ("" + product_id).padStart(8, "0")
        ) + "/";
    }

    static async mkdir(product_path) {
        return await fs.promises.mkdir(product_path, {recursive: true});
    }

    static async exists(filepath) {
        try {
            await fs.promises.access(filepath);
            return true;
        } catch (err) {
            return false;
        }
    }
}

module.exports = FilesystemManager;
