const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

//подтверждение события
async function confirmNewMerch(state) {

    //обновление мероприятия
    if (state.data.replaceMerchId) {
        await db.update('merch', state.data.newMerchData, [[{
            field: 'id',
            exacly: state.data.replaceMerchId
        }]]);

        state.default();
        bot.sendMessage(state.chatId, `*Мерч №${state.data.replaceMerchId} обновлен ✔️*`, state.options);
    }
    //добавление нового события
    else {
        //кнопки  рассылки
        state.data.id = await db.insert('merch', state.data.newMerchData);
        state.recordStep('notify', '*Мерч добавлен ✔️*', createButtons([{
            text: 'Сделать рассылку мерча 📨',
            data: 'notify'
        }, {
            text: 'На главную 🔙',
            data: 'main menu'
        }]));

        //выполнение шага
        state.executeLastStep();
    }
}

module.exports = confirmNewMerch;