const crypto = require("crypto");

class PasswordManager {
    static SALT_LENGTH = 8;

    static HASH_ALGORITHM = "sha256";

    static PASSWORD_LENGTH = 32;

    static getPasswordHash(password, salt = null) {
        if (!password)
            return null;

        if (salt === null)
            salt = crypto
                .randomBytes(Math.ceil(PasswordManager.SALT_LENGTH / 2))
                .toString("hex")
                .substring(0, PasswordManager.SALT_LENGTH);

        const hash = crypto
            .createHash(PasswordManager.HASH_ALGORITHM)
            .update(salt + password)
            .digest("hex")
            .slice(-32);

        return salt + hash;
    }

    static isPasswordEqual(password, password_hash) {
        if (!password || !password_hash)
            return false;

        const salt = password_hash.slice(0, PasswordManager.SALT_LENGTH);

        return PasswordManager.getPasswordHash(password, salt) == password_hash;
    }
}

module.exports = PasswordManager;
