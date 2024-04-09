const UserStorage = require("../storage/UserStorage");
const UserCertificateStorage = require("../storage/UserCertificateStorage");

const UserCreationToken = require("../live-storage/UserCreationToken");
const UserPermissions = require("./Permissions");

const PasswordManager = require("../services/PasswordManager");
const Utils = require("../services/Utils");
const HttpError = require("../errors/HttpError");
const SlackLogger = require("../services/SlackLogger");

const PERMISSIONS_TEMPLATES = require("../const/permissions.json").templates;

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.passwordHash = data.password_hash || null;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.email = data.email;
        this.phone = data.phone || null;
        this.addressStreet = data.address_street;
        this.addressCity = data.address_city;
        this.addressZip = data.address_zip;
        this.addressCountryId = data.address_country_id;
        this.companyName = data.company_name;
        this.companyVat = data.company_vat || null;
        this.url = data.url || null;
        this.instagram = data.instagram || null;
        this.tiktok = data.tiktok || null;
        this.facebook = data.facebook || null;
        this.linkedin = data.linkedin || null;
        this.permissions = new UserPermissions({ user_id: data.id });
        this.certificates = null;
        this.shopsCount = +data.shops_count || 0;
        this.tagsCount = +data.tags_count || 0;
        this.cartProductsGroupId = +data.cart_products_group_id || 0;
    }

    async serializeForUser(user) {
        return this.id == user.id || await user.hasPermission(
            UserPermissions.PERMISSIONS.ADMIN
        )
            ? await this.serialize()
            : this.serializeReduced();
    }

    async serialize() {
        return {
            id: this.id,
            username: this.username,
            first_name: this.firstName,
            last_name: this.lastName,
            email: this.email,
            phone: this.phone,
            address_street: this.addressStreet,
            address_city: this.addressCity,
            address_zip: this.addressZip,
            address_country_id: this.addressCountryId,
            company_name: this.companyName,
            company_vat: this.companyVat,
            url: this.url,
            instagram: this.instagram,
            tiktok: this.tiktok,
            facebook: this.facebook,
            linkedin: this.linkedin,
            permissions: await this.permissions.list(),
            certificates: await UserCertificateStorage.listAllById(this.id)
        };
    }

    serializeReduced() {
        return {
            username: this.username,
            company_name: this.companyName,
            instagram: this.instagram,
            tiktok: this.tiktok,
            facebook: this.facebook,
            linkedin: this.linkedin
        };
    }

    async loadCertificates() {
        this.certificates = await UserCertificateStorage.listAllById(this.id);
    }

    async update(data) {
        if (data.address) {
            data.address_street = data.address?.street;
            data.address_city = data.address?.city;
            data.address_zip = data.address?.zip;
            data.address_country_id = data.address?.country_id;

            delete data.address;
        }

        Object.keys(data).forEach(key =>
            data[key] === undefined && delete data[key]
        );

        await UserStorage.update(this.id, data);

        const new_user = new User(data);

        for (const prop of Object.keys(new_user)) {
            if ((new_user[prop] ?? null) !== null)
                this[prop] = new_user[prop];
        }
    }

    isPasswordEqual(password) {
        return PasswordManager.isPasswordEqual(password, this.passwordHash);
    }

    /**
     * Updates password in the user table details.
     * @param {*} data - Data containing updated password information.
     * @returns {Promise<data|null>} Returns user data if successful, otherwise null.
     */
    static async resetUserPassword(data) {
        await UserStorage.update(data.userData.id, data.userData);
        return data ? new User(data) : null;
    }

    static async create(data, token) {
        const password_hash = PasswordManager.getPasswordHash(data.password);
        delete data.password;

        data.address_street = data.address.street;
        data.address_city = data.address.city;
        data.address_zip = data.address.zip;
        data.address_country_id = data.address.country_id;
        delete data.address;

        const reason = { ...data.reason };
        delete data.reason;

        const id = await UserStorage.create({
            ...data,
            password_hash
        });

        await UserCreationToken.delete(token);

        const user = new User({
            ...data,
            id
        });

        await user.permissions.grant(UserPermissions.DEFAULT_PERMISSIONS_LIST);
        let permission_ids = UserPermissions.DEFAULT_PERMISSIONS_LIST;
        for (let [key, value] of Object.entries(reason)) {
            if (value) {
                permission_ids = [
                    ...permission_ids,
                    ...PERMISSIONS_TEMPLATES[key]
                ];
            }
        }

        await user.permissions.grant(Utils.uniqueArray(permission_ids));

        SlackLogger.sendMessage({
            channel_id: process.env.SLACK_USER_CREATION_CHANNEL_ID,
            text: `New user created: ${user.username}`
        });

        return user;
    }

    static async generateCreationToken() {
        return await UserCreationToken.create();
    }

    static async getUserCreationToken(token) {
        return await UserCreationToken.get(token);
    }

    static async listTokens() {
        return await UserCreationToken.list();
    }

    static async getById(id) {
        const data = await UserStorage.getById(id);

        return data ? new User(data) : null;
    }

    static async getByUsername(username) {
        const data = await UserStorage.getByUsername(username);

        return data ? new User(data) : null;
    }

    static async getByEmail(email) {
        const data = await UserStorage.getByEmail(email);

        return data ? new User(data) : null;
    }

    async hasPermission(permission_id) {
        return await this.permissions.has(permission_id);
    }

    async assertPermission(permission_id) {
        if (!await this.hasPermission(permission_id))
            throw new HttpError(403, "insufficient privileges");
    }

    static async listAll(prev_id = 0, batch_size = 16) {
        const user_data = await UserStorage.listAll(prev_id, batch_size);

        return user_data.map(data => new User(data));
    }

    static async listTagsByUserId(user_id) {
        return await UserStorage.listTagsByUserId(user_id);
    }
}

module.exports = User;
