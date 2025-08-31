const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

async function handleRaffleWinner(state, message){
    if(!(/^\d+:\d+$/).test(message)){
        return bot.sendMessage(
            state.chatId,
            `🔁 *Введите номер билета победителя и номер места, к примеру:*/n/n13:1 *(Что означает 13 билет занят 1 место)*`.format(),
            state.options
        );
    }

    const raffleId = state.data.raffleId;
    const [ticketNum, prizeNum] = message.split(':');

    const raffleTicket = await db.find('raffle_tickets', [[{ field: "raffle_id", exacly: raffleId }, {
        field: "ticket_id", exacly: ticketNum
    }]], true);

    const raffleWinners = await db.find('raffle_winners', [[
        {
            field: "raffle_id", exacly: raffleId
        },
        {
            field: "position", exacly: prizeNum
        }
    ]], true);

    if(!raffleWinners || !raffleTicket) {
        return bot.sendMessage(
            state.chatId,
            `🔁 Нет билета №${ticketNum} или призового места №${prizeNum} в этом розыгрыше/n/n*Введите номер билета победителя и номер места*`.format(),
            state.options
        );
    }

    if(raffleWinners.raffle_ticket_id) {
        return bot.sendMessage(
            state.chatId,
            `🔁 Билет №${raffleWinners.raffle_ticket_id} уже занял призовое место №${raffleWinners.position} в этом розыгрыше/n/n*Введите номер билета победителя и номер места*`.format(),
            state.options
        );
    }

    const checkTicketForOtherWin = await db.find('raffle_winners', [[{
        field: 'raffle_ticket_id', exacly: ticketNum
    },
    {
        field: 'raffle_id', exacly: raffleId    
    }]],true);

    // Если билет уже занят место, то отказ
    if(checkTicketForOtherWin) {
        return bot.sendMessage(
            state.chatId,
            `🔁 Билет №${ticketNum} не может занят два призовых места, так как уже занял место №${checkTicketForOtherWin.position} в этом розыгрыше/n/n*Введите номер билета победителя и номер места*`.format(),
            state.options
        );
    }

    await db.update('raffle_winners', { 
        raffle_ticket_id: ticketNum 
    },
    [[{ 
        field: 'id', exacly: raffleWinners.id
    }]]);

    const allTickers = await db.find('raffle_tickets', [[{
        field: 'raffle_id', exacly: raffleId
    }]]);

    for(let ticket of allTickers) {
        // Если нет телеграма, то не оповещаем пользователя
        if(!ticket.user_telegram_id) {
            continue;
        }

        const raffle = await db.find('raffles', [[{
            field: 'id', exacly: raffleId
        }]], true);

        // Безопасная рассылка
        try {
            if(ticket.ticket_id != ticketNum) {
                await bot.sendMessage(
                    ticket.user_telegram_id, `
                        🔥 *В розыгрыше "${raffle.title}" билет №${ticketNum} занял ${prizeNum}-е место!*/n/n
                        🎁 *Разыгранный приз:* ${raffleWinners.prize} !!!
                    `.format(),
                    { parse_mode: 'Markdown' }
                );
            }
            
            if(ticket.ticket_id == ticketNum) {
                await bot.sendMessage(
                    ticket.user_telegram_id, `
                        🔥🔥🔥 *ВЫ ПОБЕДИЛИ В РОЗЫГРЫШЕ "${raffle.title}" ЗАНЯВ ${prizeNum}-е место!*/n/n
                        🎁 *Ваш приз:* ${raffleWinners.prize} !!!/n/n
                        🎟 *Номер вашего билета*: ${ticketNum}/n
                        ℹ️ *Предъявите билет для получения розыгрыша, он находиться во вкладке "Участникам"*
                    `.format(),
                    { parse_mode: 'Markdown' }
                );
            }
        // Игнорируем ошибки отправки
        } catch {
            /** empty */
        }
    }

    await bot.sendMessage(
        state.chatId, "📨 Автоматическая рассылка победителя выполнена"
    );

    state.action = 'default';

    state.recordStep('waing next step',
        `*Билет №${ticketNum} выбран в качестве ${prizeNum}-го места*`.format(),
        createButtons([{
            text: 'На главную 🔙',
            data: 'main menu'
        },{
            text: 'Выбрать еще ➕',
            data: `RaffleWinner=${state.data.raffleId}`
        }]));

    return state.executeLastStep();
}

module.exports = handleRaffleWinner;