const Country = require("../models/Country");

class Route {
    static async listCountries() {
        const countries = await Country.listAll();

        return {
            items: countries.map(country => country.serialize()),
            is_last_batch: 1
        };
    }
}

module.exports = Route;
