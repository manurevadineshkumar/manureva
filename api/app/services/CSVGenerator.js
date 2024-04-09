const csv = require("fast-csv");

const FilesystemManager = require("./FilesystemManager");
const path = require("path");

class CSVGenerator {
    constructor(filepath, options = {}) {
        this.stream = csv.format(options);
        this.filepath = filepath;
    }

    async createWriteStream() {
        await FilesystemManager.mkdir(path.dirname(this.filepath));

        this.stream.pipe(FilesystemManager.createWriteStream(this.filepath));
    }

    async write(row) {
        return await new Promise((resolve) => {
            this.stream.write(row, "utf8", resolve);
        });
    }

    async finish() {
        await new Promise((resolve) => this.stream.end(resolve));
    }

    async getHeader(template_path) {
        if (!template_path) {
            throw new Error("Template path is not provided.");
        }

        return new Promise((resolve, reject) => {
            let header = null;

            csv.parseFile(template_path, {headers: false})
                .on("error", reject)
                .on("data", (data) => {
                    header = data;
                    this.write(data);
                })
                .on("end", () => {
                    resolve(header);
                });
        });
    }
}

module.exports = CSVGenerator;
