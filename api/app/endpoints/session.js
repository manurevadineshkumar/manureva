const User = require("../models/User");

const SessionManager = require("../services/SessionManager");

const HttpError = require("../errors/HttpError");

class Route {
    static async openSession({res, body: {username, password}}) {
        const user = await User.getByUsername(username);

        if (!user)
            throw new HttpError(404, "no such user");

        if (!user.isPasswordEqual(password))
            throw new HttpError(400, "invalid password");

        await SessionManager.setSession(res, {user_id: user.id});

        return {success: true};
    }

    static async revokeSession({req, res}) {
        await SessionManager.clearSession(req, res);

        return {success: true};
    }
}

module.exports = Route;
