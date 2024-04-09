/**
 * Utility class for date operations.
 */
class DateUtils {

    /**
     * Checks if two dates are the same day.
     *
     * @param {Date} day1 - The first date.
     * @param {Date} day2 - The second date.
     * @returns {boolean} Returns true if the dates are the same day, otherwise false.
     */
    static sameDay(day1, day2) {
        return day1.getFullYear() === day2.getFullYear() &&
            day1.getMonth() === day2.getMonth() &&
            day1.getDate() === day2.getDate();
    }
}

module.exports = DateUtils;
