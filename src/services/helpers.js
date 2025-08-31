const writeInLogFile = require('@utils/logging');
const Database = require('./database-service');

const {
    DB_FILE,
    INIT_SQL_FILE
} = require('../consts/file-paths');

// Функция для подключения базы данных
const newDBconnection = async () => {
    try {
        const db = new Database(DB_FILE);
        await db.connect(DB_FILE, INIT_SQL_FILE);
        return db;
    }
    catch (err) {
        writeInLogFile(err);
        throw err;
    }
}

module.exports = newDBconnection;