const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

// подтверждение участия в розыгрыше
async function confirmJoinRaffle(state) {

    // state.callTimeoutLimit(64800000, 'new raffle_ticket', 3);

    // if (!state.timeoutIsEnd('new raffle_ticket')) {
    //     state.default();
    //     return await bot.sendMessage(
    //         state.chatId,
    //         `ℹ️ *Достигнут лимит на 3 участия в сутки*`.format(),
    //         state.options
    //     );
    // }

    const thisRaffle = await db.find('raffles', [[{ field: "id", exacly: state.data.raffleId }]], true);

    const maxTicketN = (await db.executeWithReturning(`
        SELECT COALESCE(MAX(ticket_id), 0) as max_ticket 
        FROM raffle_tickets 
        WHERE raffle_id = ${state.data.raffleId}
    `))[0];

    const nextTicketId = maxTicketN.max_ticket + 1;

    // возвращает id записи
    const raffle_ticket = await db.insert('raffle_tickets', {
        ticket_id: nextTicketId,
        raffle_id: state.data.raffleId,
        title: thisRaffle.title,
        user_telegram_id: state.chatId,
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
        *От:* ${state.data.fullname}/n
        *Контакт:* @${escapeMarkdown(existUser.username)}/n
        *Телефон:* ${state.data.phone}/n/n
        *Заявка также будет отображена в "Заказах", где её можно подтвердить или отклонить*
        `.format(),
        createButtons([
            {
                text: 'Подтвердить ✔️',
                data: `AcceptOffer=raffle:${raffle_ticket}`
            },
            {
                text: 'Отказать ✖️',
                data: `DeleteOffer=raffle:${raffle_ticket}`
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
