const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);

//управление скидками
async function giftMenageOptions(state) {

    const invtDisBtns = createButtons([{
        text: 'Изменить',
        data: 'edit inv_discount'
    }]);

    await bot.sendMessage(state.chatId, `💯 *За приглашение ${config.invite_discount}%, 
    приглашенному: ${config.for_invited_discount}%*`.format(), invtDisBtns);

    //получение данных
    const discounts = await db.find('discounts');

    if (!discounts.length) {
        await bot.sendMessage(state.chatId, '*Другие скидки отсутствуют* ✊', { parse_mode: 'Markdown' });
    }

    for (let discount of discounts) {
        //опции
        const buttons = createButtons([{
            text: 'Пересоздать 🔁',
            data: `EditDiscount=${discount.id}`
        }, {
            text: 'Удалить ✖️',
            data: `DeleteDiscount=${discount.id}`
        }]);

        await bot.sendMessage(state.chatId, `
            *№${discount.id} — ${discount.title}*/n/n
            💯 *Скидка:* ${discount.discount}%/n
            ❓ *Категория:* ${discount.category}
        `.format(), buttons);
    }

    //опции
    state.options = createButtons([{
        text: 'Создать скидку ➕',
        data: 'add discount'
    }, {
        text: 'На главную 🔙',
        data: 'main menu'
    }])

    await bot.sendMessage(state.chatId, '*Вы также можете добавить новую скидку 👇*', state.options);
}

module.exports = giftMenageOptions;