const path = require('node:path');

const INIT_SQL_FILE = path.join(__dirname, '../../', 'sqlite/init.sql');
const DB_FILE = path.join(__dirname, '../../', 'sqlite/app.db');
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');
const LOG_FILE = path.join(__dirname, '../../logs.txt');

module.exports = {
    INIT_SQL_FILE,
    DB_FILE,
    CONFIG_FILE,
    LOG_FILE
};