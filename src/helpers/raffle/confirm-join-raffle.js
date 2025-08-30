const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

// подтверждение участия в розыгрыше
async function confirmJoinRaffle(state) {

    state.callTimeoutLimit(64800000, 'new raffle_offer', 3);

    if (!state.timeoutIsEnd('new raffle_offer')) {
        state.default();
        return await bot.sendMessage(
            state.chatId,
            `ℹ️ *Достигнут лимит на 3 участия в сутки*`.format(),
            state.options
        );
    }

    const thisOffer = await db.find('raffles', [[{ field: "id", exacly: state.data.raffleId}]], true);

    // создаём заявку на участие в розыгрыше
    const raffleOfferId = await db.insert('raffle_offers', {
        title: thisOffer.title,
        user_telegram_id: state.chatId,
        raffle_id: state.data.raffleId,
        fullname: state.data.fullname,
        phone: state.data.phone,
        to_pay: state.data.to_pay
    });

    const raffle = await db.find('raffles', [[{field: 'id', exacly: state.data.raffleId}]], true);
    const existUser = await db.find('users', [[{field: 'telegram_id', exacly: state.chatId}]], true);
    const priceClause = Number(state.data.to_pay) ? `${state.data.to_pay} ₽` : "Бесплатно";

    // уведомление администратору
    await bot.sendMessage(
        ADMIN_TELEGRAM_ID,
        `ℹ *Новая заявка на участие в розыгрыше: "${raffle.title}"*/n
        *К оплате:* ${priceClause}/n/n
        *От:* ${escapeMarkdown(state.data.fullname)}/n
        *Контакт:* @${existUser.username}/n
        *Телефон:* ${state.data.phone}/n/n
        *Заявка также будет отображена в "Заказах", где её можно подтвердить или отклонить*
        `.format(),
        createButtons([
            {
                text: 'Подтвердить ✔️',
                data: `AcceptOffer=raffle:${raffleOfferId}`
            },
            {
                text: 'Отказать ✖️',
                data: `DeleteOffer=raffle:${raffleOfferId}`
            }
        ], false)
    );

    state.default();

    // сообщение пользователю
    await bot.sendMessage(
        state.chatId,
        `*✔️ Ваша заявка на участие в розыгрыше отправлена. Ожидайте подтверждения*`,
        state.options
    );
}

module.exports = confirmJoinRaffle;
