const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

//подтверждение события
async function confirmNewEvent(state) {

    //обновление мероприятия
    if (state.data.replaceEventId) {
        await db.update('events', state.data.newEventData, [[{
            field: 'id',
            exacly: state.data.replaceEventId
        }]]);

        bot.sendMessage(state.chatId, `*Событие №${state.data.replaceEventId} обновлено ✔️*`, state.options);
        state.default();
    }
    //добавление нового события
    else {
        //кнопки  рассылки
        state.data.id = await db.insert('events', state.data.newEventData);
        state.recordStep('notify', '*Событие добавлено ✔️*', createButtons([{
            text: 'Сделать рассылку события 📨',
            data: 'notify'
        }, {
            text: 'На главную 🔙',
            data: 'main menu'
        }]));

        //выполнение шага
        state.executeLastStep();
    }
}

module.exports = confirmNewEvent;