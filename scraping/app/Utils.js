class Utils {
    static escapeHTML(str) {
        const sequences = {
            "&": "&amp;",
            "\"": "&quot;",
            "'": "&apos;",
            "<": "&lt;",
            ">": "&gt;"
        };

        Object.entries(sequences).forEach(
            ([c, seq]) => str = str.replaceAll(c, seq)
        );

        return str;
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
            ).join("");
    }

    static querify(obj) {
        return Object.entries(obj)
            .map(pair => pair.map(encodeURIComponent).join("="))
            .join("&");
    }

    static unquerify(str) {
        return Object.fromEntries(
            str
                .split("&")
                .map(el => el.split("=").map(decodeURIComponent))
        );
    }

    static parseJSON(str) {
        const type = typeof str;

        if (str === null || str === undefined)
            return null;
        if (type == "string")
            return JSON.parse(str);
        if (type == "object")
            return str;

        throw Error("invalid entity passed to parseStringJSON(): " + str);
    }

    static buildObjByKey(entries, key = "id") {
        return entries
            ? Object.fromEntries(entries.map(data => {
                const val = data[key];

                delete data[key];

                return [val, data];
            }))
            : {};
    }
}

module.exports = Utils;
