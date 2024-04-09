const LiveStorage = require("./LiveStorage");
const crypto = require("crypto");

const DAY = 24 * 60 * 60 * 1e3;

class UserCreationToken {
    static PREFIX = "user-creation-token:";
    static TTL = DAY * 7;

    static async create() {
        const token = crypto.randomUUID();
        const key = UserCreationToken.PREFIX + token;

        const result = await LiveStorage.run(
            "SET", key, "TRUE",
            "PX", UserCreationToken.TTL
        );

        return result === "OK" ? token : null;
    }

    static async get(token) {
        const key = UserCreationToken.PREFIX + token;

        const data = await LiveStorage.run("KEYS", key);

        return data.length ? token : null;
    }

    static async list() {
        const keys = await LiveStorage.run(
            "KEYS", UserCreationToken.PREFIX + "*"
        );

        if (!keys)
            return [];

        return await Promise.all(keys.map(async key => {
            const expiration_time = await LiveStorage.run("EXPIRETIME", key);
            const token = key.slice(UserCreationToken.PREFIX.length);

            return { token, expiration_time };
        }));
    }

    static async delete(token) {
        const key = UserCreationToken.PREFIX + token;

        return await LiveStorage.run("DEL", key);
    }
}

module.exports = UserCreationToken;
