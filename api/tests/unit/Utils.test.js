const assert = require("assert");

const Utils = require("../../app/services/Utils");

describe("Utils", function() {
    describe("Utils#escapeHTML()", function() {
        it("does not modify empty string", function() {
            assert.strictEqual(Utils.escapeHTML(""), "");
        });
        it("does not modify plain text", function() {
            assert.strictEqual(
                Utils.escapeHTML("Hi, this is some plain text."),
                "Hi, this is some plain text."
            );
        });
        it("escapes a simple tag", function() {
            assert.strictEqual(
                Utils.escapeHTML("<p>Guten tag</p>"),
                "&lt;p&gt;Guten tag&lt;/p&gt;"
            );
        });
        it("escapes nested tags", function() {
            assert.strictEqual(
                Utils.escapeHTML("<div><p>Guten tag</p></div>"),
                "&lt;div&gt;&lt;p&gt;Guten tag&lt;/p&gt;&lt;/div&gt;"
            );
        });
        it("escapes tag with quote characters", function() {
            assert.strictEqual(
                Utils.escapeHTML(`<img src="#" alt='My image'>`),
                `&lt;img src=&quot;#&quot; alt=&apos;My image&apos;&gt;`
            );
        });
        it("escapes a full HTML page", function() {
            assert.strictEqual(
                Utils.escapeHTML(`
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>Document</title>
                    </head>
                    <body>
                        <h1>Simple HTML page & content</h1>
                    </body>
                    </html>
                `),
                `
                    &lt;html lang=&quot;en&quot;&gt;
                    &lt;head&gt;
                        &lt;meta charset=&quot;UTF-8&quot;&gt;
                        &lt;title&gt;Document&lt;/title&gt;
                    &lt;/head&gt;
                    &lt;body&gt;
                        &lt;h1&gt;Simple HTML page &amp; content&lt;/h1&gt;
                    &lt;/body&gt;
                    &lt;/html&gt;
                `
            );
        });
    });

    describe("Utils#capitalize()", function() {
        it("does not modify empty string", function() {
            assert.strictEqual(Utils.capitalize(""), "");
        });
        it("capitalizes a leading alpha character", function() {
            assert.strictEqual(Utils.capitalize("node.js"), "Node.js");
        });
        it("does not modify a non-alpha leading character", function() {
            assert.strictEqual(Utils.capitalize("!node.js"), "!node.js");
        });
        it("capitalizes a leading UTF-8 alpha character", function() {
            assert.strictEqual(Utils.capitalize("навальный"), "Навальный");
        });
    });

    describe("Utils#capitalizeAll()", function() {
        it("does not modify empty string", function() {
            assert.strictEqual(Utils.capitalizeAll(""), "");
        });
        it("does not modify non-alpha characters", function() {
            assert.strictEqual(
                Utils.capitalizeAll("0, 1, 2, 3!"),
                "0, 1, 2, 3!"
            );
        });
        it("capitalizes space-separated words", function() {
            assert.strictEqual(
                Utils.capitalizeAll("hello, world!"),
                "Hello, World!"
            );
        });
        it("capitalizes words separated by non-alpha characters", function() {
            assert.strictEqual(
                Utils.capitalizeAll("abra-cadabra (boom!)"),
                "Abra-Cadabra (Boom!)"
            );
        });
        it("capitalizes multiple differently-separated words", function() {
            assert.strictEqual(
                Utils.capitalizeAll(
                    "For *each* operand that names a _file_ of a type other "
                    + "than [directory], `ls` displays its name as well as any "
                    + "requested, associated {information}."
                ),
                "For *Each* Operand That Names A _File_ Of A Type Other "
                + "Than [Directory], `Ls` Displays Its Name As Well As Any "
                + "Requested, Associated {Information}."
            );
        });
    });

    describe("Utils#buildObjByKey()", function() {
        it("generates an empty object from empty array", function() {
            assert.deepStrictEqual(
                Utils.buildObjByKey([]),
                {}
            );
        });
        it("builds object by default `id` key", function() {
            assert.deepStrictEqual(
                Utils.buildObjByKey([
                    {id: 1, name: "a"},
                    {id: 2, name: "b"},
                    {id: 3, name: "c"},
                ]),
                {
                    1: {name: "a"},
                    2: {name: "b"},
                    3: {name: "c"}
                }
            );
        });
        it("builds object by different key", function() {
            assert.deepStrictEqual(
                Utils.buildObjByKey([
                    {id: 1, name: "a"},
                    {id: 2, name: "b"},
                    {id: 3, name: "c"},
                ], "name"),
                {
                    a: {id: 1},
                    b: {id: 2},
                    c: {id: 3}
                }
            );
        });
        it("overrides duplicate keys and skips missing", function() {
            assert.deepStrictEqual(
                Utils.buildObjByKey([
                    {id: 1, name: "a"},
                    {id: 2, name: "b"},
                    {id: 2, name: "c"},
                    {name: "no-id"},
                ]),
                {
                    1: {name: "a"},
                    2: {name: "c"}
                }
            );
        });
    });

    describe("Utils#binSearch()", function() {
        const testArray = (array, comparator) => {
            array.forEach(val => {
                const idx = Utils.binSearch(array, v => comparator(v, val));

                assert.ok(idx !== null, `${array}: ${val}`);
                assert.strictEqual(array[idx], val);
            });
        };

        it("finds the only value", function() {
            assert.strictEqual(Utils.binSearch([5], v => v - 5), 0);
        });
        it("returns null on empty array", function() {
            assert.strictEqual(Utils.binSearch([], v => v), null);
        });
        it("returns null on a missing value", function() {
            assert.strictEqual(
                Utils.binSearch([1, 1, 2, 3, 5, 8, 13, 21, 34], v => v - 6),
                null
            );
        });
        it("finds duplicate values", function() {
            testArray([0, 0, 1, 1, 1, 2, 2, 3, 3, 3], (a, b) => a - b);
        });
        it("finds a value with a fancy comparator", function() {
            testArray(
                ["A", "Aa", "ab", "AB", "Abb", "abc", "Abc", "ABC", "Abd"],
                (a, b) => a.localeCompare(b)
            );
        });
        it("finds values in long arrays", function() {
            testArray(
                [
                    0, 1, 5, 7, 10, 10, 11, 12, 12, 14, 16, 16, 16, 17, 19,
                    20, 20, 21, 23, 24, 24, 27, 27, 28, 28, 28, 28, 28, 29,
                    30, 30, 32, 33, 34, 34, 35, 36, 37, 38, 38, 38, 38, 39,
                    40, 41, 43, 45, 46, 48, 49, 50, 50, 51, 52, 53, 55, 57,
                    58, 60, 60, 61, 61, 61, 63, 64, 66, 67, 69, 70, 72, 73,
                    74, 75, 75, 76, 79, 80, 80, 81, 82, 82, 82, 83, 83, 84,
                    85, 86, 87, 88, 90, 92, 93, 94, 94, 95, 95, 96, 98, 98,
                    99
                ],
                (a, b) => a - b
            );
        });
    });

    describe("Utils#substituteObjVars()", function() {
        it("does not modify empty object", function() {
            assert.deepStrictEqual(
                Utils.substituteObjVars({}),
                {}
            );
        });
        it("does not modify simple text", function() {
            const data = {a: 1, b: "1", c: [1], d: {e: "Some text"}};

            assert.deepStrictEqual(
                Utils.substituteObjVars(JSON.parse(JSON.stringify(data))),
                data
            );
        });
        it("substitutes a top-level variable", function() {
            assert.deepStrictEqual(
                Utils.substituteObjVars({a: "$VARIABLE"}, {VARIABLE: "A!"}),
                {a: "A!"}
            );
        });
        it("substitutes a nested variable", function() {
            assert.deepStrictEqual(
                Utils.substituteObjVars(
                    {a: {b: "$VARIABLE"}},
                    {VARIABLE: "B!"}
                ),
                {a: {b: "B!"}}
            );
        });
        it("sets to null a nonexistent variable", function() {
            assert.deepStrictEqual(
                Utils.substituteObjVars({a: "$VARIABLE"}, {}),
                {a: null}
            );
        });
        it("substitutes multiple variables", function() {
            assert.deepStrictEqual(
                Utils.substituteObjVars(
                    {
                        a: "$VAR_A",
                        b: {
                            c: "$VAR_C",
                            array: [
                                0,
                                {e: "$VAR_E"},
                                "$VAR_ARR"
                            ],
                            f: {
                                g: "Some text",
                                h: "$VAR_H"
                            }
                        }
                    },
                    {
                        VAR_A: "a",
                        VAR_C: "c",
                        VAR_E: "e",
                        VAR_ARR: "arr",
                        VAR_H: "h"
                    }
                ),
                {
                    a: "a",
                    b: {
                        c: "c",
                        array: [
                            0,
                            {e: "e"},
                            "arr"
                        ],
                        f: {
                            g: "Some text",
                            h: "h"
                        }
                    }
                }
            );
        });
    });
});
