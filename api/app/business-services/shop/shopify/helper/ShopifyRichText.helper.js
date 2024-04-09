class ShopifyRichTextHelper {
    /**
     * Creates a rich text fragment of type text
     *
     * @param {string} value
     * @param {boolean} bold
     * @param {boolean} italic
     * @returns {object}
     */
    static createText(value, bold, italic) {
        return {
            type: "text",
            value: value,
            bold: bold,
            italic: italic
        };
    }

    /**
     * Creates a rich text fragment of type paragraph
     *
     * @param {object[]} children
     * @returns {object}
     */
    static createParagraph(children) {
        return {
            type: "paragraph",
            children: children
        };
    }

    /**
     * Generate a rich text object to send to Shopify
     *
     * @param {object[]} children
     * @returns {object}
     */
    static root(children) {
        return {
            type: "root",
            children: children
        };
    }
}

module.exports = ShopifyRichTextHelper;
