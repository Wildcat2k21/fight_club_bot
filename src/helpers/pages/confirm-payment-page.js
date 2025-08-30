const { getServices } = require('@services');
const { bot } = getServices();
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);
const fs = require('fs/promises');

//подтверждение вкладки "Оплата"
async function confirmPaymentPage(state) {
    //обновление приветсвенного сообщения
    config.payment_page = state.data.newPaymentPage.content;

    //обновление config.json
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

    state.default();
    bot.sendMessage(state.chatId, `*Страница "Оплата" обновлена ✔️*`, state.options);
}

module.exports = confirmPaymentPage;