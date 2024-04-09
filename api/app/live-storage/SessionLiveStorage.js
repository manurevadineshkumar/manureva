const LiveStorage = require("./LiveStorage");

const DAY = 24 * 60 * 60 * 1e3;

class SessionLiveStorage {
    static SESSION_PREFIX = "session:";

    static TTL = DAY * 7;

    static async getSession(session_id) {
        if (!session_id)
            return null;

        const key = SessionLiveStorage.SESSION_PREFIX + session_id;
        const data = await LiveStorage.run("GET", key);

        if (!data)
            return null;

        await LiveStorage.run("PEXPIRE", key, SessionLiveStorage.TTL);

        return JSON.parse(data);
    }

    static async setSession(session_id, data) {
        const key = SessionLiveStorage.SESSION_PREFIX + session_id;

        return await LiveStorage.run(
            "SET", key, JSON.stringify(data),
            "PX", SessionLiveStorage.TTL
        );
    }

    static async clearSession(session_id) {
        const key = SessionLiveStorage.SESSION_PREFIX + session_id;

        return await LiveStorage.run("DEL", key);
    }
}

module.exports = SessionLiveStorage;
