export default class StringUtils {

    static capitalizeWords(inputString) {
        const words = inputString.split(" ");

        const capitalizedWords = words.map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });

        const resultString = capitalizedWords.join(" ");

        return resultString;
    }

}
