const ProductService = require("../business-services/product/Product.service");
const CurrencyConverter = require("../data-access/exchangeRate/CurrencyConverter");
const PriceManagerHelper = require("./PriceManager.helper");
const Utils = require("./Utils");

// eslint-disable-next-line no-unused-vars
const Product = require("../models/Product");
// eslint-disable-next-line no-unused-vars
const Shop = require("../models/shops/Shop");

/**
 * Vendor parameters for price management.
 * @typedef {Object} PricingParams
 * @property {number} discountPercent - The discount percentage.
 * @property {number} originVat - The origin VAT.
 * @property {string} originCountry - The origin country.
 * @property {string} originCurrency - The origin currency.
 * @property {number} securityRate - The security rate.
 * @property {number} deliveryToKorvinFees - The delivery fees to Korvin.
 * @property {number} dutyTax - The duty tax.
 * @property {number} entrupyFees - The Entrupy fees.
 * @property {number} transactionTax - The transaction tax.
 * @property {number} operatingFees - The operating fees.
 * @property {number} averageVat - The average VAT.
 * @property {Object} margin - The margin values.
 * @property {Array<Array<number|null>>} margin.retail - The retail margin values.
 * @property {Array<Array<number|null>>} margin.wholesale - The wholesale margin values.
 */

class PriceManager {
    static CURRENCY_SECURITY_RATE = 1.05;

    /**
     * Represents the VAT (Value Added Tax) percentage for different countries.
     * @type {Object.<string, number>}
     */
    static VAT_PERCENT = {
        "FR": 0,
        "EU": 0,
        "JP": 0.1,
    };

    /**
     * Duty tax percentages for different countries.
     * @type {Object.<string, number>}
     */
    static DUTY_TAX_PERCENT = {
        "FR": 0,
        "EU": 0,
        "JP": 0.035,
    };

    /**
     * Discount percentage for different products.
     * @type {Object.<string, number>}
     */
    static DISCOUNT_PERCENT = {
        "Reclo": 0.1,
        "OpulenceScraper": 0.1,
    };

    static computePriceInformation = {
        "Reclo": {
            dutyTaxes: this.DUTY_TAX_PERCENT["JP"],
            deliveryFees: 30,
            averageVat: 1.22,
            frenchVat: 1.2,
        },
        "OpulenceScraper": {
            dutyTaxes: this.DUTY_TAX_PERCENT["FR"],
            deliveryFees: 30,
            averageVat: 1.2,
            frenchVat: 1.2,
        }
    };

    /**
     * Vendor parameters for price management.
     * @type {Object.<string, PricingParams>}
     */
    static VENDOR_PARAMS = { // TODO extract to a config file
        "Reclo": {
            discountPercent: 0.1,
            originVat: 0.1,
            originCountry: "JP",
            originCurrency: "JPY",
            securityRate: 1.05,
            deliveryToKorvinFees: 30,
            dutyTax: 0.035,
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
        },
        "OpulenceScraper": {
            discountPercent: 0.1,
            originVat: 0,
            originCountry: "FR",
            originCurrency: "EUR",
            securityRate: 1,
            deliveryToKorvinFees: 0,
            dutyTax: 0,
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
        }
    };

