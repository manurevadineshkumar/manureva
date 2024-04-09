const Country = require("../../models/Country");
const CountryStorage = require("../../storage/CountryStorage");

class CountryService {
    /**
     * Retrieves the list of all countries.
     * @returns {Promise<Array<Country>>} A promise that resolves to an array of Country objects.
     */
    static async listAll() {
        const data = await CountryStorage.listAll();

        return data.map(data => new Country(data));
    }

    /**
     * Retrieves a country by its ID.
     * @param {string} id - The ID of the country to retrieve.
     * @returns {Promise<Country|null>} A Promise that resolves with the retrieved country object, or null if not found.
     */
    static async getById(id) {
        const data = await CountryStorage.getById(id);

        return data ? new Country(data) : null;
    }
}

module.exports = CountryService;
