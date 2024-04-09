const StripeApi = require("../services/StripeApi");

class StripeRoutes {
    static async listPaymentMethods({user}) {
        return await StripeApi.listCustomerPaymentMethods(user);
    }

    static async addPaymentMethod({user}) {
        return await StripeApi.addCustomerPaymentMethod(user);
    }

    static async deletePaymentMethod({path}) {
        return await StripeApi.deleteCustomerPaymentMethod(path.pm_id);
    }
}

module.exports = StripeRoutes;
