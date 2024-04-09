const deepl = require("deepl");

const JpVocabularyStorage = require("../storage/JpVocabularyStorage");
const Utils               = require("./Utils");

class Translator {
    static MAX_TRANSLATIONS_PER_REQUEST = 50;

    static async translate(str, keep_ignored = true) {
        const words = (str || "").split(" ").filter(Boolean);
        const translated = {};
        const unknown = [];

        const translateUnknowns = async () => {
            if (!unknown.length)
                return;

            const {data} = await deepl({
                free_api: true,
                text: unknown,
                source_lang: "JA",
                target_lang: "EN",
                auth_key: process.env.DEEPL_API_KEY
            });

            const translations = data?.translations;

            if (!translations) {
                unknown.length = 0;
                return;
            }

            for (let i = 0; i < unknown.length; i++) {
                const word_jp = unknown[i];
                const word_en = translations[i].text;

                await JpVocabularyStorage.saveTranslation(word_jp, word_en);

                if (keep_ignored)
                    translated[word_jp] = word_en;
            }

            unknown.length = 0;
        };

        for (const word of words) {
            const translation = await JpVocabularyStorage.getTranslation(word);

            if (translation) {
                translated[word] = (
                    translation.is_ignored_in_name && !keep_ignored
                )
                    ? null
                    : translation.en_word;
                continue;
            }

            if (word.match(/^[A-Za-z0-9]+$/)) {
                translated[word] = word;
                continue;
            }

            unknown.push(word);

            if (unknown.length >= Translator.MAX_TRANSLATIONS_PER_REQUEST)
                await translateUnknowns();
        }

        await translateUnknowns();

        return Utils.capitalize(
            words
                .map(word => translated[word])
                .filter(Boolean)
                .join(" ")
        );
    }

    static async translateObj(obj) {
        return Object.fromEntries(
            await Promise.all(Object.entries(obj).map(async ([key, value]) => ([
                (await Translator.translate(key)).toLocaleLowerCase(),
                typeof value == "object" && !Array.isArray(value)
                    ? await Translator.translateObj(value)
                    : value
            ])))
        );
    }

    static async getModelByTitle(title) {
        return Utils.capitalize(
            (
                await JpVocabularyStorage.getModelByWords(
                    (title || "")
                        .split(" ")
                        .filter(Boolean)
                )
            )?.en_word || ""
        );
    }
}

module.exports = Translator;
