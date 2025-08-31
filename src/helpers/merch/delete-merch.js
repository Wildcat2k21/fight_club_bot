const { getServices } = require('@services');
const { bot, db } = getServices();

//удаление мерча
async function deleteMerch(state, merchId) {

    //проверка на сущуствование мерча
    const existMerch = await db.find('merch', [[{ field: 'id', exacly: merchId }]], true);

    if (!existMerch) {
        return await bot.sendMessage(state.chatId, '*Товар не найден* ✊', { parse_mode: 'Markdown' });
    }

    //удаление из базы данных
    await db.delete('merch', [[{
        field: 'id',
        exacly: merchId
    }]]);

    bot.sendMessage(state.chatId, `*Товар №${merchId} удален ✔️*`, state.options);
}

module.exports = deleteMerch;