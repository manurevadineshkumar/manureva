const ShopDiscountRangesService = require("../business-services/shop/ShopDiscountRanges.service");
const UserService = require("../business-services/user/User.service");

// eslint-disable-next-line no-unused-vars
const Product = require("../models/Product");
// eslint-disable-next-line no-unused-vars
const Shop = require("../models/shops/Shop");

class PriceManagerHelper {

    /**
     * @deprecated use PriceManager.computePrices instead
     * Gets the discount value for the provided vendor.
     *
     * @param {string} vendor - The vendor.
     * @param {Object.<string, number>} discount - The discount.
     * @returns {number} The discount value.
     * @throws {Error} Will throw an error if no discount is found for the vendor.
     */
    static getVendorDiscountPercent(vendor, discount) {
        const discountPercent = discount[vendor];

        // Can be 0
        if (discountPercent === null || discountPercent === undefined) {
            throw new Error(`[PriceManagerHelper] No discount found for ${vendor}`);
        }

        return discountPercent;
    }

    /**
     * @deprecated use PriceManager.computePrices instead
     * Gets the VAT value for the provided country code.
     *
     * @param {string} countryCode - The country code.
     * @param {object} vat - The VAT.
     * @returns {number} The VAT value.
     * @throws {Error} Will throw an error if no VAT is found for the country code.
     */
    static getVatPercent(countryCode, vat) {
        const vatPercent = vat[countryCode];

        // Can be 0
        if (vatPercent === null || vatPercent === undefined) {
            throw new Error(`[PriceManagerHelper] No VAT found for ${countryCode}`);
        }

        return vatPercent;
    }

    /**
     * @deprecated use PriceManager.computePrices instead
     * Computes the bought prices with supplier discount.
     *
     * @param {Object} params - The parameters for computing the prices.
     * @param {number} params.boughtPrice - The original bought price.
     * @param {number} params.boughtPriceDiscounted - The discounted bought price.
     * @param {string} params.vendor - The vendor of the product.
     * @param {Object.<string, number>} params.vendorDiscount - The discount percentage of .
     * @param {Shop} params.shop - The shop where the purchase was made.
     * @param {Date}   params.createdOnShopAt - The date of purchase.
     * @returns {Promise<{
     *   boughtPriceWithSupplierDiscount: number,
     *   discountedBoughtPriceWithSupplierDiscount: number,
     * }>} - The computed bought prices with supplier discount.
     */
    static async computeBoughtPricesWithSupplierDiscount({
        boughtPrice,
        boughtPriceDiscounted,
        vendor,
        vendorDiscount,
        shop,
        createdOnShopAt,
    }) {
        let discountPercent;
        if (shop) {
            discountPercent = await ShopDiscountRangesService.getDiscountValue({
                shopId: shop.id,
                day: (Date.now() - createdOnShopAt.getTime()) / (1000 * 60 * 60 * 24),
                price: boughtPrice,
            });
            discountPercent /= 100;
        } else {
            discountPercent = PriceManagerHelper.getVendorDiscountPercent(vendor, vendorDiscount);
        }

        const boughtPriceWithSupplierDiscount = boughtPrice * (1 - discountPercent);
        const discountedBoughtPriceWithSupplierDiscount = boughtPriceDiscounted
            ? boughtPriceDiscounted * (1 - discountPercent)
            : null;

        return {
            boughtPriceWithSupplierDiscount,
            discountedBoughtPriceWithSupplierDiscount,
        };
    }

    /**
     * @deprecated use PriceManager.computePrices instead
     * Computes the purchase price based on the boughtPrice, currency rate and vat.
     *
     * @param {number} boughtPriceWithSupplierDiscount - The bought price with the supplier's discount.
     * @param {Object} params - The parameters for computing the purchase price.
     * @param {number} params.rate - The rate to convert the price to EUR.
     * @param {number} params.vat - The VAT to apply to the price.
     * @throws {Error} Will throw an error if no VAT is provided.
     * @returns {number} The purchase price.
     */
    static computePurchasePrice(boughtPriceWithSupplierDiscount, {rate, vat}) {
        // Can be 0
        if (vat === null || vat === undefined) {
            throw new Error(`[PriceManagerHelper] No VAT provided`);
        }

        const priceExcludingVat = boughtPriceWithSupplierDiscount / (1 + vat);
        const price = priceExcludingVat * rate;

        return price;
    }

