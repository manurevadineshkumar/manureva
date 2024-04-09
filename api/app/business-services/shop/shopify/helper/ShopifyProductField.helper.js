const StringUtils = require("../../../../services/StringUtils");
const Utils = require("../../../../services/Utils");
const ShopifyRichTextService = require("./ShopifyRichText.helper");

class ShopifyProductFieldHelper {

    /**
     * Creates the body html to send to Shopify as a product description
     *
     * @param {Array<[string, string]>} infos
     * @returns {string} The body html
     */
    static createBodyHtml(infos) {
        let bodyHtml = "";

        bodyHtml += "<p>";
        infos.forEach(info => {
            bodyHtml += `<strong>${Utils.escapeHTML(info[0])}:</strong> ${Utils.escapeHTML(info[1])}<br>`;
        });
        bodyHtml += "</p>";

        return bodyHtml;
    }

    /**
     * Creates a metafield object for colors.
     * @param {Object<string, {name: string}>} colors - The colors object.
     */
    static createMetafieldColors(colors) {
        if (!colors) {
            return null;
        }

        const colorNames = Object
            .values(colors)
            .map(({name}) => name)
            .filter(Boolean);

        return {
            namespace: "custom",
            key: "colors",
            type: "list.single_line_text_field",
            value: JSON.stringify(colorNames)
        };
    }

    /**
     * Creates a metafield object for materials.
     * @param {Object<string, {name: string}>} materials - The materials object.
     */
    static createMetafieldMaterials(materials) {
        if (!materials) {
            return null;
        }

        const materialNames = Object
            .values(materials)
            .map(({name}) => name)
            .filter(Boolean);

        return {
            namespace: "custom",
            key: "materials",
            type: "list.single_line_text_field",
            value: JSON.stringify(materialNames)
        };
    }

    /**
     * Creates a metafield object for grade.
     * @param {string} grade - The grade.
     */
    static createMetafieldGrade(grade) {
        return {
            namespace: "custom",
            key: "grade",
            type: "single_line_text_field",
            value: grade
        };
    }

    /**
     * @param {Object} size
     * @returns
     */
    static createMetafieldSize(size) {
        if (!size) {
            return null;
        }

        const children = Object.entries(size).map(([key, value]) => {
            return ShopifyRichTextService.createParagraph([
                ShopifyRichTextService.createText(key + ": ", true, false),
                ShopifyRichTextService.createText(value, false, false)
            ]);
        });

        const richText = ShopifyRichTextService.root(children);

        return {
            namespace: "custom",
            key: "size",
            type: "rich_text_field",
            value: JSON.stringify(richText)
        };
    }

    /**
     * @param {{ hasSerial: boolean, hasBox: boolean, hasGuaranteeCard: boolean, hasStorageBag: boolean }} extras
     * @returns
     */
    static createMetafieldExtras(extras) {
        if (!extras) {
            return null;
        }

        const children = Object.entries(extras).map(([key, value]) => {
            const keyString = StringUtils.camelCaseToWords(key) + ": ";
            const valueString = value ? "Yes" : "No";

            return ShopifyRichTextService.createParagraph([
                ShopifyRichTextService.createText(keyString, true, false),
                ShopifyRichTextService.createText(valueString, false, false)
            ]);
        });

        const richText = ShopifyRichTextService.root(children);

        return {
            namespace: "custom",
            key: "extras",
            type: "rich_text_field",
            value: JSON.stringify(richText)
        };
    }

}

module.exports = ShopifyProductFieldHelper;
