const express = require("express");
const path = require("path");
const app = express();

class Main {
    static async main() {
        app.use(express.static(path.join(__dirname, "/public"), {
            extensions: ["html", "htm"]
        }));

        app.listen(3245, () => {
            console.debug("Test server listening on port 3245");
        });
    }
}

if (require.main === module) {
    void Main.main();
}

module.exports = Main;
