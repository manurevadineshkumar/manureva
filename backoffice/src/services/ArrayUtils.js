export default class ArrayUtils {
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
}
