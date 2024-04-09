const Storage = require("./Storage");

class ProductImageStorage extends Storage {
    static async getTranslation(jp_word) {
        return Storage.query(
            `SELECT en_word, is_ignored_in_name
                FROM jp_vocabulary
                WHERE ?;`,
            {jp_word}
        ).then(result => result[0] || null);
    }

    static async getModelByWords(jp_words) {
        return Storage.query(
            `SELECT en_word
                FROM jp_vocabulary
                WHERE is_model AND jp_word IN (?);`,
            jp_words
        ).then(result => result[0] || null);
    }

    static async saveTranslation(jp_word, en_word, is_ignored_in_name = true) {
        return Storage.query(
            `INSERT IGNORE
                INTO jp_vocabulary
                SET ?;`,
            {jp_word, en_word, is_ignored_in_name}
        ).then(result => result.affectedRows);
    }
}

module.exports = ProductImageStorage;
