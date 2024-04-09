const LiveStorage = require("./LiveStorage");

const DAY = 24 * 60 * 60 * 1e3;

class ForgetPasswordToken {
    static RESETTOKEN = "forgetpassword:";
    static expired = DAY * 1;

    /**
     * Creates a token for a user's "forget password" request.
     * @param {string} resetToken - The reset token generated for the user.
     * @returns {Promise<string|null>} Returns an "OK" text string if successful, otherwise null.
     */
    static async createForgetPassword(resetToken) {
        const key = ForgetPasswordToken.RESETTOKEN + resetToken;
        const result = await LiveStorage.run(
            "SET", key, "TRUE",
            "PX", ForgetPasswordToken.expired
        );
        return result === "OK" ? resetToken : null;
    }

    /**
     * Retrieves the current user's token.
     * @param {string} token - The current user's token.
     * @returns {Promise<number|null>} Returns the length of the token if valid, otherwise null.
     */
    static async getForgetPassword(token) {
        const key = ForgetPasswordToken.RESETTOKEN + token;
        const validity = await LiveStorage.run("KEYS", key);
        return validity ? validity.length : null;
    }

    /**
     * Deletes the token of the current user after a successful password change.
     * @param {string} token - The token to be expired and deleted.
     * @returns  - Indicates the action taken, such as "delete storage reduis".
     */
    static async deleteForgetPassword(token) {
        const key = ForgetPasswordToken.RESETTOKEN + token;
        return await LiveStorage.run("DEL", key);
    }
}

module.exports = ForgetPasswordToken;
