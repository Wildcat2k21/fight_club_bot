const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

async function addManualRaffMember(state, message){

    //eslint-disable-next-line no-useless-escape
    if (message && message.match(/[\*\(\)\[\]\`_]/g)) {
        const warnMessage = `🔁 *Ввод содержит запрещенные символы*/n/n
        Повторите ввод используя кириллицу, или латинские буквы`.format();
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if(state.stepName === "fullname"){
        if(!message){
            return await bot.sendMessage(state.chatId, "🔁 Введите ФИО участника", state.options);
        }

        state._actionHandleFunction = addManualRaffMember;

        state.data.fullname = message;

        state.recordStep("phone", "ℹ️ Введите номер телефона участника", createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },
        {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]));

        return state.executeLastStep();
    }

    if(state.stepName === "phone"){
        if(!message){
            return await bot.sendMessage(state.chatId, "🔁 Введите номер телефона участника", state.options);
        }

        const numStr = message.replaceAll(' ', '');

        if(isNaN(numStr) || numStr.length !== 11) {
            return await bot.sendMessage(state.chatId, "🔁 Номер телефона имеет неверный формат.\n\nПример: 8 987 654 32 10", state.options);
        }

        state.data.phone = message;

        state.recordStep("preview", `
            *ФИО: * ${state.data.fullname}/n
            *Телефон: * ${state.data.phone}/n`
            .format(), createButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            },
            {
                text: 'На шаг назад 🔙',
                data: 'step back'
            },
            {
                text: 'Подтвердить ✔️',
                data: 'confirmNewManualRaffMember'
            }]));

        return state.executeLastStep();
    }
}

module.exports = addManualRaffMember;