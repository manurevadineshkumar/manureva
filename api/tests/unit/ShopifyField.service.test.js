const assert = require("assert");
const { describe } = require('mocha');
const ShopifyFieldService = require("../../app/business-services/shop/shopify/helper/ShopifyProductField.helper");

describe("ShopifyFieldService", () => {

    describe("createBodyHtml", () => {});

    describe("createMetafieldSize", () => {
        it("should return a metafield object", () => {
            const metafield = ShopifyFieldService.createMetafieldSize({"S": "test", "M": "test2"});
            assert.deepStrictEqual(metafield, {
                namespace: "custom",
                key: "size",
                type: "rich_text_field",
                value: JSON.stringify({
                    type: "root",
                    children: [
                        {
                            type: "paragraph",
                            children: [
                                {
                                    type: "text",
                                    value: "S: ",
                                    bold: true,
                                    italic: false
                                },
                                {
                                    type: "text",
                                    value: "test",
                                    bold: false,
                                    italic: false
                                }
                            ]
                        },
                        {
                            type: "paragraph",
                            children: [
                                {
                                    type: "text",
                                    value: "M: ",
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
                })
            });
        });
    });

});