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
    category TEXT CHECK (category IN ('Все', 'Участие', 'Товары'))
);

-- Таблица мероприятий
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    place TEXT NOT NULL,
    event_date INTEGER NOT NULL,
    price INTEGER NOT NULL,
    content TEXT  NOT NULL,
    weight_from INT DEFAULT NULL, -- по умолчанию любая категория
    weight_to INT DEFAULT NULL -- по умолчанию любая категория
);

-- Таблица заказов
CREATE TABLE merch_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_telegram_id INTEGER NOT NULL,
    merch_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    to_pay INTEGER NOT NULL,
    accepted BOOLEAN DEFAULT 0,
    recive_key TEXT DEFAULT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (merch_id) REFERENCES merch(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Таблица участников (бойцов)
CREATE TABLE event_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_telegram_id INTEGER NOT NULL,
    fullname TEXT NOT NULL,
    title TEXT NOT NULL,
    to_pay INTEGER NOT NULL,
    accepted BOOLEAN DEFAULT 0,
    recive_key TEXT DEFAULT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Таблица рассылки
CREATE TABLE mailings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    send_type TEXT CHECK (send_type IN ('Периодическая', 'Запланированная')) NOT NULL,
    response_time INTEGER DEFAULT NULL,
    repeats INTEGER DEFAULT NULL,
    audience TEXT CHECK (audience IN ('Всем', 'Участникам', 'Всем, кроме участников', 'Розыгрыши')) NOT NULL,
    content TEXT NOT NULL
);

-- Таблица розыгрышей
CREATE TABLE raffles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    place TEXT NOT NULL,
    raffle_date INTEGER NOT NULL, -- Unix timestamp
    content TEXT NOT NULL,
    price INTEGER NOT NULL
);

-- Таблица участников розыгрышей (билеты/заявки)
CREATE TABLE raffle_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,   -- автоинкрементный суррогатный ключ
    ticket_id INTEGER NOT NULL,
    raffle_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    fullname TEXT NOT NULL,
    phone TEXT NOT NULL,
    accepted BOOLEAN DEFAULT 0,
    user_telegram_id INTEGER DEFAULT NULL,
    recive_key TEXT DEFAULT NULL,
    to_pay INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    FOREIGN KEY (raffle_id) REFERENCES raffles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    UNIQUE (raffle_id, ticket_id)   -- уникальная пара: розыгрыш + номер билета
);

-- Таблица победителей
CREATE TABLE raffle_winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,   -- автоинкрементный суррогатный ключ
    position INTEGER NOT NULL,
    raffle_id INTEGER NOT NULL,
    prize TEXT NOT NULL,
    raffle_ticket_id INTEGER DEFAULT NULL,

    FOREIGN KEY (raffle_id) REFERENCES raffles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (raffle_id, raffle_ticket_id) 
        REFERENCES raffle_tickets(raffle_id, ticket_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    UNIQUE (raffle_id, position),           -- уникальная позиция внутри конкурса
    UNIQUE (raffle_id, raffle_ticket_id)    -- билет не может занять 2 места в одном конкурсе
);
