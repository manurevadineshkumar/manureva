const User = require("../models/User");
const UserCertificate = require("../models/UserCertificate");

const PasswordManager = require("../services/PasswordManager");

const { PERMISSIONS } = require("../models/Permissions");

const SessionManager = require("../services/SessionManager");
const UserPasswordService = require("../business-services/user/UserPassword.service");
const HttpError = require("../errors/HttpError");
const Country = require("../models/Country");
const StripeApi = require("../services/StripeApi");
const StripeCustomer = require("../models/StripeCustomer");

class Route {
    static async getCurrentUser({ user }) {
        return { user: await user.serializeForUser(user) };
    }

    static async getUserById({ user, path: { id } }) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        const retrieved_user = await User.getById(id);

        if (!retrieved_user)
            throw new HttpError(404, "no such user");

        return { user: await retrieved_user.serializeForUser(user) };
    }

    /**
     * Checks if the current user's email address is valid and sends an email.
     * @param {*} email - The email address of the current user.
     */
    static async forgetPassword({ query: { email } }) {
        const retrieved_email = await User.getByEmail(email);
        if (!retrieved_email)
            throw new HttpError(404, "no such email address");
        const userId = retrieved_email.id;
        const token = await UserPasswordService.createToken(userId);
        await UserPasswordService.sendResetEmail(retrieved_email, token);
        return { success: true };
    }

    /**
     * Checks the validity of a token.
     * @param {object} token - The token object to be checked.
     * @returns {Promise<{ success: boolean }>} - Indicates whether the token is valid
        ({ success: true }) or not ({ success: false }).
     */
    static async checkTokenValidity({ query: { token } }) {
        const checkValidity = await UserPasswordService.validateResetToken(token);
        return checkValidity;
    }

    /**
     * Resets the user's password.
     * @param {object} body - The object containing the current user's ID, password, and token.
     * @returns  - Returns true if the password reset is successful, otherwise false indicating failure.
     */
    static async resetPassword({ body: { currentUseID, password, token } }) {
        try {
            UserPasswordService.checkPasswordComplexity(password);
            const updateUser = await User.getById(currentUseID);
            if (!updateUser) {
                return { success: false };
            } else {
                const newPassword = PasswordManager.getPasswordHash(password);
                const userData = { id: updateUser.id, password_hash: newPassword };
                await User.resetUserPassword({ userData });
                await UserPasswordService.deleteTokenUser(token);
                return { success: true };
            }
        } catch (error) {
            throw new HttpError(404, error);
        }
    }

    /**
     * Changes the password on the profile page.
     * @param {object} body - The object containing the necessary information for changing the password.
     * @returns - Returns true if the token is valid, otherwise false indicating failure.
     */
    static async changePassword({ body: { currentUseID, password } }) {
        try {
            UserPasswordService.checkPasswordComplexity(password);
            const updateUser = await User.getById(currentUseID);
            if (!updateUser) {
                return { success: false };
            } else {
                const newPassword = PasswordManager.getPasswordHash(password);
                const userData = { id: updateUser.id, password_hash: newPassword };
                await User.resetUserPassword({ userData });
                return { success: true };
            }
        } catch (error) {
            throw new HttpError(404, error);
        }
    }

    static async createUser({ res, query: { token }, body: data }) {
        if (!await User.getUserCreationToken(token))
            throw new HttpError(403, "invalid token");

        if (await User.getByUsername(data.username))
            throw new HttpError(409, "duplicate username");

        if (await User.getByEmail(data.email))
            throw new HttpError(409, "duplicate email");

        if (!await Country.getById(data.address.country_id))
            throw new HttpError(404, "no such country");

        UserPasswordService.checkPasswordComplexity(data.password);

        const user = await User.create(data, token);
        const customer_id = await StripeApi.createCustomer(user);

        await StripeCustomer.create(user.id, customer_id);

        await SessionManager.setSession(res, { user_id: user.id });

        return { user: await user.serializeForUser(user) };
    }

    static async generateCreationToken({ user }) {
        await user.assertPermission(
            PERMISSIONS.ADMIN
        );

        return { token: await User.generateCreationToken() };
    }

    static async checkUserCreationToken({ user, path: { token } }) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        const real_token = await User.getUserCreationToken(token);

        if (!real_token)
            throw new HttpError(404, "no such token");

        return { success: true };
    }

    static async listTokens({ user }) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        return await User.listTokens();
    }

    static async updateUser(
        { user, body: { current_password, new_password, ...data } }
    ) {
        if (current_password && new_password) {
            if (!user.isPasswordEqual(current_password))
                throw new HttpError(400, "invalid password");

            UserPasswordService.checkPasswordComplexity(new_password);
        }

        if (
            data.username && data.username != user.username
            && await User.getByUsername(data.username)
        )
            throw new HttpError(
                409,
                `username ${data.username} is already taken`
            );

        if (data.email && await User.getByEmail(data.email))
            throw new HttpError(409, "duplicate email");

        if (
            data.address?.country_id
            && !await Country.getById(data.address.country_id)
        )
            throw new HttpError(404, "no such country");

        await user.update({
            ...(new_password
                ? { password_hash: PasswordManager.getPasswordHash(new_password) }
                : {}
            ),
            ...data
        });

        return { success: true };
    }

    static async updateUserById({ user, path: { id }, body: data }) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        const target_user = await User.getById(id);

        if (!target_user)
            throw new HttpError(404, "no such user");

        if (data.email && await User.getByEmail(data.email))
            throw new HttpError(409, "duplicate email");

        await Route.updateUser({
            user: target_user,
            body: data
        });

        return { success: true };
    }

    static async addCertificate({ user, files: { certificates } }) {
        await user.assertPermission(PERMISSIONS.USER_UPDATE);

        if (certificates.length > 5)
            throw new HttpError(400, "too many certificates, max 5");

        await user.loadCertificates();

        const available_space = 5 - user.certificates.length;

        if (certificates.length > available_space)
            throw new HttpError(
                400,
                available_space
                    ? `only ${available_space} certificates can be added`
                    : "no space for certificates, max 5"
            );

        user.certificates.push(...await Promise.all(certificates.map(data =>
            UserCertificate.create(user.id, data)
        )));

        return { success: true };
    }

    static async deleteCertificate({ body: { certificate_ids } }) {
        if (certificate_ids === undefined)
            throw new HttpError(400, "certificate_ids is required");

        const certs = await UserCertificate.getByIds(certificate_ids);

        await Promise.all(certs.map(cert => cert.delete()));

        return { success: true };
    }

    static async grantPermissions({
        user,
        path: { id: user_id },
        body: { permissions }
    }) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        const target_user = await User.getById(user_id);

        if (!target_user)
            throw new HttpError(404, "no such user");

        if (!await target_user.permissions.grant(permissions))
            throw new HttpError(400, "invalid permission");

        return { success: true };
    }

    static async revokePermissions({
        user,
        path: { id: user_id },
        body: { permissions }
    }) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        const target_user = await User.getById(user_id);

        if (!target_user)
            throw new HttpError(404, "no such user");

        await target_user.permissions.revoke(permissions);

        return { success: true };
    }

    static async setPermissions({
        user,
        path: { id: user_id },
        body: { permissions }
    }) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        const target_user = await User.getById(user_id);

        if (!target_user)
            throw new HttpError(404, "no such user");

        await target_user.permissions.set(permissions);

        return { success: true };
    }

    static async listUsers({ user, query: { prev_id, batch_size } }) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        const users = await User.listAll(prev_id, batch_size + 1);

        return {
            items: await Promise.all(users
                .slice(0, batch_size)
                .map(async usr => await usr.serializeForUser(user))
            ),
            ...(users.length < batch_size + 1 ? { is_last_batch: 1 } : {})
        };
    }

    static async getCertificateFileById({ res, user, path: { id } }) {
        await user.assertPermission(PERMISSIONS.USER_READ);

        const cert = await UserCertificate.getByIds([id]);

        if (!cert.length)
            throw new HttpError(404, "no such certificate");

        const filepath = await cert[0].filepath;

        res.setHeader("Content-Type", "application/pdf");
        await new Promise(resolve => res.sendFile(filepath, resolve));
    }

    static async listTagsByUserId({ path: { user_id } }) {
        return await User.listTagsByUserId(user_id);
    }
}

module.exports = Route;
