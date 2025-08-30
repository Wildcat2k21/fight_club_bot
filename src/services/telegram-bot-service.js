const TelegramBot = require('node-telegram-bot-api');
const TOKEN = process.env.BOT_TOKEN;

function initTelegramBot(){
    return new TelegramBot(TOKEN, { polling: true });
}

module.exports = initTelegramBot;