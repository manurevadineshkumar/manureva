class ObjectUtils {
    /**
     * Renames the keys of an object based on the provided mapping.
     * @param {Object} obj - The object whose keys are to be renamed.
     * @param {Object} newKeys - The mapping of old keys to new keys.
     * @returns {Object} - The object with renamed keys.
     */
    static renameKeys(obj, newKeys) {
        const entries = Object.keys(obj).map(key => {
            const newKey = newKeys[key] || key;

            return {[newKey]: obj[key]};
        });

        return Object.assign({}, ...entries);
    }

    /**
     * Checks if an object is empty.
     * @param {Object} obj - The object to check.
     * @returns {boolean} - Returns true if the object is empty, otherwise returns false.
     */
    static isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }
}

module.exports = ObjectUtils;
