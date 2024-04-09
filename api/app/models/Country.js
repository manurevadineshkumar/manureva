const CountryStorage = require("../storage/CountryStorage");

class Country {
    constructor(data) {
        this.id = +data.id;
        this.name = data.name;
        this.code = data.code;
        this.shippingZone = data.shipping_zone;
        this.vat = data.vat;
        this.dutyTax = data.duty_tax;
        this.currencyCode = data.currency_code;
    }

    serialize() {
        return {
            id: +this.id,
            name: this.name,
            code: this.code,
        };
    }

    /**
     * Computes the shipping costs for a given order weight
     * @param weight_grams {Number} total order weight in grams
     * @return {Promise<Number>} the shipping cost, in cents
     */
    async getShippingCosts({weight_grams}) {
        if (!this.shippingZone)
            return Math.ceil(1500 * weight_grams / 1e3);

        return await CountryStorage.getWeightShippingPrice(
            this.shippingZone,
            weight_grams
        );
    }

    /** @deprecated use CountryService#listAll instead */
    static async listAll() {
        const data = await CountryStorage.listAll();

        return data.map(data => new Country(data));
    }

    /** @deprecated use CountryService#getById instead */
    static async getById(id) {
        const data = await CountryStorage.getById(id);

        return data ? new Country(data) : null;
    }
}

module.exports = Country;
