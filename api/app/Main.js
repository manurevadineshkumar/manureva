if (process.env.NODE_ENV !== "production")
    require("dotenv").config({path: "../.env"});

const Server = require("./Server");

class Main {
    static async main() {
        const server = new Server();

        await server.setup(require("./openapi.json"));
        await server.listen(8080);
    }
}

void Main.main();
