const { getServices } = require('@services');
const { bot, db } = getServices();

//удаление события
async function deleteEvent(state, eventId) {

    //проверка существования события
    const existEvent = await db.find('events', [[{ field: 'id', exacly: eventId }]], true);

    if (!existEvent) {
        return await bot.sendMessage(state.chatId, '*Событие не найдено* ✊', { parse_mode: 'Markdown' });
    }

    //удаление из базы данных
    await db.delete('events', [[{
        field: 'id',
        exacly: eventId
    }]]);

    bot.sendMessage(state.chatId, `*Событие №${eventId} удалено ✔️*`, state.options);
}

module.exports = deleteEvent;