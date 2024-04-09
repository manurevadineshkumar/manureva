const PriceManagerHelper = require('../../../app/services/PriceManager.helper');
const PriceRanges = require('../../../app/models/PriceRanges');

const assert = require("assert");
const { describe } = require('mocha');

describe('PriceManagerHelper', () => {

    describe('getVendorDiscountPercent', () => {
        it('should throw when discount is null', () => {
            assert.throws(() => {
                PriceManagerHelper.getVendorDiscountPercent('vendor', null);
            });
        });

        it('should work when discount is an object of numbers', () => {
            assert(PriceManagerHelper.getVendorDiscountPercent('vendor', {vendor: 0.2}) === 0.2);
        });
    });

    describe('getVatPercent', () => {
        it('should throw when vat is null', () => {
            assert.throws(() => {
                PriceManagerHelper.getVatPercent('FR', null);
            });
        });

        it('should work when vat is an object of numbers', () => {
            assert(PriceManagerHelper.getVatPercent('FR', {FR: 0.2}) === 0.2);
        });
    });

    describe('computePurchasePrice', () => {
        it('should throw when VAT is null', () => {
            assert.throws(() => {
                PriceManagerHelper.computePurchasePrice(100, {rate: 0.2, vat: null});
            });
        });

        it('should return the purchase price', () => {
            assert(PriceManagerHelper.computePurchasePrice(100, {rate: 1.2, vat: 0}) === 120);
        });

        it('should return the purchase price', () => {
            assert.strictEqual(PriceManagerHelper.computePurchasePrice(110, {rate: 1, vat: 0.1}), 110 / 1.1);
        });

        it('should return the purchase price', () => {
            assert(PriceManagerHelper.computePurchasePrice(100, {rate: 1.2, vat: 0.1}) === 100 / 1.1 * 1.2);
        });
    });

    describe('computeRetailPrice', () => {

        const computePriceInformation = {
            dutyTaxes: 0.035,
            deliveryFees: 30,
            averageVat: 1.22,
            frenchVat: 1.2,
        };

        it ('should throw an error when purchasePrice is null', () => {
            assert.throws(() => {
                PriceManagerHelper.computeRetailPrice(null, computePriceInformation);
            });
        });

        it ('should throw an error when purchasePrice is undefined', () => {
            assert.throws(() => {
                PriceManagerHelper.computeRetailPrice(undefined, computePriceInformation);
            });
        });

        it ('should throw an error if at least one of computePriceInformation is null or undefined', () => {
            assert.throws(() => {
                PriceManagerHelper.computeRetailPrice(100, {dutyTaxes: null, deliveryFees: null, averageVat: null, frenchVat: null});
            });
            assert.throws(() => {
                PriceManagerHelper.computeRetailPrice(100, {dutyTaxes: undefined, deliveryFees: undefined, averageVat: undefined, frenchVat: null});
            });
            assert.throws(() => {   
                PriceManagerHelper.computeRetailPrice(100, {dutyTaxes: null, deliveryFees: 30, averageVat: 1.22, frenchVat: null});
            });
            assert.throws(() => {
                PriceManagerHelper.computeRetailPrice(100, {dutyTaxes: 0.035, deliveryFees: undefined, averageVat: 1.22, frenchVat: null});
            });
        });
        
        it ('should throw an error if dutyTaxes or deliveryFees equal 0', () => {
            assert.throws(() => {
                PriceManagerHelper.computeRetailPrice(100, {dutyTaxes: 0.035, deliveryFees: 0, averageVat: 1.22, frenchVat: null});
            });
            assert.throws(() => {
                PriceManagerHelper.computeRetailPrice(100, {dutyTaxes: 0, deliveryFees: 30, averageVat: 1.22, frenchVat: null});
            });
        });

        it ('should throw an error if averageVat is 0', () => {
            assert.throws(() => {
                PriceManagerHelper.computeRetailPrice(100, {dutyTaxes: 0.035, deliveryFees: 30, averageVat: 0, frenchVat: null});
            });
        });

        it ('should compute correct retail price', () => {
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(40, computePriceInformation), ((1.5*40 + 0.042*40 + 30*(1 + 0.035*1.2)) * 1.22));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(100, computePriceInformation), ((1.5*100 + 0.042*100 + 30*(1 + 0.035*1.2)) * 1.22));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(150, computePriceInformation), ((1.5*150 + 0.042*150 + 30*(1 + 0.035*1.2)) * 1.22));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(250, computePriceInformation), ((1.5*250 + 0.042*250 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(800, computePriceInformation), ((1.5*800 + 0.042*800 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(1000, computePriceInformation), ((1.4*1000 + 0.042*1000 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(1200, computePriceInformation), ((1.4*1200 + 0.042*1200 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(1670, computePriceInformation), ((1.4*1670 + 0.042*1670 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(1800, computePriceInformation), ((1.4*1800 + 0.042*1800 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(2040, computePriceInformation), ((1.4*2040 + 0.042*2040 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(2980, computePriceInformation), ((1.4*2980 + 0.042*2980 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(3670, computePriceInformation), ((1.4*3670 + 0.042*3670 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
            assert.strictEqual(PriceManagerHelper.computeRetailPrice(10200, computePriceInformation), ((1.4*10200 + 0.042*10200 + 30*(1 + 0.035*1.2)) * 1.22 + 15));
        
        });
    });

    describe('computeWholesalePrice', () => {
        const computePriceInformation = {
            dutyTaxes: 0.035,
            deliveryFees: 30,
            averageVat: 1.22,
            frenchVat: 1.2,
        };

        it ('should throw an error when purchasePrice is null, undefined or equal to 0', () => {
            assert.throws(() => {
                PriceManagerHelper.computeWholesalePrice(null, computePriceInformation);
            });
            assert.throws(() => {
                PriceManagerHelper.computeWholesalePrice(undefined, computePriceInformation);
            });
            assert.throws(() => {
                PriceManagerHelper.computeWholesalePrice(0, computePriceInformation);
            });
        });

        it ('should throw an error if at least one of computePriceInformation is null or undefined', () => {
            assert.throws(() => {
                PriceManagerHelper.computeWholesalePrice(100, {dutyTaxes: null, deliveryFees: null, averageVat: null, frenchVat: null});
            });
            assert.throws(() => {
                PriceManagerHelper.computeWholesalePrice(100, {dutyTaxes: undefined, deliveryFees: undefined, averageVat: undefined, frenchVat: null});
            });
            assert.throws(() => {
                PriceManagerHelper.computeWholesalePrice(100, {dutyTaxes: null, deliveryFees: 30, averageVat: 1.22, frenchVat: null});
            });
            assert.throws(() => {
                PriceManagerHelper.computeWholesalePrice(100, {dutyTaxes: 0.035, deliveryFees: undefined, averageVat: 1.22, frenchVat: null});
            });
            assert.throws(() => {
                PriceManagerHelper.computeWholesalePrice(100, {dutyTaxes: 0.035, deliveryFees: 30, averageVat: undefined, frenchVat: null});
            });
        });

        it ('should compute correct wholesale price', () => {
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(40, computePriceInformation), (1.21 * 40 + 0.042 * 40 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(100, computePriceInformation), (1.21 * 100 + 0.042 * 100 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(800, computePriceInformation), (1.21 * 800 + 0.042 * 800 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(1000, computePriceInformation), (1.17 * 1000 + 0.042 * 1000 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(1200, computePriceInformation), (1.17 * 1200 + 0.042 * 1200 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(1500, computePriceInformation), (1.15 * 1500 + 0.042 * 1500 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(1800, computePriceInformation), (1.15 * 1800 + 0.042 * 1800 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(2000, computePriceInformation), (1.15 * 2000 + 0.042 * 2000 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(2500, computePriceInformation), (1.13 * 2500 + 0.042 * 2500 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(4000, computePriceInformation), (1.13 * 4000 + 0.042 * 4000 + 30*(1 + 0.035 * 1.2)));
            assert.strictEqual(PriceManagerHelper.computeWholesalePrice(8500, computePriceInformation), (1.13 * 8500 + 0.042 * 8500 + 30*(1 + 0.035 * 1.2)));
        });
    });
});