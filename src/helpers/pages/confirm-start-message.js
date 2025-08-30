const { getServices } = require('@services');
const { bot } = getServices();
const fs = require('fs/promises');
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);

//подтверждение приветсвенного сообщения
async function confirmStartMessage(state) {
    //обновление приветсвенного сообщения
    config.start_message = state.data.newStartMessage.content;

    //обновление config.json
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

    state.default();
    bot.sendMessage(state.chatId, `*Приветсвенное сообщение обновлено ✔️*`, state.options);
}

module.exports = confirmStartMessage;