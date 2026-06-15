CREATE TABLE IF NOT EXISTS user_list_favorites (
    user_id      TEXT    NOT NULL REFERENCES users(id),
    list_id      TEXT    NOT NULL REFERENCES lists(id),
    favorited_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, list_id)
);
