const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const validateMarkdown = require('@utils/validate-markdown');

//создание новой скидки
async function handleDiscountMenagment(state, message) {

    if (message && validateMarkdown(message)) {
        const warnMessage = `🔁 *${validateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    //категория
    if (state.stepName === 'name') {

        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название скидки', state.options);
        }

        //установка данных
        state.data.newDiscountData = {
            title: message
        }

        state._actionHandleFunction = handleDiscountMenagment;

        //установка следующего шага
        state.recordStep('discount', 'ℹ️ Введите значение скидки в процентах', createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]));
        return state.executeLastStep();
    }

    //значение
    if (state.stepName === 'discount') {
        if (isNaN(message) || message < 1 || message > 100) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите значение скидки в процентах', state.options);
        }

        //установка данных
        state.data.newDiscountData.discount = message;

        //установка следующего шага
        state.recordStep('category', 'ℹ️ Введите категорию скидки (Все/Участие/товары)'.format(), state.options);
        return state.executeLastStep();
    }

    //категория
    if (state.stepName === 'category') {

        //проверка ввода
        const allowedValues = [
            'Все',
            'Участие',
            'Товары'
        ];

        if (!allowedValues.includes(message)) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите значение скидки в процентах', state.options);
        }

        //установка данных
        state.data.newDiscountData.category = message;

        //финальные кнопки управления
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Подвердить ✔️',
            data: 'confirm new discount'
        }]);

        //сообщение
        const sendingMess = `
            *${state.data.newDiscountData.title}*/n/n
            💯 *Скидка:* ${state.data.newDiscountData.discount}%/n
            ℹ *Категория:* ${state.data.newDiscountData.category}/n/n
        `.format();

        //установка следующего шага
        state.recordStep('confirm new discount', sendingMess, buttons);

        //выполнение шага
        return state.executeLastStep();
    }
}

module.exports = handleDiscountMenagment;