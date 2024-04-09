const Marketplace = require("../Marketplace");
const VestiaireProductsManager = require("./VestiaireProductsManager");

class VestiaireMarketplace extends Marketplace {
    static ProductsManager = VestiaireProductsManager;

    constructor(data) {
        super(data);
    }
}

module.exports = VestiaireMarketplace;
