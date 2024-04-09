CREATE TABLE user_permissions (
    user_id INT UNSIGNED NOT NULL,
    permission_id SMALLINT UNSIGNED NOT NULL,
    CONSTRAINT user_permissions_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT user_permissions_user_id_permissions_id_pk PRIMARY KEY (user_id, permission_id)
);