-- Таблица пользователей
CREATE TABLE users (
    telegram_id INTEGER PRIMARY KEY,
    nickname TEXT NOT NULL,
    username TEXT NOT NULL,
    made_first_offer BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    invited_by INTEGER DEFAULT NULL,
    invite_code TEXT DEFAULT NULL,
    discount INTEGER DEFAULT 0
);

-- Таблица мерчей
CREATE TABLE merch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    content TEXT NOT NULL
);

-- Таблица скидок (не связанных с приглашениями)
CREATE TABLE discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    discount INTEGER NOT NULL CHECK (discount >= 0 AND discount <= 100),
    category TEXT CHECK (category IN ('Все', 'Участие', 'Мерчи'))
);

-- Таблица мероприятий
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    place TEXT NOT NULL,
    event_date INTEGER NOT NULL,
    price INTEGER NOT NULL,
    content TEXT  NOT NULL,
    weight_from TEXT NOT NULL, -- по умолчанию любая категория
    weight_to TEXT NOT NULL -- по умолчанию любая категория
);

-- Таблица заказов
CREATE TABLE merch_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    merch_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    toPay INTEGER NOT NULL,
    accepted BOOLEAN DEFAULT 0,
    recive_key TEXT DEFAULT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (merch_id) REFERENCES merch(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Таблица участников (бойцов)
CREATE TABLE event_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    telegram_id INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    title TEXT NOT NULL,
    toPay INTEGER NOT NULL,
    accepted BOOLEAN DEFAULT 0,
    recive_key TEXT DEFAULT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Таблица рассылки
CREATE TABLE mailings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    send_type TEXT CHECK (send_type IN ('Периодическая', 'Запланированная')) NOT NULL,
    response_time INTEGER DEFAULT NULL,
    repeats INTEGER DEFAULT NULL,
    audience TEXT CHECK (audience IN ('Всем', 'Участникам', 'Всем, кроме участников')) NOT NULL,
    content TEXT NOT NULL
);

-- -- Добавление скидок "Приглашение" и "Приглашенный"
-- INSERT INTO discounts (title, discount, category, content) VALUES
-- ('Приглашение', 50, 'Все', 'Скидка для пользователя, пригласившего нового участника'),
-- ('Приглашенный', 25, 'Все', 'Скидка для нового участника, пришедшего по приглашению')