    /**
     * @deprecated use PriceManager.computePrices instead
     * Computes the retail price based on the provided parameters.
     * (1.5*PP + 0.042*PP + 31.26)*1.22
     * @param {number} purchasePrice - The purchase price.
     * @param {Object} computePriceInformation - The parameters for computing the retail price.
        * @param {number} computePriceInformation.dutyTaxes - The duty taxes to apply to the price.
        * @param {number} computePriceInformation.deliveryFees - The delivery fees to apply to the price.
        * @param {number} computePriceInformation.averageVat - The average VAT to apply to the price.
        * @param {number} computePriceInformation.frenchVat - The average VAT to apply to the price.
     * @throws {Error} Will throw an error if no handler is found for the purchase price.
     * @returns {number} The retail price.
     */
    static computeRetailPrice(purchasePrice, computePriceInformation) {

        if (!purchasePrice) {
            throw new Error(`[PriceManagerHelper] No purchase price provided`);
        }

        if (
            !computePriceInformation
            || computePriceInformation.dutyTaxes === undefined
            || !computePriceInformation.frenchVat
            || !computePriceInformation.deliveryFees
            || !computePriceInformation.averageVat
        ) {
            throw new Error(`[PriceManagerHelper] No computePriceInformation provided`);
        }

        let marginFactor;
        let retailPrice;
        if (purchasePrice < 250) {
            marginFactor = 1.5;
            return retailPrice = (marginFactor * purchasePrice
                + computePriceInformation.dutyTaxes * computePriceInformation.frenchVat * purchasePrice
                + computePriceInformation.deliveryFees
                * (1 + computePriceInformation.dutyTaxes * computePriceInformation.frenchVat))
                * computePriceInformation.averageVat;
        }

        marginFactor = purchasePrice < 1000 ? 1.5 : 1.4;
        retailPrice = (marginFactor * purchasePrice
                            + computePriceInformation.dutyTaxes * computePriceInformation.frenchVat * purchasePrice
                            + computePriceInformation.deliveryFees
                            * (1 + computePriceInformation.dutyTaxes * computePriceInformation.frenchVat))
                            * computePriceInformation.averageVat + 15;

        return retailPrice;
    }

    /**
     * @deprecated use PriceManager.computePrices instead
     * Computes the wholesale price based on the provided parameters.
     * (1.21*PP + 0.042*PP + 31.26)
     * @param {number} purchasePrice - The purchase price.
     * @param {Object} computePriceInformation - The parameters for computing the wholesale price.
        * @param {number} computePriceInformation.dutyTaxes - The duty taxes to apply to the price.
        * @param {number} computePriceInformation.deliveryFees - The delivery fees to apply to the price.
        * @param {number} computePriceInformation.averageVat - The average VAT to apply to the price.
        * @param {number} computePriceInformation.frenchVat - The average VAT to apply to the price.
     * @returns {number} The wholesale price.
     */
    static computeWholesalePrice(purchasePrice, computePriceInformation) {
        if (!purchasePrice) {
            throw new Error(`[PriceManagerHelper] No purchase price provided`);
        }

        if (
            !computePriceInformation
            || computePriceInformation.dutyTaxes === undefined
            || !computePriceInformation.frenchVat
            || !computePriceInformation.deliveryFees
            || !computePriceInformation.averageVat
        ) {
            throw new Error(`[PriceManagerHelper] No computePriceInformation provided`);
        }

        let marginFactor;

        if (purchasePrice < 1000) {
            marginFactor = 1.21;
        } else if (purchasePrice < 1500) {
            marginFactor = 1.17;
        } else if (purchasePrice < 2500) {
            marginFactor = 1.15;
        } else {
            marginFactor = 1.13;
        }

        const wholesalePrice = (marginFactor * purchasePrice
                                + computePriceInformation.dutyTaxes * computePriceInformation.frenchVat * purchasePrice
                                + computePriceInformation.deliveryFees
                                * (1 + computePriceInformation.dutyTaxes * computePriceInformation.frenchVat));

        return wholesalePrice;
    }

    // NEW SYSTEM

    /**
     * Returns the margin coefficient based on the given price and margin ranges.
     * @param {number} price - The price to calculate the margin coefficient for.
     * @param {Array<[number|null, number]>} marginRanges
     * - An array of pairs representing the margin ranges and their corresponding coefficients.
     * @returns {number|null} The margin coefficient for the given price, or undefined if no matching range is found.
     */
    static getMarginCoef(price, marginRanges) {
        for (const [range, coef] of marginRanges) {
            if (range === null || price < range) {
                return coef;
            }
        }
        return null;
    }

