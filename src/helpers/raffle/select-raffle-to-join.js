const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const config = require('@/config');

//выбор мероприятия для участия
async function selectRaffleToJoin(state, message) {
    if(state.stepName === 'fullname'){

        if(!message) {
            return bot.sendMessage(state.chatId, '🔁 Введите вашу фамилию, имя и отчество (при наличии)', state.options);
        }

        state.data.fullname = message;
        state._actionHandleFunction = selectRaffleToJoin;

        //финальные кнопки управления
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]);

        state.recordStep('phone', 'ℹ Введите номер телефона (Для контакта с вами)', buttons);
        return state.executeLastStep();
    }
    else{
        if(!message) {
            return bot.sendMessage(state.chatId, '🔁 Введите номер телефона (Для контакта с вами)', state.options);
        }

        state.data.phone = Number(message.replace('\s', ''));

        //управление
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Отправить заявку ✔️',
            data: 'confirm join_raffle'
        }]);

        // получаем сам розыгрыш
        const raffle = await db.find('raffles', [[{
            field: 'id',
            exacly: state.data.raffleId
        }]], true);

        state.data.to_pay = raffle.price;
        const priceClause = Number(raffle.price) ? `${raffle.price} ₽` : "Бесплатно 🎁";

        state.recordStep('raffle offer_preview', `
            🎯 *Розыгрыш:* ${raffle.title}/n
            ✊ *К оплате:* ${priceClause}/n/n
            *От:* ${state.data.fullname}/n
            *Телефон:* ${state.data.phone}/n/n
            ${config.payment_page}
        `.format(), buttons);

        return state.executeLastStep();
    }
}

module.exports = selectRaffleToJoin;