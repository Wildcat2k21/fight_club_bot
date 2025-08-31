const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

async function confirmNewManRaffMember(state){

    const thisRaffle = await db.find('raffles', [[{ field: "id", exacly: state.data.raffleId }]], true);
    const raffleId = state.data.raffleId;

    const maxTicketN = (await db.executeWithReturning(`
        SELECT COALESCE(MAX(ticket_id), 0) as max_ticket 
        FROM raffle_tickets 
        WHERE raffle_id = ${raffleId}
    `))[0];

    const nextTicketId = maxTicketN.max_ticket + 1;

    // возвращает id записи
    await db.insert('raffle_tickets', {
        ticket_id: nextTicketId,
        raffle_id: raffleId,
        title: thisRaffle.title,
        accepted: 1,
        fullname: state.data.fullname,
        phone: state.data.phone,
        to_pay: thisRaffle.price
    });
    
    state.default();
    
    return bot.sendMessage(state.chatId, `Билет успешно добавлен ✔️ \n\nНомер билета: ${nextTicketId}`, createButtons([{
        text: "На главную 🔙",
        data: "main menu"
    },
    {
        text: "Добавить еще ➕",
        data: `addManualRaffleMember=${raffleId}`
    }]));
}

module.exports = confirmNewManRaffMember;