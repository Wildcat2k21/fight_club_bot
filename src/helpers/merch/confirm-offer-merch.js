const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

//подтверждение заказа
async function confirmOfferMerch(state) {

    state.callTimeoutLimit(64800000, 'new offer', 3);

    if (!state.timeoutIsEnd('new offer')) {
        state.default();
        return await bot.sendMessage(state.chatId, `ℹ️ *Достигнут лимит на 3 заказа в сутки*`.format(), state.options);
    }

    //подтверждение участия
    const merchOfferId = await db.insert('merch_offers', {
        user_telegram_id: state.chatId,
        merch_id: state.data.id,
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
    await bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ *Новая заявка на покупку товара: "${state.data.title}*"/n/n
    *От:* @${escapeMarkdown(state.data.username)}/n
    *К оплате:* ${priceClause}/n/n
    *Заявка также будет отображена в "Заказах", где ее можно подтвердить или отклонить*
    `.format(), createButtons([{
        text: 'Подтвердить ✔️',
        data: `AcceptOffer=merch:${merchOfferId}`
    }, {
        text: 'Отказать ✖️',
        data: `DeleteOffer=merch:${merchOfferId}`
    }], false));

    state.default();
    //рассылка пользователю
    await bot.sendMessage(state.chatId, `*Заказ отправлен. Ожидайте подтверждения* ✔️`, state.options);
}

module.exports = confirmOfferMerch;