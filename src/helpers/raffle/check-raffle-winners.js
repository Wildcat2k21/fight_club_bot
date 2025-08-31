const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');

async function checkRaffleWinners(state, msgData){
    const raffleId = msgData.split('=')[1];

    const raffle_winners = await db.find('raffle_winners', [[{ field: 'raffle_id', exacly: raffleId}, {
        field: 'raffle_ticket_id', isNull: false
    }]]);

    if(!raffle_winners.length) {
        return bot.sendMessage(state.chatId, "Победители пока не назначены ✖️");
    }

    for(let winner of raffle_winners) {

        const winnerTicket = await db.find('raffle_tickets', [[{
            field: 'raffle_id', exacly: winner.raffle_id
        },
        {
            field: 'ticket_id', exacly: winner.raffle_ticket_id
        }]], true);

        const winnerTelegram = await db.find('users', [[{ field: 'telegram_id', exacly: winnerTicket.user_telegram_id }]], true);

        await bot.sendMessage(state.chatId, `
            *Билет №${winnerTicket.ticket_id}*/n/n
            *🏆 Призовое место:* ${winner.position}/n
            *👤 ФИО:* ${winnerTicket.fullname}/n
            *📞 Телефон:* ${winnerTicket.phone}
            ${
                winnerTelegram ?
                    `/n*💬 Контакт:* @${escapeMarkdown(winnerTelegram.username)}` :
                    '/n/n*❗️ Участник указан вручную, билет не может быть проверен через QR код, связь с участником возможна только по телефону.*'
            }
        `.format(), { parse_mode: 'Markdown' });
    }

    return bot.sendMessage(state.chatId, "✔️ Это все победители данного розыгрыша",
        createButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

module.exports = checkRaffleWinners;