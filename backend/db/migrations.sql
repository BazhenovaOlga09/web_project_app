CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(150)        NOT NULL UNIQUE,
    password    VARCHAR(255)        NOT NULL, 
    role        VARCHAR(20)         NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'teacher', 'admin')),
    initials    VARCHAR(5)          NOT NULL,
    color       VARCHAR(30)         NOT NULL DEFAULT '#7c6ef7',
    
    class_label VARCHAR(10),                       
    
    subject     VARCHAR(100),
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT                NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ         NOT NULL,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);


CREATE TABLE IF NOT EXISTS groups (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    description TEXT                DEFAULT '',
    icon        VARCHAR(10)         NOT NULL DEFAULT '💡',
    color       VARCHAR(50)         NOT NULL DEFAULT 'rgba(124,110,247,0.15)',
    creator_id  INTEGER             REFERENCES users(id) ON DELETE SET NULL,
    members_count INTEGER           NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS group_members (
    group_id    INTEGER             NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id     INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);


CREATE TABLE IF NOT EXISTS posts (
    id          SERIAL PRIMARY KEY,
    author_id   INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id    INTEGER             REFERENCES groups(id) ON DELETE SET NULL,
    text        TEXT                NOT NULL,
    likes_count INTEGER             NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author   ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_group    ON posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_created  ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
    post_id     INTEGER             NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);


CREATE TABLE IF NOT EXISTS comments (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER             NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id   INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text        TEXT                NOT NULL,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);


CREATE TABLE IF NOT EXISTS events (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200)        NOT NULL,
    description TEXT                DEFAULT '',
    event_date  DATE                NOT NULL,
    location    VARCHAR(200)        DEFAULT '',
    group_id    INTEGER             REFERENCES groups(id) ON DELETE SET NULL,
    color       VARCHAR(20)         NOT NULL DEFAULT 'purple',
    creator_id  INTEGER             REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS event_attendees (
    event_id    INTEGER             NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);


CREATE TABLE IF NOT EXISTS messages (
    id          SERIAL PRIMARY KEY,
    sender_id   INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text        TEXT                NOT NULL,
    is_read     BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv     ON messages(
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at DESC
);


CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


INSERT INTO users (name, email, password, role, initials, color, class_label)
SELECT 'Артём Козлов', 'artem@lycea.ru',
       '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdthXZFSxsMFTHbzfhpVFbhZvNS', 
       'student', 'АК', '#7c6ef7', '10А'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'artem@lycea.ru');

INSERT INTO users (name, email, password, role, initials, color, subject)
SELECT 'Мария Смирнова', 'maria@lycea.ru',
       '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdthXZFSxsMFTHbzfhpVFbhZvNS',
       'teacher', 'МС', '#f7a86e', 'Информатика'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'maria@lycea.ru');

INSERT INTO groups (name, description, icon, color, creator_id)
SELECT 'Робототехника',
       'Создаём роботов, участвуем в соревнованиях, изучаем Arduino и Python.',
       '🤖', 'rgba(124,110,247,0.15)',
       (SELECT id FROM users WHERE email = 'artem@lycea.ru' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Робототехника');

INSERT INTO groups (name, description, icon, color, creator_id)
SELECT 'Шахматный клуб',
       'Тренировки, турниры, разбор партий. Все уровни подготовки.',
       '♟️', 'rgba(247,168,110,0.15)',
       (SELECT id FROM users WHERE email = 'artem@lycea.ru' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Шахматный клуб');