class Utils {
    static escapeHTML(str) {
        if (!str)
            return str;

        const sequences = {
            "&": "&amp;",
            "\"": "&quot;",
            "'": "&apos;",
            "<": "&lt;",
            ">": "&gt;"
        };

        Object.entries(sequences).forEach(([c, seq]) =>
            str = str.replaceAll(c, seq)
        );

        return str;
    }

    static removeUndefinedValues(obj) {
        return Object.fromEntries(
            Object.entries(obj).filter(entry => entry[1] !== undefined)
        );
    }

    static capitalize(str) {
        return str.charAt(0).toLocaleUpperCase() + str.substring(1);
    }

    static capitalizeAll(str) {
        return str
            .split("")
            .map(
                (c, i, arr) => !i || (
                    arr[i - 1].toLocaleUpperCase()
                    == arr[i - 1].toLocaleLowerCase()
                )
                    ? c.toLocaleUpperCase()
                    : c
            )
            .join("");
    }

    static buildObjByKey(entries, key = "id") {
        return entries
            ? Object.fromEntries(entries
                .filter(entry => entry[key] !== undefined)
                .map(data => {
                    const val = data[key];

                    delete data[key];

                    return [val, data];
                })
            )
            : {};
    }

    static buildIndex(array, key = "id") {
        return Object.fromEntries(array.map(item => [item[key], item]));
    }

    static substituteObjVars(obj, vars = process.env) {
        Object.keys(obj).forEach(key => {
            if (!obj[key])
                return;

            if (typeof obj[key] === "string" && obj[key][0] == "$")
                obj[key] = vars[obj[key].substring(1)] || null;
            else if (typeof obj[key] == "object")
                Utils.substituteObjVars(obj[key], vars);
        });

        return obj;
    }

    static binSearch(array, comparator) {
        let l = 0;
        let r = array.length - 1;

        while (l <= r) {
            let mid = Math.trunc((l + r) / 2);
            const result = comparator(array[mid], mid);

            if (result === 0)
                return mid;

            if (result > 0)
                r = mid - 1;
            else
                l = mid + 1;
        }

        return null;
    }

    static binSearchValue(array, comparator) {
        const idx = Utils.binSearch(array, comparator);

        return idx === null ? null : array[idx];
    }

    static uniqueArray(array) {
        return [...new Set(array)];
    }

    /**
     * Returns the number to the nearest 10 mutiple
     * @param {number} number
     * @returns {number} The number to the nearest 10 mutiple
     * @example round10(5) // 10
     * @example round10(12) // 10
     */
    static round10(number) {
        const divided = number / 10;
        return Math.round(divided) * 10;
    }

    /**
     * Returns the number to the upper 10 mutiple
     * @param {number} number
     * @returns {number} The number to the upper 10 mutiple
     * @example ceil10(5) // 10
     * @example ceil10(12) // 20
     */
    static ceil10(number) {
        const divided = number / 10;
        return Math.ceil(divided) * 10;
    }

    /**
     * Returns the number to the nearest 10 mutiple
     * @param {number} number
     * @returns {number} The number to the nearest 10 mutiple
     * @example round10(5) // 10
     * @example round10(12) // 10
     */
    static round1000(number) {
        const divided = number / 1000;
        return Math.round(divided) * 1000;
    }

    /**
     * Returns the number to the upper 10 mutiple
     * @param {number} number
     * @returns {number} The number to the upper 10 mutiple
     * @example ceil10(5) // 10
     * @example ceil10(12) // 20
     */
    static ceil1000(number) {
        const divided = number / 1000;
        return Math.ceil(divided) * 1000;
    }

    /**
     * Sleeps for a specified amount of time.
     * @param {number} ms - The number of milliseconds to sleep.
     * @returns {Promise<void>} - A promise that resolves after the specified time.
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = Utils;
