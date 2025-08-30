const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

//выбор мероприятия для участия
async function selectEventToJoin(state, eventId) {

    //проверка на участие или подание заявки
    const existOffer = await db.find('event_offers', [[{
        field: 'user_telegram_id',
        exacly: state.chatId
    }, {
        field: 'event_id',
        exacly: eventId
    }]], true);

    if (existOffer) {
        state.default();
        return await bot.sendMessage(state.chatId, '*ℹ️ Вы уже участвуете в этом мероприятии*', state.options);
    }

    state.action = 'join event';
    state.data.id = eventId;

    const buttons = createButtons([{
        text: 'Отменить ✖️',
        data: 'main menu'
    }])

    state.recordStep('fullname', 'ℹ Введите вашу фамилию, имя и отчество (при наличии)', buttons);
    return state.executeLastStep();
}

module.exports = selectEventToJoin;