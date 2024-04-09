class ArrayUtils {
    /**
     * Checks if an array is in ascending order.
     * Last value must be null
     * @param {Array} arr - The array to be checked.
     * @returns {boolean} - Returns true if the array is in ascending order, false otherwise.
     */
    static isAscending(arr) {
        for(let i = 0; i < arr.length - 2; i++) { // -2 because we ignore the last null value
            if(arr[i] > arr[i + 1]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks if all values in a 2D array are within a specified range.
     * @param {number[][]} array2D - The 2D array to check.
     * @param {number} minVal - The minimum value allowed.
     * @param {number} maxVal - The maximum value allowed.
     * @returns {boolean} - True if all values are within the range, false otherwise.
     */
    static checkValuesInRange(array2D, minVal, maxVal) {
        for(let row of array2D) {
            for(let val of row) {
                if (val < minVal || val > maxVal) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Sorts an array of objects by a specified property.
     * Ascending order.
     * Null values are always last.
     * Does not modify the original array.
     * @param {Array<Object>} arr - The array to be sorted.
     * @param {string} property - The property to sort by.
     * @returns {Array} - The sorted array.
     */
    static orderByProperty(arr, property) {
        return [...arr].sort((a, b) => {
            if (a[property] === null && b[property] === null) {
                return 0;
            } else if (a[property] === null) {
                return 1;
            } else if (b[property] === null) {
                return -1;
            } else {
                return a[property] - b[property];
            }
        });
    }

    /**
     * Checks if two arrays have the same unique elements.
     * @param {Array} arr1 - The first array.
     * @param {Array} arr2 - The second array.
     * @returns {boolean} - True if both arrays have the same unique elements, false otherwise.
     */
    static sameUniqueElements(arr1, arr2) {
        const set1 = new Set(arr1);
        const set2 = new Set(arr2);

        return set1.size === set2.size && [...set1].every((x) => set2.has(x));
    }
}

module.exports = ArrayUtils;
