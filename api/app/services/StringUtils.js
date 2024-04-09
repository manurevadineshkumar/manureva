class StringUtils {
    /**
     * Converts a camelCase string to a string with words separated by spaces.
     * Returns the input if the input is falsy.
     *
     * @param {string} str
     * @returns {string}
     * @example "camelCaseToWords" -> "Camel Case To Words"
     */
    static camelCaseToWords(str) {
        if (!str) {
            // return str instead of null to deal with the empty string case
            return str;
        }

        const result = str.replace(/([A-Z])/g, " $1");
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    /**
     * Removes hyphens and underscores from a string and capitalizes the first letter of each word.
     * @param {string} str - The input string.
     * @returns {string} - The titlized string.
     */
    static titlize(str) {
        return str
            .replace(/_/g, " ")
            .replace(/-/g, " ")
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }
}

module.exports = StringUtils;
