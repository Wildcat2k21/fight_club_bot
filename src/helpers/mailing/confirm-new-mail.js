const { getServices } = require('@services');
const { bot, db } = getServices();
const sendMail = require('@mailing/send-mail');
const { updateMailingTimer } = require('@mailing/mailings');

//подтверждение рассылки
async function confirmNewMail(state) {

    //проверка на моментальную
    if (state.data.newMailData.send_type === 'Моментальная') {
        await sendMail(state.data.newMailData);
        state.default();
        return bot.sendMessage(state.chatId, '*Рассылка выполнена ✔️*', state.options);
    }

    let message = '*Рассылка добавлена ✔️*';

    //обновление рассылки
    if (state.data.replaceMailingId) {
        await db.update('mailings', state.data.newMailData, [[{
            field: 'id',
            exacly: state.data.replaceMailingId
        }]]);

        //обновление таймера изменненной рассылки
        updateMailingTimer(state.data.replaceMailingId);
        message = `*Рассылка №${state.data.replaceMailingId} обновлена ✔️*`;
    }
    else {

        //обновление таймера изменненной рассылки
        const newMailingId = await db.insert('mailings', state.data.newMailData);
        updateMailingTimer(newMailingId);
    }

    state.default();
    bot.sendMessage(state.chatId, message, state.options);
}

module.exports = confirmNewMail;