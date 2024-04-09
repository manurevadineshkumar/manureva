
const ForgetPasswordToken = require("../../live-storage/ForgetPasswordToken");
const Mailer = require("../../services/Mailer");
const crypto = require("crypto");
const HttpError = require("../../errors/HttpError");
class UserPasswordService {
    /**
     * Creates a token for a user with an expiry timestamp using the user's userId.
     * @param {number} userId - The unique identifier of the user.
     * @returns {Promise<string>} A Promise that resolves to the generated token.
     */
    static async createToken(userId) {
        let currentTime = new Date();
        let expiryTime = new Date(currentTime.getTime() + (24 * 60 * 60 * 1000));
        let expiryTimestamp = Math.floor(expiryTime.getTime() / 1000);
        const token = userId + "_" + expiryTimestamp + "_" + crypto.randomBytes(20).toString("hex");
        return token;
    }

    /**
     * Creates a function to handle the forget password process and sends an email to the current user.
     * @param {object} user - The User object representing the user.
     * @param {string} token - The token used to create a new user token.
     */

    static async sendResetEmail(user, token) {
        const userName = user.username; // Assuming username is a property of the User object
        await UserPasswordService.createForgetToken(token);
        const BASE_URLS = process.env.NODE_ENV === "production"
            ? "https://backoffice.korvin.io"
            : "http://127.0.0.1:8383";
        const base_url = `${BASE_URLS}/password-rest/?token=${token}`;
        const variables = { username: userName, email: user.email, token, baseurl: base_url };
        Mailer.sendMail({
            template_id: "resetPassword",
            to: user.email, // Assuming user.email contains the email address of the user
            variables
        });
    }

    /**
     * Validates whether the provided reset token is still valid.
     * @param {string} token - The reset token to validate.
     * @returns {Promise<{ success: boolean }>} Returns an object indicating the validity of the token
     *  (true if valid, otherwise false).
     */
    static async validateResetToken(token) {
        try {
            const validity = await UserPasswordService.getByResetToken(token);
            let currentTimestamp = Math.floor(Date.now() / 1000);
            const userDetails = token.split("_");
            if (validity === 0) {
                return { success: false };
            }
            if (currentTimestamp > parseInt(userDetails[1])) {
                await UserPasswordService.deleteTokenUser(token);
                return { success: false };
            }
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    /**
     * Creates a token from Redis.
     * @param {string} resetToken - The token retrieved from Redis.
     */
    static async createForgetToken(resetToken) {
        await ForgetPasswordToken.createForgetPassword(resetToken);
    }

    /**
     * Retrieves the length of the current user's token.
     * @param {string} token - The current user's token.
     * @returns  The length of the token.
     */
    static async getByResetToken(token) {
        const validity = await ForgetPasswordToken.getForgetPassword(token);
        return validity;
    }

    /**
     * Deletes a token from Redis.
     * @param {string} token - The token to be deleted from Redis.
     * @returns {Promise<string>}
     */
    static async deleteTokenUser(token) {
        return await ForgetPasswordToken.deleteForgetPassword(token);
    }

    /**
     * Checks the length and format validity of a password.
     * @param {string} password - The password to be checked.
     */
    static checkPasswordComplexity(password) {
        if (password.toLocaleLowerCase() === password || password.toLocaleUpperCase() === password) {
            throw new HttpError(400, "password must contain uppercase and lowercase letters");
        }

        if (!password.match(/\d/)) {
            throw new HttpError(400, "password must contain at least one digit");
        }
    }

}

module.exports = UserPasswordService;
