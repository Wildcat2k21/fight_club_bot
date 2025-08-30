const { getServices } = require('@services');
const { bot } = getServices();
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);
const fs = require('fs/promises');

//подтверждение вкладки "О нас"
async function confirmAboutUs(state) {
    //обновление приветсвенного сообщения
    config.about_us = state.data.newAboutUs.content;

    //обновление config.json
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

    state.default();
    bot.sendMessage(state.chatId, `*Вкладка "О нас" обновлена ✔️*`, state.options);
}

module.exports = confirmAboutUs;