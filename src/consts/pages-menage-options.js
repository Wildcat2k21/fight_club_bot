const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);

//управление страницами
async function pagesMenageOptions(state) {

    //страница приветственного сообщения
    await bot.sendMessage(state.chatId, `*Страница* "Приветственное сообщение" 👋/n/n${config.start_message}`.format(), createButtons([{
        text: 'Изменить ✍️',
        data: 'edit start_message'
    }]));

    //страница о нас
    await bot.sendMessage(state.chatId, `*Страница* "О нас" 🤝/n/n${config.about_us}`.format(), createButtons([{
        text: 'Изменить ✍️',
        data: 'edit about_us'
    }]));

    //страница приветственного сообщения
    await bot.sendMessage(state.chatId, `*Страница* "Оплата" 🫰/n/n${config.payment_page}`.format(), createButtons([{
        text: 'Изменить ✍️',
        data: 'edit payment_page'
    }]));

    //опции возврата
    state.options = createButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }])

    //сообщение возврата
    await bot.sendMessage(state.chatId, `
        ℹ Страница *"Приветственное сообщение"* появляется при запуске бота у новых пользователей. Интересное содержание может вызвать желание у потенциальных пользователей сделать заказ./n/n
        ℹ Страница *"О нас"* содержит информацию о проекте, часто дополняется полезными ссылками (обратная связь, сотрудничество и т.д)./n/n
        ℹ Страница *"Оплата"* содержит информацию о способах оплаты и способах доставки./n/n
    `.format(), state.options);
}

module.exports = pagesMenageOptions;