    /**
     * Computes the purchase price based on the given parameters.
     * @param {Object} options - The options for computing the purchase price.
     * @param {number} options.price - The original price.
     * @param {number} options.discountCoef - The discount coefficient.
     * @param {number} options.originCountryVat - The VAT of the origin country.
     * @param {number} options.originCurrencyToEURCoef - The conversion coefficient from origin currency to EUR.
     * @param {number} options.securityRate - The security rate.
     * @returns {number|null} The computed purchase price, or null if the price is not provided.
     */
    static computePurchasePrice2({price, discountCoef, originCountryVat, originCurrencyToEURCoef, securityRate}) {
        if (!price) {
            return null;
        }

        const TTCToHTCoef = 1 / (1 + originCountryVat);

        const negociatedPrice = price * discountCoef;

        return negociatedPrice * TTCToHTCoef * originCurrencyToEURCoef * securityRate;
    }

    /**
     * Computes the total cost by adding up various fees and taxes to the purchase price.
     * It computes the total cost for a single product.
     * This value is used to compute an accurate selling price for a product.
     * @param {Object} params - The parameters required for cost computation.
     * @param {number} params.purchasePrice - The purchase price of the item.
     * @param {number} params.deliveryToKorvinFees - The fees for delivering the item to Korvin.
     * @param {number} params.dutyTax - The tax rate for duty fees.
     * @param {number} params.entrupyFees - The fees charged by Entrupy.
     * @param {number} params.operatingFees - The operating fees.
     * @param {number} params.transactionTax - The tax rate for transaction fees.
     * @param {number} params.marginCoef - The margin coefficient.
     * @returns {number|null} - The computed total cost, or null if purchase price is not provided.
     */
    static computeTotalCost({
        purchasePrice,
        deliveryToKorvinFees,
        dutyTax,
        entrupyFees,
        operatingFees,
        transactionTax,
        marginCoef
    }) {
        if (!purchasePrice) {
            return null;
        }

        const dutyFees = (purchasePrice + deliveryToKorvinFees) * dutyTax;

        const totalCost = purchasePrice
            + deliveryToKorvinFees
            + dutyFees
            + entrupyFees
            + operatingFees;

        const transactionFees = (totalCost * transactionTax * marginCoef)
            / (1 - transactionTax * marginCoef);

        return totalCost + transactionFees;
    }

    /**
     * Constructs the parameters for a shop based on the product, shop, and createdOnShopAt values.
     * @param {Product} product - The product object.
     * @param {Shop} shop - The shop object.
     * @param {Date} createdOnShopAt - The date when the product was created on the shop.
     * @returns {Promise<Object>} - The constructed parameters for the shop.
     */
    static async constructParamsFromShop(product, shop, createdOnShopAt) {
        const discountPercent = await ShopDiscountRangesService.getDiscountValue({
            shopId: shop.id,
            day: (Date.now() - createdOnShopAt.getTime()) / (1000 * 60 * 60 * 24),
            price: product.boughtPrice,
        }) / 100;

        const originCountry = await UserService.getCountryOfUserId(product.ownerId);

        if (originCountry === null) {
            throw new Error(`[constructParamsFromShop] No country found for user ${product.ownerId}`);
        }

        if (!originCountry.vat || !originCountry.dutyTax) {
            throw new Error(`[constructParamsFromShop] No VAT or duty tax found for country ${originCountry.name}`);
        }

        const EUCountryCodes = [
            "BE","BG","CZ","DK","DE","EE","IE",
            "EL","ES","FR","HR","IT","CY","LV",
            "LT","LU","HU","MT","NL","AT","PL",
            "PT","RO","SI","SK","FI","SE"
        ];
        const originVat = EUCountryCodes.includes(originCountry.code) ? 0 : originCountry.vat;
        const dutyTax = EUCountryCodes.includes(originCountry.code) ? 0 : originCountry.dutyTax;

        return {
            discountPercent: discountPercent,
            originVat: originVat,
            originCountry: originCountry.code,
            originCurrency: shop.currency,
            securityRate: 1.05,
            deliveryToKorvinFees: 30,
            dutyTax: dutyTax,
            entrupyFees: 15,
            transactionTax: 0.029,
            operatingFees: 5,
            averageVat: 1.22,
            margin: {
                retail: [
                    [1000, 1.5],
                    [null, 1.4]
                ],
                wholesale: [
                    [null, 1.1]
                ],
            }
        };
    }
}

module.exports = PriceManagerHelper;
