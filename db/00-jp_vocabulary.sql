CREATE TABLE jp_vocabulary
(
    jp_word VARCHAR(64) NOT NULL
        PRIMARY KEY,
    en_word VARCHAR(64) NULL,
    is_ignored_in_name TINYINT(1) DEFAULT 0 NOT NULL,
    is_model TINYINT(1) DEFAULT 0 NOT NULL,
    CONSTRAINT jp_vocabulary_jp_word_uindex
        UNIQUE (jp_word)
);
