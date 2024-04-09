const axios = require("axios");

class CurrencyConverter {
    static cache = {};

    static BASE_URL = "https://open.er-api.com/v6/latest/";

    static async getCurrencyRates(name) {
        if (!name)
            return null;

        const cached = CurrencyConverter.cache[name];

        if (cached && cached.time_next_update_unix * 1e3 > Date.now())
            return cached.rates;

        const {data} = await axios.get(CurrencyConverter.BASE_URL + name);

        CurrencyConverter.cache[name] = data;

        return data.rates;
    }

    static async getCurrencyRateToEur(name) {
        const rates = await CurrencyConverter.getCurrencyRates(name);

        if (!rates) {
            throw new Error(`No rate found for ${name}`);
        }

        return rates.EUR;
    }
}

module.exports = CurrencyConverter;