    /**
     * @deprecated use PriceManager#computePrices instead
     * Retrieves the prices of a product based on the provided parameters.
     * @param {Object} options - The options object.
     * @param {Product} options.product - The product object.
     * @param {Shop} [options.shop] - The shop name.
     * @param {Date} [options.createdOnShopAt] - The date the product was created on the shop.
     * @returns {Promise<{
     *   purchase_price_cents: number,
     *   purchase_price_cents_discounted: number,
     *   retail_price_cents: number,
     *   retail_price_cents_discounted: number,
     *   wholesale_price_cents: number,
     *   wholesale_price_cents_discounted: number
     * }>} - The prices of the product.
     */
    static async getProductPrices({product, shop, createdOnShopAt}) {
        if (!product) {
            throw new Error("Product is null");
        }

        const countryCode = await ProductService.getCountryCode(product);
        const vatPercent = PriceManagerHelper.getVatPercent(countryCode, PriceManager.VAT_PERCENT);

        const rate = await CurrencyConverter.getCurrencyRateToEur(product.boughtCurrency);
        const effectiveRate = rate * PriceManager.CURRENCY_SECURITY_RATE;

        const {
            boughtPriceWithSupplierDiscount,
            discountedBoughtPriceWithSupplierDiscount
        } = await PriceManagerHelper.computeBoughtPricesWithSupplierDiscount({
            boughtPrice: product.boughtPrice,
            boughtPriceDiscounted: product.boughtPriceDiscounted,
            vendor: product.vendor,
            vendorDiscount: PriceManager.DISCOUNT_PERCENT,
            shop,
            createdOnShopAt: createdOnShopAt,
        });

        const purchasePrice = PriceManagerHelper.computePurchasePrice(boughtPriceWithSupplierDiscount, {
            rate: effectiveRate,
            vat: vatPercent,
        });

        const purchasePriceDiscounted = discountedBoughtPriceWithSupplierDiscount
            ? PriceManagerHelper.computePurchasePrice(discountedBoughtPriceWithSupplierDiscount, {
                rate: effectiveRate,
                vat: vatPercent,
            })
            : null;

        const computePriceInformation = PriceManager.computePriceInformation[product.vendor]
            ?? PriceManager.computePriceInformation["Reclo"];

        const retailPrice = PriceManagerHelper.computeRetailPrice(purchasePrice, computePriceInformation);
        const retailPriceDiscounted = purchasePriceDiscounted
            ? PriceManagerHelper.computeRetailPrice(purchasePriceDiscounted, computePriceInformation)
            : null;

        const wholesalePrice = PriceManagerHelper.computeWholesalePrice(
            purchasePrice, computePriceInformation);
        const wholesalePriceDiscounted = purchasePriceDiscounted
            ? PriceManagerHelper.computeWholesalePrice(purchasePriceDiscounted, computePriceInformation)
            : null;

        return {
            purchase_price_cents: Utils.ceil10(purchasePrice) * 100,
            purchase_price_cents_discounted: purchasePriceDiscounted
                ? Utils.ceil10(purchasePriceDiscounted) * 100
                : null,
            retail_price_cents: Utils.ceil10(retailPrice) * 100,
            retail_price_cents_discounted: retailPriceDiscounted
                ? Utils.ceil10(retailPriceDiscounted) * 100
                : null,
            wholesale_price_cents: Utils.ceil10(wholesalePrice) * 100,
            wholesale_price_cents_discounted: wholesalePriceDiscounted
                ? Utils.ceil10(wholesalePriceDiscounted) * 100
                : null,
        };
    }

    // NEW SYSTEM

    /**
     * Calculates the purchase price and discounted purchase price for a given product.
     * @param {Object} options - The options object.
     * @param {Product} options.product - The product object.
     * @param {PricingParams} options.params - The parameters object.
     */
    static async #getPurchasePrice({product, params}) {
        const originCurrencyToEURCoef = await CurrencyConverter.getCurrencyRateToEur(product.boughtCurrency);

