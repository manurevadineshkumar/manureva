CREATE TABLE tags
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    products_group_id INT UNSIGNED NOT NULL,
    name VARCHAR(64) NOT NULL,
    CONSTRAINT tags_products_groups_id_fk
        FOREIGN KEY (products_group_id) REFERENCES products_groups (id)
);

CREATE TRIGGER decrement_tags_count
    AFTER DELETE
    ON tags
    FOR EACH ROW
        UPDATE users
        SET tags_count = tags_count - 1
        WHERE id = (
            SELECT user_id
            FROM products_groups
            WHERE id = OLD.products_group_id
        );

CREATE TRIGGER increment_tags_count
    AFTER INSERT
    ON tags
    FOR EACH ROW
        UPDATE users
        SET tags_count = tags_count + 1
        WHERE id = (
            SELECT user_id
            FROM products_groups
            WHERE id = NEW.products_group_id
        );
