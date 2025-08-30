const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const validateMarkdown = require('@utils/validate-markdown');
const Time = require('@utils/time');

//обработка заполнения нового события
function handleEventMenagement(state, message) {

    if (message && validateMarkdown(message)) {
        const warnMessage = `🔁 *${validateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    //указание названия события
    if (state.stepName === 'name') {

        //проверка ввода
        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название события', state.options);
        }

        //установка названия события
        state.data.newEventData = {
            title: message
        }

        //устанавливает функцию - обработчик
        state._actionHandleFunction = handleEventMenagement;

        //установка следующего шага
        state.recordStep('place', '🔻 Введите место проведения', createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]))

        return state.executeLastStep();
    }

    //указание места проведения
    if (state.stepName === 'place') {

        //проверка ввода
        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите место проведения', state.options);
        }

        //установка места
        state.data.newEventData.place = message;

        //установка следующего шага
        state.recordStep('weight', '🥊 Введите весовую категорию, к примеру:\n\n"от n и до m" (кг) или "Любая"', state.options);
        return state.executeLastStep();
    }

    //указание весовой категории
    if (state.stepName === 'weight') {

        //проверка на ввод от и до
        if (!message || (!message.match(/^От\s\d+\sдо\s\d+$/gi) && message !== "Любая") ) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите весовую категорию, к примеру:\n\n"от n и до m" (кг) или "Любая"', state.options);
        }

        //установка весовой категории
        state.data.newEventData.weight_from = message.match(/\s\d+\s/)?.[0]?.trim() || null;

        //установка весовой категории
        state.data.newEventData.weight_to = message.match(/\s\d+$/)?.[0]?.trim() || null;

        //установка следующего шага
        state.recordStep('date', '📅 Введите планируемую дату события\n\nВ формате: *"чч.мм.гггг чч:мм"*', state.options);
        return state.executeLastStep();
    }

    //указание даты проведения
    if (state.stepName === 'date') {

        //проверка ввода даты
        if (!message || !Time.isValid(message) || new Time().shortUnix() > new Time(message).shortUnix()) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите дату события\n\nВ формате: *"чч.мм.гггг чч:мм"*', state.options);
        }

        //установка даты проведения
        state.data.newEventData.event_date = new Time(message).shortUnix();

        //установка следующего шага
        state.recordStep('price', '💸 Введите цену за участие в рублях ₽', state.options);
        return state.executeLastStep();
    }

    //указание даты проведения
    if (state.stepName === 'price') {

        //проверка ввода даты
        if (!message || isNaN(message) || Number(message) < 0) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите цену за участие в рублях ₽', state.options);
        }

        //установка даты проведения
        state.data.newEventData.price = message;

        //установка следующего шага
        state.recordStep('content', '🤳 Введите пост о мероприятии', state.options);
        return state.executeLastStep();
    }

    //указание поста события
    if (state.stepName === 'content') {

        //проверка ввода
        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите пост о мероприятии', state.options);
        }

        //установка даты проведения
        state.data.newEventData.content = message;

        //финальные кнопки управления
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Подвердить ✔️',
            data: 'confirm new event'
        }]);

        const weightClause = state.data.newEventData.weight_from ?
            `от ${state.data.newEventData.weight_from} до ${state.data.newEventData.weight_to} кг` : "Любая";
        
        const priceClause = Number(state.data.newEventData.price) ? `${state.data.newEventData.price} ₽` : "Бесплатно";

        //установка следующего шага
        state.recordStep('confirm new event', `
            *${state.data.newEventData.title}*/n/n
            📅 *Дата проведения:* ${(new Time(state.data.newEventData.event_date)).toFriendlyString()}/n
            🔻 *Место проведения:* ${state.data.newEventData.place}/n
            🥊 *Весовая категория:* ${weightClause}/n
            🫰 *Цена за участие:* ${priceClause}/n/n
            ${state.data.newEventData.content}
        `.format(), buttons);

        //выполнение шага
        return state.executeLastStep();
    }
}

module.exports = handleEventMenagement;