        return {
            purchasePrice: PriceManagerHelper.computePurchasePrice2({
                price: product.boughtPrice,
                discountCoef: 1 - params.discountPercent,
                originCurrencyToEURCoef,
                originCountryVat: params.originVat,
                securityRate: params.securityRate,
            }),
            purchasePriceDiscounted: PriceManagerHelper.computePurchasePrice2({
                price: product.boughtPriceDiscounted,
                discountCoef: 1 - params.discountPercent,
                originCurrencyToEURCoef,
                originCountryVat: params.originVat,
                securityRate: params.securityRate,
            }),
        };
    }

    static #getWholesalePrice({purchasePrice, purchasePriceDiscounted, params}) {
        const marginCoef = PriceManagerHelper.getMarginCoef(purchasePrice, params.margin.wholesale);
        const marginCoefDiscounted = PriceManagerHelper.getMarginCoef(purchasePriceDiscounted, params.margin.wholesale);

        const totalCost = PriceManagerHelper.computeTotalCost({
            purchasePrice,
            deliveryToKorvinFees: params.deliveryToKorvinFees,
            dutyTax: params.dutyTax,
            entrupyFees: 0,
            operatingFees: params.operatingFees,
            transactionTax: params.transactionTax,
            marginCoef: marginCoef
        });

        const totalCostDiscounted = PriceManagerHelper.computeTotalCost({
            purchasePrice: purchasePriceDiscounted,
            deliveryToKorvinFees: params.deliveryToKorvinFees,
            dutyTax: params.dutyTax,
            entrupyFees: 0,
            operatingFees: params.operatingFees,
            transactionTax: params.transactionTax,
            marginCoef: marginCoefDiscounted
        });

        return {
            wholesalePrice: totalCost * marginCoef,
            wholesalePriceDiscounted: totalCostDiscounted ? totalCostDiscounted * marginCoefDiscounted : null,
        };
    }

    static #getRetailPrice({purchasePrice, purchasePriceDiscounted, params}) {
        const marginCoef = PriceManagerHelper.getMarginCoef(purchasePrice, params.margin.retail);
        const marginCoefDiscounted = PriceManagerHelper.getMarginCoef(purchasePriceDiscounted, params.margin.retail);

        const totalCost = PriceManagerHelper.computeTotalCost({
            purchasePrice,
            deliveryToKorvinFees: params.deliveryToKorvinFees,
            dutyTax: params.dutyTax,
            entrupyFees: purchasePrice < 250 ? 0 : params.entrupyFees,
            operatingFees: params.operatingFees,
            transactionTax: params.transactionTax,
            marginCoef: marginCoef
        });

        const totalCostDiscounted = PriceManagerHelper.computeTotalCost({
            purchasePrice: purchasePriceDiscounted,
            deliveryToKorvinFees: params.deliveryToKorvinFees,
            dutyTax: params.dutyTax,
            entrupyFees: purchasePriceDiscounted < 250 ? 0 : params.entrupyFees,
            operatingFees: params.operatingFees,
            transactionTax: params.transactionTax,
            marginCoef: marginCoefDiscounted
        });

        return {
            retailPrice: totalCost * marginCoef * params.averageVat,
            retailPriceDiscounted: totalCostDiscounted
                ? totalCostDiscounted * marginCoefDiscounted * params.averageVat
                : null,
        };
    }

    /**
     * Computes the prices for a given product, shop, and creation date on the shop.
     * @param {Object} options - The options for computing prices.
     * @param {Product} options.product - The product object.
     * @param {Shop} [options.shop] - The shop object.
     * @param {Date} [options.createdOnShopAt] - The creation date on the shop.
     * @returns {Promise<{
     *   purchase_price_cents: number,
     *   purchase_price_cents_discounted: number,
     *   retail_price_cents: number,
     *   retail_price_cents_discounted: number,
     *   wholesale_price_cents: number,
     *   wholesale_price_cents_discounted: number
     * }>} - The prices of the product.
     * @throws {Error} - If the product is null or no valid parameters are found.
     */
    static async computePrices({product, shop, createdOnShopAt}) {
        if (!product) {
            throw new Error("[PriceManager#computePrices] Product is null");
        }

        let params = PriceManager.VENDOR_PARAMS[product.vendor];
        if (!params && shop && createdOnShopAt) {
            params = await PriceManagerHelper.constructParamsFromShop(product, shop, createdOnShopAt);
        } else if (!params) {
            throw new Error("[PriceManager#computePrices] No valid parameters found");
        }

        const {purchasePrice, purchasePriceDiscounted} = await PriceManager.#getPurchasePrice({product, params});

        const {wholesalePrice, wholesalePriceDiscounted} = PriceManager.#getWholesalePrice({
            purchasePrice,
            purchasePriceDiscounted,
            params
        });

        const {retailPrice, retailPriceDiscounted} = PriceManager.#getRetailPrice({
            purchasePrice,
            purchasePriceDiscounted,
            params
        });

        return {
            purchase_price_cents: Utils.ceil10(purchasePrice) * 100,
            purchase_price_cents_discounted: purchasePriceDiscounted
                ? Utils.ceil10(purchasePriceDiscounted) * 100
                : null,
            retail_price_cents: Utils.ceil10(retailPrice) * 100,
            retail_price_cents_discounted: retailPriceDiscounted
                ? Utils.ceil10(retailPriceDiscounted) * 100
                : null,
            wholesale_price_cents: Utils.ceil10(wholesalePrice) * 100,
            wholesale_price_cents_discounted: wholesalePriceDiscounted
                ? Utils.ceil10(wholesalePriceDiscounted) * 100
                : null,
        };
    }
}

module.exports = PriceManager;
