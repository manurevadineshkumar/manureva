const assert = require("assert");

const PriceRanger = require("../../app/services/PriceRanger");

const SAMPLE_RANGES = [
    {to: 100, percent: 5},
    {to: 500, percent: 0},
    {to: null, percent: 10}
];

const assertRanges = (ranges, price, expected_i) =>
    assert.deepStrictEqual(PriceRanger.findRange(price, ranges), expected_i);

describe("PriceRanger", function () {
    describe("PriceRanger#findRange", function () {
        it("returns the correct range (without thresholds)", function () {
            const ranges = [
                {to: null, percent: 0}
            ];

            assertRanges(ranges, 0, 0);
            assertRanges(ranges, 64, 0);
            assertRanges(ranges, 2048, 0);
        });

        it("returns the correct range (1 threshold)", function () {
            const ranges = [
                {to: 1024, percent: 0},
                {to: null, percent: 0}
            ];

            assertRanges(ranges, 0, 0);
            assertRanges(ranges, 1024, 0);
            assertRanges(ranges, 1025, 1);
            assertRanges(ranges, 2048, 1);
        });

        it("returns the correct range (2 thresholds)", function () {
            const ranges = [
                {to: 512, percent: 0},
                {to: 1024, percent: 0},
                {to: null, percent: 0}
            ];

            assertRanges(ranges, 0, 0);
            assertRanges(ranges, 512, 0);
            assertRanges(ranges, 513, 1);
            assertRanges(ranges, 1024, 1);
            assertRanges(ranges, 1025, 2);
            assertRanges(ranges, 2048, 2);
        });

        it("returns the correct range (many thresholds)", function () {
            const ranges = [
                {to: 1, percent: 0},
                {to: 10, percent: 0},
                {to: 42, percent: 0},
                {to: 123, percent: 0},
                {to: 124, percent: 0},
                {to: 101010, percent: 0},
                {to: null, percent: 0}
            ];

            assertRanges(ranges, 0, 0);
            assertRanges(ranges, 1, 0);
            assertRanges(ranges, 2, 1);
            assertRanges(ranges, 5, 1);
            assertRanges(ranges, 10, 1);
            assertRanges(ranges, 11, 2);
            assertRanges(ranges, 32, 2);
            assertRanges(ranges, 42, 2);
            assertRanges(ranges, 43, 3);
            assertRanges(ranges, 100, 3);
            assertRanges(ranges, 123, 3);
            assertRanges(ranges, 124, 4);
            assertRanges(ranges, 125, 5);
            assertRanges(ranges, 126, 5);
            assertRanges(ranges, 101010, 5);
            assertRanges(ranges, 101011, 6);
            assertRanges(ranges, 1e10, 6);
        });
    });

    describe("PriceRanger#addPercent", function () {
        it("adds percentage to price", function () {
            assert.strictEqual(
                PriceRanger.addPercent(100, SAMPLE_RANGES),
                105
            );
            assert.strictEqual(
                PriceRanger.addPercent(500, SAMPLE_RANGES),
                500
            );
            assert.strictEqual(
                PriceRanger.addPercent(1000, SAMPLE_RANGES),
                1100
            );
        });
    });

    describe("PriceRanger#subtractPercent", function () {
        it("subtracts percentage from price", function () {
            assert.strictEqual(
                PriceRanger.subtractPercent(100, SAMPLE_RANGES),
                95
            );
            assert.strictEqual(
                PriceRanger.subtractPercent(500, SAMPLE_RANGES),
                500
            );
            assert.strictEqual(
                PriceRanger.subtractPercent(1000, SAMPLE_RANGES),
                900
            );
        });
    });
});
