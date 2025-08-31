
const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

async function enterRaffleWinner(state, msgData){
    const raffleId = msgData.split('=')[1];
    
    //кнопки отмены            
    const buttons = createButtons([{
        text: 'Отменить ✖️',
        data: 'main menu'
    }])

    const prizes = await db.find('raffle_winners', [[{ field: 'raffle_id', exacly: raffleId}, {
        field: 'raffle_ticket_id', isNull: true
    }]]);

    if(!prizes.length) {
        state.default();
        return bot.sendMessage(state.chatId, "Призовых мест больше нет ✔️");
    }
    
    state.action = "select raffle winner";
    state.data.raffleId = raffleId;

    state.recordStep("winner number", `
        ℹ️ *Осталось призовых мест: ${prizes.length}. Введите номер билета победителя и номер места, к примеру:*/n/n
        13:1 *(Что означает 13 билет занят 1 место)/n/n
        📨 После выбора победителя, будет выполнена автоматическая рассылка всем участникам о выбранном победители*`
        .format(),buttons);

    return state.executeLastStep();
}

module.exports = enterRaffleWinner;