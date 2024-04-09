const Country = require("../../models/Country");
const UserStorage = require("../../storage/UserStorage");

class UserService {
    /**
     * Retrieves the country of a user based on the provided user id.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<Country|null>} The country object if found, otherwise null.
     */
    static async getCountryOfUserId(userId) {
        const data = await UserStorage.getCountryOfUserId(userId);

        return data ? new Country(data) : null;
    }
}

module.exports = UserService;
