const { getServices } = require('@services');
const { bot, db } = getServices();
const { updateMailingTimer } = require('@mailing/mailings');

//удаление рассылки
async function deleteMail(state, mailingId) {

    //проверка существование рассылки
    const existMailing = await db.find('mailings', [[{ field: 'id', exacly: mailingId }]], true)

    if (!existMailing) {
        return await bot.sendMessage(state.chatId, '*Рассылка не найдена* ✊', { parse_mode: 'Markdown' });
    }

    //удаление из базы данных
    await db.delete('mailings', [[{
        field: 'id',
        exacly: mailingId
    }]]);

    //обновление таймаутов рассылки
    updateMailingTimer(mailingId);

    //отправка сообщения
    bot.sendMessage(state.chatId, `*Рассылка №${mailingId} удалена* ✔️`, state.options);
}

module.exports = deleteMail;