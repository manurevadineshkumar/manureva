const crypto = require("crypto");

const SessionLiveStorage = require("../live-storage/SessionLiveStorage");

class SessionManager {
    static COOKIE_NAME = "Session-ID";

    static generateSessionId() {
        return crypto.randomUUID();
    }

    static use() {
        return async (req, res, next) => {
            const session_id = req.cookies[SessionManager.COOKIE_NAME];

            req.session = await SessionManager.getSession(session_id);

            next();
        };
    }

    static async getSession(session_id) {
        return await SessionLiveStorage.getSession(session_id);
    }

    static async setSession(res, data) {
        const session_id = SessionManager.generateSessionId();

        await SessionLiveStorage.setSession(session_id, data);

        res.cookie(
            SessionManager.COOKIE_NAME,
            session_id,
            {
                httpOnly: true,
                maxAge: SessionLiveStorage.TTL
            }
        );
    }

    static async clearSession(req, res) {
        const session_id = req.cookies[SessionManager.COOKIE_NAME];

        await SessionLiveStorage.clearSession(session_id);

        res.cookie(
            SessionManager.COOKIE_NAME,
            session_id,
            {maxAge: 0}
        );
    }
}

module.exports = SessionManager;
