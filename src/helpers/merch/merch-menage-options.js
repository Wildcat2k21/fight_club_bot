const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

//просмотр событий
async function merchMenageOptions(state) {
    const allMerch = await db.find('merch');

    //информация об отсутствии событий
    if (!allMerch.length) {
        await bot.sendMessage(state.chatId, '*Товары отсутствуют* ✊', { parse_mode: 'Markdown' });
    }

    //отправка всех событий
    for (let merch of allMerch) {

        //кнопки управления событиями
        const merchControlButtons = createButtons([{
            text: 'Пересоздать 🔁',
            data: 'EditMerch=' + merch.id
        }, {
            text: 'Удалить ✖️',
            data: 'DeleteMerch=' + merch.id
        }]);

        const priceClause = Number(merch.price) ? `${merch.price} ₽` : "Бесплатно";

        await bot.sendMessage(state.chatId, `
            *${merch.title}  —  №${merch.id}*/n
            *Цена:* ${priceClause}/n/n
            ${merch.content}
        `.format(), merchControlButtons);
    }

    //кнопка добавления нового события
    state.options = createButtons([{
        text: 'Создать новый товар ➕',
        data: 'add merch'
    }, {
        text: 'На главную 🔙',
        data: 'main menu'
    }]);

    //добавить новый заказ
    return bot.sendMessage(state.chatId, '*Вы также можете добавить новый товар 👇*', state.options);
}

module.exports = merchMenageOptions;