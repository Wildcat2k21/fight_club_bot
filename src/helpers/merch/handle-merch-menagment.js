const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const validateMarkdown = require('@utils/validate-markdown');

//обработка заполнения мерча
function handleMerchMenagment(state, message) {

    if (message && validateMarkdown(message)) {
        const warnMessage = `🔁 *${validateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    //указание названия события
    if (state.stepName === 'name') {

        //проверка ввода
        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название для товара', state.options);
        }

        //установка названия события
        state.data.newMerchData = {
            title: message
        }

        //устанавливает функцию - обработчик
        state._actionHandleFunction = handleMerchMenagment;

        //установка следующего шага
        state.recordStep('price', '💸 Введите цену за покупку в рублях ₽', createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]))

        return state.executeLastStep();
    }

    //указание даты проведения
    if (state.stepName === 'price') {

        //проверка ввода даты
        if (!message || isNaN(message) || Number(message) < 0) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите цену за покупку в рублях ₽', state.options);
        }

        //установка даты проведения
        state.data.newMerchData.price = message;

        //установка следующего шага
        state.recordStep('content', '🤳 Введите пост о товаре', state.options);
        return state.executeLastStep();
    }

    //указание поста события
    if (state.stepName === 'content') {

        //проверка ввода
        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите пост о товаре', state.options);
        }

        //установка даты проведения
        state.data.newMerchData.content = message;

        const priceClause = Number(state.data.newMerchData.price) ? `${state.data.newMerchData.price} ₽` : "Бесплатно";

        //финальные кнопки управления
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Подвердить ✔️',
            data: 'confirm new merch'
        }]);

        //установка следующего шага
        state.recordStep('confirm new merch', `
            *${state.data.newMerchData.title}*/n
            *Цена:* ${priceClause}/n/n
            ${state.data.newMerchData.content}
        `.format(), buttons);

        //выполнение шага
        return state.executeLastStep();
    }
}

module.exports = handleMerchMenagment;