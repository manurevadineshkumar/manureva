const assert = require("assert");
const { describe } = require('mocha');
const ShopifyRichTextService = require("../../app/business-services/shop/shopify/helper/ShopifyRichText.helper");

describe("ShopifyRichTextService", () => {

    describe("createText", () => {
        it("should return a text object", () => {
            const text = ShopifyRichTextService.createText("test", true, false);
            assert.deepStrictEqual(text, {
                type: "text",
                value: "test",
                bold: true,
                italic: false
            });
        });
    });

    describe("createParagraph", () => {
        it("should return a paragraph object", () => {
            const paragraph = ShopifyRichTextService.createParagraph([
                ShopifyRichTextService.createText("test", true, false),
                ShopifyRichTextService.createText("test2", false, false)
            ]);
            assert.deepStrictEqual(paragraph, {
                type: "paragraph",
                children: [
                    {
                        type: "text",
                        value: "test",
                        bold: true,
                        italic: false
                    },
                    {
                        type: "text",
                        value: "test2",
                        bold: false,
                        italic: false
                    }
                ]
            });
        });
    });

    describe("root", () => {
        it("should return a root object", () => {
            const root = ShopifyRichTextService.root([
                ShopifyRichTextService.createParagraph([
                    ShopifyRichTextService.createText("test", true, false),
                    ShopifyRichTextService.createText("test2", false, false)
                ])
            ]);
            assert.deepStrictEqual(root, {
                type: "root",
                children: [
                    {
                        type: "paragraph",
                        children: [
                            {
                                type: "text",
                                value: "test",
                                bold: true,
                                italic: false
                            },
                            {
                                type: "text",
                                value: "test2",
                                bold: false,
                                italic: false
                            }
                        ]
                    }
                ]
            });
        });
    });



});