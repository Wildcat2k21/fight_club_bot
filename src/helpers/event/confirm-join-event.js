const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

//подтверждение участия
async function confirmJoinEvent(state) {

    // state.callTimeoutLimit(64800000, 'new offer', 3);

    // if (!state.timeoutIsEnd('new offer')) {
    //     state.default();
    //     return await bot.sendMessage(state.chatId, `ℹ️ *Достигнут лимит на 3 заказа в сутки*`.format(), state.options);
    // }

    //подтверждение участия
    const eventOfferId = await db.insert('event_offers', {
        user_telegram_id: state.chatId,
        event_id: state.data.id,
        fullname: state.data.newParticipant.fullname,
        title: state.data.title,
        to_pay: state.data.to_pay
    });

    const user = await db.find('users', [[{ field: 'telegram_id', exacly: state.chatId }]], true);

    //сброс скидки
    if (user.discount) {
        await db.update('users', { discount: 0 }, [[{ field: 'telegram_id', exacly: state.chatId }]]);
    }

    const priceClause = Number(state.data.to_pay) ? `${state.data.to_pay} ₽` : "Бесплатно";

    //вывод сообщения администратору
    await bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ *Новая заявка на участие в мероприятии: "${state.data.title}*"/n/n
    *От:* @${escapeMarkdown(state.data.username)}/n
    *К оплате:* ${priceClause}/n/n
    *Заявка также будет отображена в "Заказах", где ее можно подтвердить или отклонить*
    `.format(), createButtons([{
        text: 'Подтвердить ✔️',
        data: `AcceptOffer=event:${eventOfferId}`
    }, {
        text: 'Отказать ✖️',
        data: `DeleteOffer=event:${eventOfferId}`
    }], false));

    state.default();
    //рассылка пользователю
    await bot.sendMessage(state.chatId, `*✔️ Заявка отправлена. Ожидайте подтверждения*`, state.options);
}

module.exports = confirmJoinEvent;